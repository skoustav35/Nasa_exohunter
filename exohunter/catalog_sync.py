"""
Adaptive Catalog Sync — NASA Exoplanet Archive TAP Integration

Maintains a local SQLite priority index of NASA TOI candidates and
confirmed planets.  Provides tier-based target selection:
  Tier 1  →  High-confidence NASA TOIs (Confirmed / Candidate)
  Tier 2  →  General pool from NASA ExoFOP

The sync runs on a 24-hour cron schedule orchestrated by server.ts.

CLI usage:
    python -m exohunter.catalog_sync sync       # full NASA TAP sync
    python -m exohunter.catalog_sync get-tic     # get next priority TIC
    python -m exohunter.catalog_sync status      # pool statistics
"""

import json
import os
import sqlite3
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

# ═══════════════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════════════
DB_DIR = Path(__file__).resolve().parent
DB_PATH = DB_DIR / "catalog.db"

NASA_TAP_BASE = "https://exoplanetarchive.ipac.caltech.edu/TAP/sync"

# Priority mapping: lower = higher priority
DISPOSITION_PRIORITY = {
    "CP":  1,   # Confirmed Planet
    "KP":  1,   # Known Planet
    "PC":  2,   # Planet Candidate
    "APC": 2,   # Active Planet Candidate
    "FA":  99,  # False Alarm
    "FP":  99,  # False Positive
    "":    3,   # Unknown / unset
}

MAX_RETRIES = 3
INITIAL_BACKOFF_SEC = 1.0


# ═══════════════════════════════════════════════════════════════
# NASA TAP CLIENT
# ═══════════════════════════════════════════════════════════════
class NASATapClient:
    """HTTP client for NASA Exoplanet Archive TAP (Table Access Protocol)."""

    @staticmethod
    def _query_tap(adql_query: str, fmt: str = "json") -> list:
        """
        Execute an ADQL query against the NASA TAP endpoint.
        Uses exponential backoff for resilience.
        """
        params = urllib.parse.urlencode({
            "query": adql_query,
            "format": fmt,
        })
        url = f"{NASA_TAP_BASE}?{params}"

        backoff = INITIAL_BACKOFF_SEC
        last_error = None

        for attempt in range(1, MAX_RETRIES + 1):
            try:
                req = urllib.request.Request(url, headers={
                    "User-Agent": "SarkarExoHunter/1.0 (catalog_sync)"
                })
                with urllib.request.urlopen(req, timeout=30) as resp:
                    data = json.loads(resp.read().decode("utf-8"))
                    if isinstance(data, list):
                        return data
                    return []
            except (urllib.error.URLError, urllib.error.HTTPError, Exception) as exc:
                last_error = exc
                if attempt < MAX_RETRIES:
                    time.sleep(backoff)
                    backoff *= 2

        raise ConnectionError(
            f"NASA TAP query failed after {MAX_RETRIES} attempts: {last_error}"
        )

    @classmethod
    def fetch_toi_candidates(cls) -> list:
        """Fetch all TOI candidates with disposition and quality flags."""
        adql = (
            "SELECT tid, toi, toipflag, tfopwg_disp, pl_controv_flag, "
            "pl_orbper, pl_trandep "
            "FROM toi "
            "ORDER BY tid"
        )
        return cls._query_tap(adql)

    @classmethod
    def fetch_confirmed_planets(cls) -> list:
        """Fetch confirmed planets from the planetary systems table."""
        adql = (
            "SELECT tic_id, pl_name, disc_facility, pl_orbper, pl_rade, "
            "pl_eqt, sy_vmag "
            "FROM ps "
            "WHERE tic_id IS NOT NULL AND disc_facility LIKE '%TESS%' "
            "ORDER BY tic_id"
        )
        try:
            return cls._query_tap(adql)
        except Exception:
            # The ps table may not have tic_id for all entries; degrade gracefully
            return []


# ═══════════════════════════════════════════════════════════════
# SQLITE CATALOG DATABASE
# ═══════════════════════════════════════════════════════════════
class CatalogDatabase:
    """SQLite manager for the local discovery target pool."""

    def __init__(self, db_path: str = str(DB_PATH)):
        self.db_path = db_path
        self._ensure_schema()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path, timeout=10)
        conn.execute("PRAGMA journal_mode=WAL")  # better concurrent access
        conn.execute("PRAGMA busy_timeout=5000")
        conn.row_factory = sqlite3.Row
        return conn

    def _ensure_schema(self):
        conn = self._connect()
        try:
            conn.executescript("""
                CREATE TABLE IF NOT EXISTS target_pool (
                    tic_id          TEXT PRIMARY KEY,
                    toi_id          TEXT,
                    disposition     TEXT DEFAULT '',
                    priority        INTEGER DEFAULT 3,
                    pl_controv_flag INTEGER DEFAULT 0,
                    orbital_period  REAL,
                    transit_depth   REAL,
                    analysis_status TEXT DEFAULT 'PENDING',
                    last_analyzed_tier TEXT,
                    Official_Radius    REAL,
                    Official_Period    REAL,
                    Discovery_Delta    REAL,
                    synced_at       TIMESTAMP,
                    analyzed_at     TIMESTAMP
                );

                CREATE INDEX IF NOT EXISTS idx_priority_status
                    ON target_pool (priority, analysis_status);

                CREATE INDEX IF NOT EXISTS idx_analysis_status
                    ON target_pool (analysis_status);

                CREATE TABLE IF NOT EXISTS sync_log (
                    id              INTEGER PRIMARY KEY AUTOINCREMENT,
                    sync_time       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    records_added   INTEGER DEFAULT 0,
                    records_updated INTEGER DEFAULT 0,
                    total_records   INTEGER DEFAULT 0,
                    status          TEXT DEFAULT 'OK',
                    error_message   TEXT
                );
            """)

            # Safe ALTER TABLE migration for existing databases
            existing_cols = {
                row[1]
                for row in conn.execute("PRAGMA table_info(target_pool)").fetchall()
            }
            for col, col_type in [
                ("Official_Radius", "REAL"),
                ("Official_Period", "REAL"),
                ("Discovery_Delta", "REAL"),
            ]:
                if col not in existing_cols:
                    conn.execute(f"ALTER TABLE target_pool ADD COLUMN {col} {col_type}")

            conn.commit()
        finally:
            conn.close()

    # ── Batch Upsert ──────────────────────────────────────────
    def upsert_targets(self, records: list[dict]) -> tuple[int, int]:
        """
        Batch upsert TOI records.  Uses INSERT OR REPLACE with
        preservation of analysis_status for already-analyzed targets.
        Returns (added, updated) counts.
        """
        if not records:
            return 0, 0

        conn = self._connect()
        added = 0
        updated = 0

        try:
            # Get existing TIC IDs for diff tracking
            cursor = conn.execute("SELECT tic_id, disposition FROM target_pool")
            existing = {row["tic_id"]: row["disposition"] for row in cursor}

            # Prepare batch
            now = datetime.now(timezone.utc).isoformat()
            rows = []
            for rec in records:
                tic_id = str(rec.get("tid") or rec.get("tic_id") or "").strip()
                if not tic_id:
                    continue

                toi_id = str(rec.get("toi") or "")
                disp_raw = str(rec.get("tfopwg_disp") or rec.get("disposition") or "").strip().upper()
                controv = int(rec.get("pl_controv_flag") or 0)
                period = rec.get("pl_orbper") or rec.get("orbital_period")
                depth = rec.get("pl_trandep") or rec.get("transit_depth")
                priority = DISPOSITION_PRIORITY.get(disp_raw, 3)

                # Controversial flag bumps priority down
                if controv == 1 and priority < 90:
                    priority = max(priority + 5, 8)

                if tic_id in existing:
                    updated += 1
                else:
                    added += 1

                rows.append((
                    tic_id, toi_id, disp_raw, priority, controv,
                    float(period) if period else None,
                    float(depth) if depth else None,
                    now,
                ))

            # Batch insert/update — preserves analysis_status if already set
            conn.executemany("""
                INSERT INTO target_pool
                    (tic_id, toi_id, disposition, priority, pl_controv_flag,
                     orbital_period, transit_depth, synced_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(tic_id) DO UPDATE SET
                    toi_id = excluded.toi_id,
                    disposition = excluded.disposition,
                    priority = excluded.priority,
                    pl_controv_flag = excluded.pl_controv_flag,
                    orbital_period = COALESCE(excluded.orbital_period, target_pool.orbital_period),
                    transit_depth = COALESCE(excluded.transit_depth, target_pool.transit_depth),
                    synced_at = excluded.synced_at
            """, rows)

            conn.commit()
            return added, updated

        finally:
            conn.close()

    # ── Priority TIC Selection ────────────────────────────────
    def get_priority_tic(self) -> dict:
        """
        Tier 1: High-confidence NASA candidates (priority <= 2, PENDING)
        Tier 2: General pool — fall back to any PENDING target
        Returns dict with ticId, tier, disposition, priority
        """
        conn = self._connect()
        try:
            # Tier 1: Confirmed or strong candidates
            row = conn.execute("""
                SELECT tic_id, toi_id, disposition, priority
                FROM target_pool
                WHERE priority <= 2 AND analysis_status = 'PENDING'
                ORDER BY priority ASC, RANDOM()
                LIMIT 1
            """).fetchone()

            if row:
                tic_id = row["tic_id"]
                conn.execute("""
                    UPDATE target_pool
                    SET analysis_status = 'ANALYZING',
                        last_analyzed_tier = 'TIER_1',
                        analyzed_at = ?
                    WHERE tic_id = ?
                """, (datetime.now(timezone.utc).isoformat(), tic_id))
                conn.commit()
                return {
                    "ticId": tic_id,
                    "tier": 1,
                    "toi_id": row["toi_id"],
                    "disposition": row["disposition"],
                    "priority": row["priority"],
                    "source": "catalog_sync",
                }

            # Tier 2: Any remaining unanalyzed target
            row = conn.execute("""
                SELECT tic_id, toi_id, disposition, priority
                FROM target_pool
                WHERE analysis_status = 'PENDING'
                ORDER BY priority ASC, RANDOM()
                LIMIT 1
            """).fetchone()

            if row:
                tic_id = row["tic_id"]
                conn.execute("""
                    UPDATE target_pool
                    SET analysis_status = 'ANALYZING',
                        last_analyzed_tier = 'TIER_2',
                        analyzed_at = ?
                    WHERE tic_id = ?
                """, (datetime.now(timezone.utc).isoformat(), tic_id))
                conn.commit()
                return {
                    "ticId": tic_id,
                    "tier": 2,
                    "toi_id": row["toi_id"],
                    "disposition": row["disposition"],
                    "priority": row["priority"],
                    "source": "catalog_sync",
                }

            # Pool exhausted
            return {"ticId": None, "tier": None, "source": "exhausted"}

        finally:
            conn.close()

    def mark_analyzed(self, tic_id: str, status: str = "ANALYZED"):
        """Mark a TIC ID as analyzed after pipeline completion."""
        conn = self._connect()
        try:
            conn.execute("""
                UPDATE target_pool
                SET analysis_status = ?
                WHERE tic_id = ?
            """, (status, str(tic_id)))
            conn.commit()
        finally:
            conn.close()

    # ── Statistics ────────────────────────────────────────────
    def get_pool_stats(self) -> dict:
        """Return pool statistics for the catalog-status endpoint."""
        conn = self._connect()
        try:
            total = conn.execute("SELECT COUNT(*) FROM target_pool").fetchone()[0]
            pending = conn.execute(
                "SELECT COUNT(*) FROM target_pool WHERE analysis_status = 'PENDING'"
            ).fetchone()[0]
            analyzed = conn.execute(
                "SELECT COUNT(*) FROM target_pool WHERE analysis_status = 'ANALYZED'"
            ).fetchone()[0]
            tier1_pending = conn.execute(
                "SELECT COUNT(*) FROM target_pool WHERE priority <= 2 AND analysis_status = 'PENDING'"
            ).fetchone()[0]
            tier2_pending = pending - tier1_pending

            last_sync = conn.execute(
                "SELECT sync_time, records_added, records_updated, status "
                "FROM sync_log ORDER BY id DESC LIMIT 1"
            ).fetchone()

            return {
                "total_targets": total,
                "pending": pending,
                "analyzed": analyzed,
                "tier1_pending": tier1_pending,
                "tier2_pending": tier2_pending,
                "last_sync": dict(last_sync) if last_sync else None,
            }
        finally:
            conn.close()

    def log_sync(self, added: int, updated: int, total: int,
                 status: str = "OK", error: str = None):
        """Record a sync event."""
        conn = self._connect()
        try:
            conn.execute("""
                INSERT INTO sync_log (records_added, records_updated, total_records, status, error_message)
                VALUES (?, ?, ?, ?, ?)
            """, (added, updated, total, status, error))
            conn.commit()
        finally:
            conn.close()


# ═══════════════════════════════════════════════════════════════
# SYNC ORCHESTRATOR
# ═══════════════════════════════════════════════════════════════
def run_sync() -> dict:
    """
    Full catalog synchronization:
    1. Fetch TOIs from NASA TAP
    2. Upsert into local SQLite
    3. Log results
    """
    db = CatalogDatabase()

    try:
        # Fetch from NASA
        toi_data = NASATapClient.fetch_toi_candidates()

        # Also try confirmed planets for cross-reference
        confirmed = []
        try:
            confirmed = NASATapClient.fetch_confirmed_planets()
        except Exception:
            pass  # Non-critical

        # Merge: TOIs are primary, confirmed planets fill gaps
        merged = list(toi_data)
        existing_tids = {str(r.get("tid", "")) for r in toi_data}
        for cp in confirmed:
            tid = str(cp.get("tic_id", "")).strip()
            if tid and tid not in existing_tids:
                merged.append({
                    "tid": tid,
                    "toi": cp.get("pl_name", ""),
                    "tfopwg_disp": "CP",
                    "pl_controv_flag": 0,
                    "pl_orbper": cp.get("pl_orbper"),
                    "pl_trandep": None,
                })

        added, updated = db.upsert_targets(merged)
        total = len(merged)

        db.log_sync(added, updated, total)

        result = {
            "status": "success",
            "records_fetched": total,
            "records_added": added,
            "records_updated": updated,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        return result

    except Exception as exc:
        error_msg = str(exc)
        db.log_sync(0, 0, 0, status="ERROR", error=error_msg)
        return {
            "status": "error",
            "message": error_msg,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }


# ═══════════════════════════════════════════════════════════════
# CLI ENTRY POINT
# ═══════════════════════════════════════════════════════════════
if __name__ == "__main__":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")

    command = sys.argv[1] if len(sys.argv) > 1 else "status"

    if command == "sync":
        result = run_sync()
        print(json.dumps(result, indent=2))

    elif command == "get-tic":
        db = CatalogDatabase()
        result = db.get_priority_tic()
        print(json.dumps(result))

    elif command == "mark-analyzed":
        if len(sys.argv) < 3:
            print(json.dumps({"error": "Usage: catalog_sync.py mark-analyzed <tic_id> [status]"}))
            sys.exit(1)
        tic_id = sys.argv[2]
        status = sys.argv[3] if len(sys.argv) > 3 else "ANALYZED"
        db = CatalogDatabase()
        db.mark_analyzed(tic_id, status)
        print(json.dumps({"success": True, "ticId": tic_id, "status": status}))

    elif command == "status":
        db = CatalogDatabase()
        stats = db.get_pool_stats()
        print(json.dumps(stats, indent=2, default=str))

    else:
        print(json.dumps({"error": f"Unknown command: {command}. Use sync|get-tic|mark-analyzed|status"}))
        sys.exit(1)
