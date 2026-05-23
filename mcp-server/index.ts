#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, doc, getDoc, updateDoc, deleteDoc, serverTimestamp, getDocs } from "firebase/firestore";
import { getDatabase, ref, set, update, get } from "firebase/database";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";

// ─── Firebase Client Initialization ────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let configPath = path.resolve(__dirname, "../firebase-applet-config.json");
if (!fs.existsSync(configPath)) {
  configPath = path.resolve(__dirname, "../../firebase-applet-config.json");
}
if (!fs.existsSync(configPath)) {
  configPath = path.resolve(process.cwd(), "firebase-applet-config.json");
}
if (!fs.existsSync(configPath)) {
  configPath = path.resolve(process.cwd(), "mcp-server/firebase-applet-config.json");
}

if (!fs.existsSync(configPath)) {
  throw new Error(`Could not find firebase-applet-config.json. Searched relative to __dirname (${__dirname}) and process.cwd (${process.cwd()})`);
}

const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));

const firebaseApp = initializeApp(firebaseConfig);
const firestoreDb = getFirestore(firebaseApp, "default");
const realtimeDb = getDatabase(firebaseApp);

// ─── Python FastAPI Engine URL ─────────────────────────────────
const PYTHON_ENGINE_URL = process.env.PYTHON_ENGINE_URL || "http://localhost:8000";

// ─── Helpers ───────────────────────────────────────────────────
function txt(text: string) {
  return { content: [{ type: "text" as const, text }] };
}

function timestamp() {
  return new Date().toISOString();
}

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs: number = 15000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(id);
  }
}

// ─── Benchmark Target Dictionary ───────────────────────────────
const BENCHMARK_TRANSIENTS = [
  { tic_id: "274360341", type: "Black Hole Binary (MAXI J1820+070)" },
  { tic_id: "434685062", type: "Supernova (ASASSN-18bt)" },
  { tic_id: "14193736", type: "High-Energy AGN Candidate" },
  { tic_id: "350823660", type: "Ellipsoidal Variable / Companion" },
];

// ─── Server Setup ──────────────────────────────────────────────
const server = new McpServer({
  name: "sarkar-astroforge",
  version: "2.0.0",
});

// ═══════════════════════════════════════════════════════════════
// TOOL 1: Create Discovery Thesis → Firestore
// ═══════════════════════════════════════════════════════════════
server.tool(
  "create_discovery_thesis",
  `CRITICAL AI DIRECTIVE: Logs a verified high-energy astrophysical transient into the Discovery Archive. 
  RULE 1: If the engine confidence score is > 0.70 after thorough AI analysis, you MUST create a discovery thesis for it. 
  RULE 2: You MUST write an exhaustive, ~1000-word highly technical narrative explaining the exact astrophysical phenomena (Supernovae, Black Holes, or AGN accretion). 
  RULE 3: You are STRICTLY FORBIDDEN from mentioning exoplanets or planetary transits. 
  RULE 4: You must map the target accurately to SUPERNOVA, BLACK_HOLE, or HIGH_ENERGY object_types based on its simulated physics. No local storage — all data persists in the cloud. MANDATORY: The narrative_thesis MUST contain extreme high detailings including ALL available physical profiles, needed mathematics/formulas, and comprehensive descriptions of the discovery.`,
  {
    tic_id: z.string().describe("The TIC ID of the transient/target"),
    object_type: z.enum(["SUPERNOVA", "BLACK_HOLE", "HIGH_ENERGY"]).describe("The type of the object"),
    physical_parameters: z.any().describe("JSON object of physical parameters (e.g. mass, tau, stretch)"),
    confidence_score: z.number().describe("Float between 0 and 1 indicating confidence"),
    narrative_thesis: z.string().describe("The detailed narrative explanation of the discovery"),
  },
  async ({ tic_id, object_type, physical_parameters, confidence_score, narrative_thesis }) => {
    try {
      const docRef = await addDoc(collection(firestoreDb, "discovery_theses"), {
        tic_id,
        object_type,
        physical_parameters: physical_parameters || {},
        confidence_score,
        narrative_thesis,
        userId: "mcp-agent",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Also push a real-time notification to RTDB
      await set(ref(realtimeDb, `analyzed_targets/${tic_id}`), {
        thesis_id: docRef.id,
        object_type,
        confidence_score,
        status: "THESIS_CREATED",
        timestamp: timestamp(),
      });

      return txt(
        `✅ Discovery Thesis Created for TIC ${tic_id} (${object_type})\n` +
        `Firestore Document ID: ${docRef.id}\n` +
        `Confidence: ${confidence_score}\n` +
        `Stored in: Firestore (discovery_theses) + RTDB (/analyzed_targets/${tic_id})`
      );
    } catch (e: any) {
      return txt(`⚠️ Failed to create thesis: ${e.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════════
// TOOL 2: Edit Discovery Thesis → Firestore
// ═══════════════════════════════════════════════════════════════
server.tool(
  "edit_discovery_thesis",
  `Updates an existing thesis in Firebase Firestore based on new cross-matched data.`,
  {
    thesis_id: z.string().describe("The Firestore document ID of the thesis to update"),
    updated_parameters: z.any().optional().describe("JSON object of updated physical parameters"),
    updated_narrative: z.string().optional().describe("The updated narrative reasoning"),
    object_type: z.enum(["SUPERNOVA", "BLACK_HOLE", "HIGH_ENERGY"]).optional().describe("The correct astrophysical category"),
  },
  async ({ thesis_id, updated_parameters, updated_narrative, object_type }) => {
    try {
      const docRef = doc(firestoreDb, "discovery_theses", thesis_id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return txt(`⚠️ Thesis not found: ${thesis_id}. Cannot update a non-existent document.`);
      }

      const updates: Record<string, any> = {
        updatedAt: serverTimestamp(),
      };
      if (updated_parameters) updates.physical_parameters = updated_parameters;
      if (updated_narrative) updates.narrative_thesis = updated_narrative;
      if (object_type) updates.object_type = object_type;

      await updateDoc(docRef, updates);

      // Update RTDB status for the associated TIC
      const tic_id = docSnap.data()?.tic_id;
      if (tic_id) {
        await update(ref(realtimeDb, `analyzed_targets/${tic_id}`), {
          status: "THESIS_UPDATED",
          thesis_id,
          timestamp: timestamp(),
        });
      }

      return txt(
        `✅ Discovery Thesis Updated\n` +
        `Firestore Document ID: ${thesis_id}\n` +
        `Fields Updated: ${Object.keys(updates).filter(k => k !== "updatedAt").join(", ") || "narrative + parameters"}`
      );
    } catch (e: any) {
      return txt(`⚠️ Failed to edit thesis: ${e.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════════
// TOOL 3: Delete Discovery Thesis → Firestore
// ═══════════════════════════════════════════════════════════════
server.tool(
  "delete_discovery_thesis",
  `Removes a candidate from the active Firestore catalog (used when adversarial engines flag a false positive).`,
  {
    thesis_id: z.string().describe("The Firestore document ID of the thesis to delete"),
    reason: z.string().describe("The reason for deletion"),
  },
  async ({ thesis_id, reason }) => {
    try {
      const docRef = doc(firestoreDb, "discovery_theses", thesis_id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return txt(`⚠️ Thesis not found: ${thesis_id}. Cannot delete a non-existent document.`);
      }

      const tic_id = docSnap.data()?.tic_id;

      await deleteDoc(docRef);

      // Update RTDB to reflect deletion
      if (tic_id) {
        await update(ref(realtimeDb, `analyzed_targets/${tic_id}`), {
          status: "THESIS_DELETED",
          deletion_reason: reason,
          thesis_id,
          timestamp: timestamp(),
        });
      }

      return txt(
        `🗑️ Discovery Thesis Deleted\n` +
        `Firestore Document ID: ${thesis_id}\n` +
        `TIC: ${tic_id || "unknown"}\n` +
        `Reason: ${reason}`
      );
    } catch (e: any) {
      return txt(`⚠️ Failed to delete thesis: ${e.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════════
// TOOL 3.1: Create Rejection Thesis → Firestore
// ═══════════════════════════════════════════════════════════════
server.tool(
  "create_rejection_thesis",
  `Inserts a new False Positive/Rejection record into Firebase Firestore. MANDATORY: The narrative_thesis MUST contain extreme high detailings explaining exactly why it is a false positive, including all available physical profiles, needed mathematics/formulas, and comprehensive descriptions.`,
  {
    tic_id: z.string().describe("The TIC ID of the transient/target"),
    object_type: z.enum(["FALSE_POSITIVE", "INSTRUMENT_ARTIFACT", "ECLIPSING_BINARY", "OTHER"]).describe("The type of rejection"),
    physical_parameters: z.any().describe("JSON object of physical parameters (e.g. why it failed)"),
    confidence_score: z.number().describe("Float between 0 and 1 indicating confidence in rejection"),
    narrative_thesis: z.string().describe("The extremely detailed narrative explanation of the rejection"),
  },
  async ({ tic_id, object_type, physical_parameters, confidence_score, narrative_thesis }) => {
    try {
      const docRef = await addDoc(collection(firestoreDb, "rejection_theses"), {
        tic_id,
        object_type,
        physical_parameters: physical_parameters || {},
        confidence_score,
        narrative_thesis,
        userId: "mcp-agent",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return txt(
        `✅ Rejection Thesis Created for TIC ${tic_id} (${object_type})\n` +
        `Firestore Document ID: ${docRef.id}\n` +
        `Confidence: ${confidence_score}\n` +
        `Stored in: Firestore (rejection_theses)`
      );
    } catch (e: any) {
      return txt(`⚠️ Failed to create rejection thesis: ${e.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════════
// TOOL 3.2: Edit Rejection Thesis → Firestore
// ═══════════════════════════════════════════════════════════════
server.tool(
  "edit_rejection_thesis",
  `Updates an existing rejection thesis in Firebase Firestore.`,
  {
    thesis_id: z.string().describe("The Firestore document ID of the rejection thesis to update"),
    updated_parameters: z.any().describe("JSON object of updated physical parameters"),
    updated_narrative: z.string().describe("The updated detailed narrative reasoning"),
  },
  async ({ thesis_id, updated_parameters, updated_narrative }) => {
    try {
      const docRef = doc(firestoreDb, "rejection_theses", thesis_id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return txt(`⚠️ Rejection Thesis not found: ${thesis_id}. Cannot update a non-existent document.`);
      }

      const updates: Record<string, any> = { updatedAt: serverTimestamp() };
      if (updated_parameters) updates.physical_parameters = updated_parameters;
      if (updated_narrative) updates.narrative_thesis = updated_narrative;

      await updateDoc(docRef, updates);

      return txt(
        `✅ Rejection Thesis Updated\n` +
        `Firestore Document ID: ${thesis_id}\n`
      );
    } catch (e: any) {
      return txt(`⚠️ Failed to edit rejection thesis: ${e.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════════
// TOOL 3.3: Delete Rejection Thesis → Firestore
// ═══════════════════════════════════════════════════════════════
server.tool(
  "delete_rejection_thesis",
  `Removes a rejection record from the False Positive Archive.`,
  {
    thesis_id: z.string().describe("The Firestore document ID of the rejection thesis to delete"),
    reason: z.string().describe("The reason for deletion"),
  },
  async ({ thesis_id, reason }) => {
    try {
      const docRef = doc(firestoreDb, "rejection_theses", thesis_id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return txt(`⚠️ Rejection Thesis not found: ${thesis_id}. Cannot delete a non-existent document.`);
      }

      await deleteDoc(docRef);

      return txt(
        `🗑️ Rejection Thesis Deleted\n` +
        `Firestore Document ID: ${thesis_id}\n` +
        `Reason: ${reason}`
      );
    } catch (e: any) {
      return txt(`⚠️ Failed to delete rejection thesis: ${e.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════════
// TOOL 4: Get Random Transient Target
// ═══════════════════════════════════════════════════════════════
server.tool(
  "get_random_transient_target",
  `Retrieves a random TIC ID from a hardlocked benchmark dictionary of known Supernovae, Black Holes, and High-Energy AGN targets. Tracks selection in Firebase RTDB.`,
  {},
  async () => {
    const randomTarget = BENCHMARK_TRANSIENTS[Math.floor(Math.random() * BENCHMARK_TRANSIENTS.length)];

    // Log the selection to RTDB for tracking (fire and forget)
    try {
      update(ref(realtimeDb, `analyzed_targets/${randomTarget.tic_id}`), {
        status: "TARGET_SELECTED",
        expected_type: randomTarget.type,
        selected_at: timestamp(),
      }).catch((e: any) => console.error("RTDB tracking write failed:", e.message));
    } catch (e: any) {
      console.error("RTDB tracking write error:", e.message);
    }

    return txt(
      `🎯 Selected Target: TIC ${randomTarget.tic_id}\n` +
      `Expected Class: ${randomTarget.type}\n` +
      `Tracked in RTDB: /analyzed_targets/${randomTarget.tic_id}\n\n` +
      `You may now run 'get_light_curve_data' to preview the data, or 'run_ensemble_analysis' to trigger the full classification engine.`
    );
  }
);

// ═══════════════════════════════════════════════════════════════
// TOOL 5: Get Light Curve Data → MAST API + RTDB Cache
// ═══════════════════════════════════════════════════════════════
server.tool(
  "get_light_curve_data",
  `Fetches raw time, flux, and error arrays for a TIC ID from the MAST archive. Caches the result in Firebase RTDB for real-time dashboard access.`,
  {
    tic_id: z.string().describe("The TIC ID of the target"),
  },
  async ({ tic_id }) => {
    try {
      // Update RTDB with fetch status
      await set(ref(realtimeDb, `active_analyses/${tic_id}`), {
        status: "FETCHING_LIGHT_CURVE",
        started_at: timestamp(),
      });

      // Step 1: Check RTDB cache first
      const cachedSnap = await get(ref(realtimeDb, `light_curves/${tic_id}`));
      if (cachedSnap.exists()) {
        const cached = cachedSnap.val();
        const cacheAge = Date.now() - new Date(cached.cached_at || 0).getTime();
        // Use cache if less than 24 hours old and contains valid data points
        if (cacheAge < 24 * 60 * 60 * 1000 && cached.data_points > 0) {
          await update(ref(realtimeDb, `active_analyses/${tic_id}`), {
            status: "LIGHT_CURVE_CACHED",
            timestamp: timestamp(),
          });

          return txt(
            `📊 Light Curve Data for TIC ${tic_id} (FROM CACHE)\n\n` +
            `Source: ${cached.source}\n` +
            `Data Points: ${cached.data_points}\n` +
            `Has TCE: ${cached.has_tce}\n` +
            `TCE Count: ${cached.tce_count}\n` +
            `Transit Depth: ${cached.transit_depth ?? "N/A"}\n` +
            `Orbital Period: ${cached.orbital_period ?? "N/A"} days\n` +
            `Estimated Radius: ${cached.estimated_radius ?? "N/A"} R⊕\n\n` +
            `Flux Range: [${cached.flux_min?.toFixed(6) ?? "N/A"}, ${cached.flux_max?.toFixed(6) ?? "N/A"}]\n` +
            `Time Range: [${cached.time_min?.toFixed(4) ?? "N/A"}, ${cached.time_max?.toFixed(4) ?? "N/A"}]\n\n` +
            `Cached in RTDB: /light_curves/${tic_id}\n` +
            `To run full analysis, execute 'run_ensemble_analysis' on this TIC ID.`
          );
        }
      }

      // Step 2: Fetch from MAST
      const tceUrl = `https://exo.mast.stsci.edu/api/v0.1/dvdata/tess/${tic_id}/tces/`;
      const tceResponse = await fetchWithTimeout(tceUrl);

      if (!tceResponse.ok) {
        throw new Error(`MAST TCE request failed (${tceResponse.status})`);
      }

      const tceData = await tceResponse.json();
      let tceArray: any[] = [];
      if (tceData?.TCE && Array.isArray(tceData.TCE)) {
        tceArray = tceData.TCE;
      } else if (Array.isArray(tceData)) {
        tceArray = tceData;
      }

      const hasTCE = tceArray.length > 0;
      let tceNumber = 1;
      let sector = "";

      if (hasTCE) {
        const firstTce = tceArray[0];
        if (typeof firstTce === "string") {
          const parts = firstTce.split(":");
          if (parts.length >= 2) {
            sector = parts[0];
            const numMatch = parts[1].match(/\d+/);
            tceNumber = numMatch ? parseInt(numMatch[0], 10) : 1;
          }
        } else if (typeof firstTce === "object") {
          tceNumber = firstTce.tce || 1;
        }
      }

      // Fetch light curve table
      let fluxValues: number[] = [];
      let timeValues: number[] = [];
      let transitDepth: number | null = null;
      let estimatedRadius: number | null = null;
      let dataSource = "mast_dvdata";

      if (hasTCE) {
        let tableUrl = `https://exo.mast.stsci.edu/api/v0.1/dvdata/tess/${tic_id}/table/?tce=${tceNumber}`;
        if (sector) tableUrl += `&sector=${sector}`;

        const tableResponse = await fetchWithTimeout(tableUrl);
        if (tableResponse.ok) {
          const tableData = await tableResponse.json();
          let rows: any[] = Array.isArray(tableData) ? tableData : (tableData?.data || []);

          for (const row of rows) {
            const phase = row.PHASE ?? row.phase;
            const flux = row.LC_DETREND ?? row.lc_detrend ?? row.LC_INIT ?? row.lc_init;
            const time = row.TIME ?? row.time;
            if (phase !== undefined && flux !== undefined && isFinite(phase) && isFinite(flux)) {
              fluxValues.push(flux);
              timeValues.push(time !== undefined && isFinite(time) ? time : phase);
            }
          }

          // Compute transit depth
          if (fluxValues.length > 10) {
            const phases = rows
              .map(r => r.PHASE ?? r.phase)
              .filter((p): p is number => p !== undefined && isFinite(p));
            const baselineFlux = fluxValues.filter((_, i) => Math.abs(phases[i] ?? 1) > 0.15);
            const transitFlux = fluxValues.filter((_, i) => Math.abs(phases[i] ?? 1) < 0.05);

            if (baselineFlux.length > 0 && transitFlux.length > 0) {
              const sortedBaseline = [...baselineFlux].sort((a, b) => a - b);
              const sortedTransit = [...transitFlux].sort((a, b) => a - b);
              const baselineMedian = sortedBaseline[Math.floor(sortedBaseline.length / 2)];
              const transitMedian = sortedTransit[Math.floor(sortedTransit.length / 2)];

              if (baselineMedian > 0) {
                transitDepth = (baselineMedian - transitMedian) / baselineMedian;
                estimatedRadius = transitDepth > 0 ? Math.sqrt(transitDepth) * 109.2 : null;
              }
            }
          }
        }
      }

      // Fallback to Python engine lightkurve fetch if no data
      if (fluxValues.length === 0) {
        try {
          const lkResponse = await fetchWithTimeout(`http://127.0.0.1:8000/lightcurve/${tic_id}`);
          if (lkResponse.ok) {
            const lkData = await lkResponse.json();
            if (lkData.data_points > 0) {
              fluxValues = lkData.flux;
              timeValues = lkData.time;
              dataSource = lkData.source || "mast_lightkurve";
            }
          }
        } catch (e) {
          console.error(`Failed to fetch from lightkurve fallback:`, e);
        }
      }

      // Step 3: Cache in RTDB
      const lightCurveData = {
        source: dataSource,
        data_points: fluxValues.length,
        has_tce: hasTCE,
        tce_count: tceArray.length,
        transit_depth: transitDepth,
        orbital_period: null as number | null,
        estimated_radius: estimatedRadius,
        flux_min: fluxValues.length > 0 ? Math.min(...fluxValues) : null,
        flux_max: fluxValues.length > 0 ? Math.max(...fluxValues) : null,
        time_min: timeValues.length > 0 ? Math.min(...timeValues) : null,
        time_max: timeValues.length > 0 ? Math.max(...timeValues) : null,
        // Store a downsampled version for dashboard visualization (max 500 points)
        flux_sample: fluxValues.length > 500
          ? fluxValues.filter((_, i) => i % Math.ceil(fluxValues.length / 500) === 0)
          : fluxValues,
        time_sample: timeValues.length > 500
          ? timeValues.filter((_, i) => i % Math.ceil(timeValues.length / 500) === 0)
          : timeValues,
        cached_at: timestamp(),
      };

      await set(ref(realtimeDb, `light_curves/${tic_id}`), lightCurveData);
      await update(ref(realtimeDb, `active_analyses/${tic_id}`), {
        status: "LIGHT_CURVE_FETCHED",
        data_points: fluxValues.length,
        timestamp: timestamp(),
      });

      const dataPointsInfo = fluxValues.length > 0
        ? `Data Points: ${fluxValues.length}\nFlux Range: [${Math.min(...fluxValues).toFixed(6)}, ${Math.max(...fluxValues).toFixed(6)}]`
        : "Data Points: 0 (no photometric data available from MAST for this TIC)";

      return txt(
        `📊 Light Curve Data for TIC ${tic_id} (LIVE FROM MAST)\n\n` +
        `Source: NASA MAST Archive\n` +
        `${dataPointsInfo}\n` +
        `Has TCE: ${hasTCE}\n` +
        `TCE Count: ${tceArray.length}\n` +
        `Transit Depth: ${transitDepth?.toFixed(6) ?? "N/A"}\n` +
        `Estimated Radius: ${estimatedRadius?.toFixed(2) ?? "N/A"} R⊕\n\n` +
        `Cached in RTDB: /light_curves/${tic_id}\n` +
        `Real-time status: /active_analyses/${tic_id}\n\n` +
        `To run full classification, execute 'run_ensemble_analysis' on this TIC ID.`
      );

    } catch (error: any) {
      // Update RTDB with error status
      try {
        await update(ref(realtimeDb, `active_analyses/${tic_id}`), {
          status: "LIGHT_CURVE_ERROR",
          error: error.message,
          timestamp: timestamp(),
        });
      } catch (_) { /* ignore RTDB error during error handling */ }

      return txt(
        `⚠️ Light Curve Fetch Error for TIC ${tic_id}\n` +
        `Error: ${error.message}\n\n` +
        `You can still run 'run_ensemble_analysis' which will fetch data via its own Python/lightkurve pipeline.`
      );
    }
  }
);

// ═══════════════════════════════════════════════════════════════
// TOOL 6: Run Ensemble Analysis → Python FastAPI + Firestore + RTDB
// ═══════════════════════════════════════════════════════════════
server.tool(
  "run_ensemble_analysis",
  `The core execution trigger. Sends the target to the Python FastAPI Ensemble Engine, persists results to Firestore, and broadcasts live status via Firebase RTDB.`,
  {
    tic_id: z.string().describe("The TIC ID of the target"),
  },
  async ({ tic_id }) => {
    try {
      const pythonEngineUrl = `${PYTHON_ENGINE_URL}/ensemble-analyze`;
      
      // 🛡️ HARDENING 3: Timeout & Resilience
      // Give the Python engine up to 30 seconds to solve complex light curves
      const response = await axios.post(pythonEngineUrl, {
          tic_id: parseInt(tic_id as string)
      }, { timeout: 30000 }); 

      const engineResults = response.data;

      // If the engine rejected the target (e.g., Exoplanet or Bad Data)
      if (engineResults.consensus_classification.includes("REJECTED")) {
          return txt(`🛑 TARGET REJECTED BY FIREWALL (TIC ${tic_id})\nReason: ${engineResults.error_log}\nDo not log this to the database.`);
      }

      return txt(`🔥 ENSEMBLE ENGINE ANALYSIS COMPLETE FOR TIC ${tic_id} 🔥\n\nClassification: ${engineResults.consensus_classification}\nCalibrated Confidence: ${engineResults.confidence}\nEngines Used: ${engineResults.engines_used.join(', ')}\n\nPhysical Parameters Extracted:\n${JSON.stringify(engineResults.physical_parameters, null, 2)}\n\nAction Required: Evaluate these results. If confidence is > 0.85, use 'create_discovery_thesis' to log this to the database.`);

    } catch (error: any) {
      let errorMsg = error.message;
      if (error.code === 'ECONNABORTED') {
          errorMsg = "Python Engine timeout (exceeded 30 seconds). The mathematical fit was too complex or data was too large.";
      } else if (error.response) {
          errorMsg = `Backend Error ${error.response.status}: ${JSON.stringify(error.response.data)}`;
      }
      
      return txt(`❌ ENGINE COMMUNICATION FAILURE for TIC ${tic_id}.\nDetails: ${errorMsg}\nEnsure FastAPI is running and dependencies are correct.`);
    }
  }
);

// ═══════════════════════════════════════════════════════════════
// TOOL 7: List All Used TIC IDs
// ═══════════════════════════════════════════════════════════════
server.tool(
  "list_all_used_tic_ids",
  `Retrieves a combined list of all unique TIC IDs that have either a discovery thesis or a rejection thesis.`,
  {},
  async () => {
    try {
      const discSnap = await getDocs(collection(firestoreDb, "discovery_theses"));
      const rejSnap = await getDocs(collection(firestoreDb, "rejection_theses"));

      const ticIds = new Set<string>();
      discSnap.forEach(docSnap => {
        const data = docSnap.data();
        if (data.tic_id) ticIds.add(data.tic_id.toString());
      });
      rejSnap.forEach(docSnap => {
        const data = docSnap.data();
        if (data.tic_id) ticIds.add(data.tic_id.toString());
      });

      const uniqueIds = Array.from(ticIds);
      return txt(
        JSON.stringify(
          {
            count: uniqueIds.length,
            tic_ids: uniqueIds,
          },
          null,
          2
        )
      );
    } catch (e: any) {
      return txt(`⚠️ Failed to list all used TIC IDs: ${e.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════════
// TOOL 8: List Discovery TIC IDs
// ═══════════════════════════════════════════════════════════════
server.tool(
  "list_discovery_tic_ids",
  `Retrieves a list of all unique TIC IDs that have an associated discovery thesis.`,
  {},
  async () => {
    try {
      const discSnap = await getDocs(collection(firestoreDb, "discovery_theses"));
      const ticIds = new Set<string>();
      discSnap.forEach(docSnap => {
        const data = docSnap.data();
        if (data.tic_id) ticIds.add(data.tic_id.toString());
      });

      const uniqueIds = Array.from(ticIds);
      return txt(
        JSON.stringify(
          {
            count: uniqueIds.length,
            tic_ids: uniqueIds,
          },
          null,
          2
        )
      );
    } catch (e: any) {
      return txt(`⚠️ Failed to list discovery TIC IDs: ${e.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════════
// TOOL 9: List Rejected TIC IDs
// ═══════════════════════════════════════════════════════════════
server.tool(
  "list_rejected_tic_ids",
  `Retrieves a list of all unique TIC IDs that have an associated rejection thesis.`,
  {},
  async () => {
    try {
      const rejSnap = await getDocs(collection(firestoreDb, "rejection_theses"));
      const ticIds = new Set<string>();
      rejSnap.forEach(docSnap => {
        const data = docSnap.data();
        if (data.tic_id) ticIds.add(data.tic_id.toString());
      });

      const uniqueIds = Array.from(ticIds);
      return txt(
        JSON.stringify(
          {
            count: uniqueIds.length,
            tic_ids: uniqueIds,
          },
          null,
          2
        )
      );
    } catch (e: any) {
      return txt(`⚠️ Failed to list rejected TIC IDs: ${e.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════════
// TOOL 10: List Discovery Theses with Full Data
// ═══════════════════════════════════════════════════════════════
server.tool(
  "list_discovery_theses",
  `Retrieves all discovery theses with full data.`,
  {},
  async () => {
    try {
      const discSnap = await getDocs(collection(firestoreDb, "discovery_theses"));
      const theses: any[] = [];
      discSnap.forEach(docSnap => {
        const data = docSnap.data();
        const createdAt = data.createdAt && typeof data.createdAt.toDate === "function"
          ? data.createdAt.toDate().toISOString()
          : data.createdAt;
        const updatedAt = data.updatedAt && typeof data.updatedAt.toDate === "function"
          ? data.updatedAt.toDate().toISOString()
          : data.updatedAt;
        theses.push({
          thesis_id: docSnap.id,
          ...data,
          createdAt,
          updatedAt,
        });
      });

      return txt(
        JSON.stringify(
          {
            count: theses.length,
            theses,
          },
          null,
          2
        )
      );
    } catch (e: any) {
      return txt(`⚠️ Failed to list discovery theses: ${e.message}`);
    }
  }
);

// ═══════════════════════════════════════════════════════════════
// TOOL 11: List Rejection Theses with Full Data
// ═══════════════════════════════════════════════════════════════
server.tool(
  "list_rejection_theses",
  `Retrieves all rejection theses with full data.`,
  {},
  async () => {
    try {
      const rejSnap = await getDocs(collection(firestoreDb, "rejection_theses"));
      const theses: any[] = [];
      rejSnap.forEach(docSnap => {
        const data = docSnap.data();
        const createdAt = data.createdAt && typeof data.createdAt.toDate === "function"
          ? data.createdAt.toDate().toISOString()
          : data.createdAt;
        const updatedAt = data.updatedAt && typeof data.updatedAt.toDate === "function"
          ? data.updatedAt.toDate().toISOString()
          : data.updatedAt;
        theses.push({
          thesis_id: docSnap.id,
          ...data,
          createdAt,
          updatedAt,
        });
      });

      return txt(
        JSON.stringify(
          {
            count: theses.length,
            theses,
          },
          null,
          2
        )
      );
    } catch (e: any) {
      return txt(`⚠️ Failed to list rejection theses: ${e.message}`);
    }
  }
);

// ─── Main ──────────────────────────────────────────────────────
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("🔥 Sarkar AstroForge MCP Server v2.0 running on stdio");
  console.error(`   Firestore Project: ${firebaseConfig.projectId}`);
  console.error(`   RTDB URL: ${firebaseConfig.databaseURL}`);
  console.error(`   Python Engine: ${PYTHON_ENGINE_URL}`);
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
