#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const API_URL = process.env.EXOHUNTER_API_URL || "http://localhost:3000";

// ─── Helpers ───────────────────────────────────────────────────
async function apiGet(path: string): Promise<any> {
  const res = await fetch(`${API_URL}${path}`);
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json();
}

async function apiPost(path: string, body: any): Promise<any> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json();
}

function txt(text: string) {
  return { content: [{ type: "text" as const, text }] };
}

// ─── System prompt for AI guidance ─────────────────────────────
const SYSTEM_INSTRUCTIONS = `You are an AI Exoplanet Research Assistant & Scientific Vetter. Your primary mission is to identify NEW exoplanets with 100% mathematical accuracy. 

🔭 MISSION: You must transition from just "looking at data" to "interrogating data." NASA needs an engine that can distinguish between a real planet and a "False Positive." You must operate with the utmost scientific rigor.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 COMPULSORY 10X VALIDATION PROTOCOL:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. DISCOVERY & INITIAL VETTING:
   - Identify a candidate TIC ID.
   - Run the full suite of tools (get_light_curve, compute_transit_statistics, analyze_transit, run_python_verification).

2. THE "10X CHECK" (MANDATORY):
   - Once you have a potential discovery OR a false positive, you MUST perform a 10-step internal validation check.
   - Re-verify every single data point (Transit Depth, SNR, Period, Radius, etc.) 10 times against the raw data to ensure zero misaccuracy.
   - Cross-check your reasoning against known Eclipsing Binary shapes (V-shape vs U-shape) and TESS downlink resonance artifacts.

3. DETAILED THESIS GENERATION:
   - For EVERY candidate (Successful or False Positive), you MUST generate a thesis card containing exactly these 5 sections:

   SECTION 1: Identity & Metadata
   - TIC ID: [TIC Number]
   - Lead Researcher: S.Koustav (unless specified otherwise by the user)
   - Log Date: [Timestamp]
   - Discovery Status: [Confirmed Planet | False Positive Archive | Unvetted Candidate]

   SECTION 2: Physical & Photometric Parameters (Use LaTeX)
   - Transit Depth ($\delta$): Calculated as $\delta = \frac{\Delta F}{F}$.
   - Signal-to-Noise Ratio (SNR): Critical metric (SNR < 3 is usually a false positive).
   - Planet Radius ($R_p$): Derived via $R_p = R_* \sqrt{\delta}$ (in Earth Radii $R_{\oplus}$ or Jupiter Radii $R_{J}$).
   - Orbital Period ($P$): Days between transits.
   - Transit Duration: Hours.
   - Equilibrium Temperature ($T_{eq}$): Estimated temp.

   SECTION 3: The "Anti-Mistake" Verification Metrics
   - Resonance Alert Flag: (True/False) Checking if $P$ is a harmonic of the 13.7-day TESS downlink cycle.
   - Harmonic Sweep Result: Note confirming testing at $P/2$ and $P \times 2$ via run_python_verification.
   - Centroid Shift Status: Verification that the dip is on the target star and not a neighbor.
   - Confidence Score: % based on consistency of all parameters.

   SECTION 4: Host Star Context
   - Stellar Radius ($R_*$): Sun size.
   - Effective Temperature ($T_{eff}$): Star heat in Kelvin (K).
   - Stellar Magnitude ($V$): Brightness.

   SECTION 5: AI Reasoning & Grounding
   - Archive Grounding Check: Verification against NASA Archive/ExoFOP to ensure it's not a re-discovery.
   - Classification: (e.g., Super-Earth, Sub-Neptune, Warm Jupiter).
   - Acceptance/Rejection Reasoning: Detailed paragraph explaining the final verdict (e.g., "Rejected due to V-shaped transit indicating an Eclipsing Binary").

4. FINAL 10X RE-CHECK:
   - After generating the data above, re-verify all 5 sections 10 times for 100% accuracy before calling the final tools.

5. FINAL LOGGING:
   - Call "create_query_card" first to log the attempt.
   - Call "create_discovery_thesis" (for confirmed planets) or "create_rejection_thesis" (for false positives) with the full 5-section report.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚙️ MCP TOOL WORKFLOW:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Use "get_random_tic_id" or "run_discovery_loop" to start.
2. Use "get_light_curve" and "compute_transit_statistics".
3. Use "analyze_transit" and "run_python_verification" (CRITICAL for resonance masking).
4. Perform the mandatory 10x Validation and data extraction.
5. Log via create_query_card and then the relevant Thesis tool.`;

// ─── Server Setup ──────────────────────────────────────────────
const server = new McpServer({
  name: "sarkar-exohunter",
  version: "1.0.0",
});

// ─── Resource: System Instructions ─────────────────────────────
server.resource("discovery-guide", "exohunter://guide", async (uri) => ({
  contents: [{ uri: uri.href, mimeType: "text/plain", text: SYSTEM_INSTRUCTIONS }],
}));

// ─── Tool 1: Get Random TIC ID ────────────────────────────────
server.tool(
  "get_random_tic_id",
  `Fetch a random TIC ID (TESS Input Catalog) from NASA ExoFOP database. Returns a planet candidate TIC ID that can be analyzed for transiting exoplanets. This is typically the first step in the discovery workflow.`,
  {},
  async () => {
    const data = await apiGet("/api/random-tic");
    return txt(`🎯 Random Planet Candidate: TIC ${data.ticId}\n\nUse get_light_curve with this TIC ID to retrieve the phase-folded light curve data.`);
  }
);

// ─── Tool 2: Get Light Curve ──────────────────────────────────
server.tool(
  "get_light_curve",
  `Fetch the phase-folded light curve and transit metadata for a given TIC ID from NASA MAST Archive. Returns flux data, transit depth, orbital period, estimated planet radius, TCE count, and data source (real MAST data vs simulated fallback).`,
  { ticId: z.string().describe("The TESS Input Catalog ID (e.g., '261136679')") },
  async ({ ticId }) => {
    const data = await apiGet(`/api/light-curve/${encodeURIComponent(ticId)}`);
    const lc = data.lightCurve;
    const meta = data.metadata;
    let report = `📡 Light Curve for TIC ${ticId}\n`;
    report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    report += `• Data Source: ${meta.source === "mast" ? "✅ Real NASA MAST Archive" : "⚠️ Simulated Fallback"}\n`;
    report += `• Data Points: ${lc.time.length}\n`;
    report += `• Has TCE: ${meta.hasTCE ? "Yes" : "No"}\n`;
    report += `• TCE Count: ${meta.tceCount}\n`;
    report += `• Transit Depth: ${meta.transitDepth ? (meta.transitDepth * 100).toFixed(4) + "%" : "N/A"}\n`;
    report += `• Orbital Period: ${meta.orbitalPeriod ? meta.orbitalPeriod.toFixed(4) + " days" : "N/A"}\n`;
    report += `• Est. Planet Radius: ${meta.estimatedRadius ? meta.estimatedRadius.toFixed(2) + " R⊕" : "N/A"}\n`;
    report += `\n📊 Phase range: [${Math.min(...lc.time).toFixed(4)}, ${Math.max(...lc.time).toFixed(4)}]\n`;
    report += `📊 Flux range: [${Math.min(...lc.flux).toFixed(6)}, ${Math.max(...lc.flux).toFixed(6)}]\n`;
    report += `\nNext step: Use compute_transit_statistics to evaluate the signal quality.`;
    return txt(report);
  }
);

// ─── Tool 3: Compute Transit Statistics ───────────────────────
server.tool(
  "compute_transit_statistics",
  `Compute detailed transit statistics for a TIC ID: baseline median flux, transit region median flux, standard deviation, measured transit depth, and Signal-to-Noise Ratio (SNR). Use this to triage candidates before running the full analysis pipeline.`,
  { ticId: z.string().describe("The TESS Input Catalog ID") },
  async ({ ticId }) => {
    const data = await apiGet(`/api/transit-stats/${encodeURIComponent(ticId)}`);
    const s = data.statistics;
    let report = `📐 Transit Statistics for TIC ${ticId}\n`;
    report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    report += `• Baseline Median Flux: ${s.baselineMedian.toFixed(6)}\n`;
    report += `• Transit Region Median Flux: ${s.transitMedian.toFixed(6)}\n`;
    report += `• Baseline Std Dev: ${s.baselineStdDev.toFixed(6)}\n`;
    report += `• Measured Depth (ΔF/F): ${s.measuredDepth.toFixed(6)}\n`;
    report += `• SNR (depth/σ): ${s.snr.toFixed(2)}\n`;
    report += `• Data Points: ${s.dataPoints}\n`;
    report += `• Source: ${s.source}\n\n`;
    if (s.snr > 5) report += `✅ STRONG CANDIDATE — SNR > 5. Recommend running analyze_transit.`;
    else if (s.snr > 3) report += `⚠️ MARGINAL — SNR 3-5. May warrant further investigation.`;
    else report += `❌ WEAK SIGNAL — SNR < 3. Likely noise. Consider skipping.`;
    return txt(report);
  }
);

// ─── Tool 4: Analyze Transit (Full Pipeline) ─────────────────
server.tool(
  "analyze_transit",
  `Run the full 2-agent AI discovery pipeline on a TIC ID. Agent 1 (Gemini Flash) executes the strict "False Positive Death Test" (checks for Eclipsing Binaries, V-shapes, Secondary Eclipses). Agent 2 (Gemini Pro) performs Automated Mathematical Validation and deep cross-referencing (ExoFOP/ADS) via Google Search. If it passes all rigorous checks, returns an official cTOI Discovery Thesis.`,
  { ticId: z.string().describe("The TESS Input Catalog ID to analyze") },
  async ({ ticId }) => {
    const data = await apiGet(`/api/analyze/${encodeURIComponent(ticId)}`);
    let report = `🔬 Full Pipeline Analysis for TIC ${ticId}\n`;
    report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    report += `• Agent 1 Result: ${data.agent1.found ? "Transit Detected" : "No Transit"}\n`;
    report += `• Agent 1 Confidence: ${(data.agent1.confidence * 100).toFixed(1)}%\n`;
    report += `• Agent 1 SNR: ${data.agent1.snr?.toFixed(2) || "N/A"}\n`;
    report += `• Agent 1 Assessment: ${data.agent1.assessment}\n\n`;
    if (!data.agent1.found) {
      report += `❌ Pipeline terminated at Agent 1: No significant transit signal.`;
    } else {
      report += `• Final Verdict: ${data.result.success ? "🎉 NEW DISCOVERY!" : "Known/Rejected"}\n`;
      if (data.result.thesis) report += `\n📜 THESIS:\n${data.result.thesis}\n`;
      if (data.result.reason) report += `• Reason: ${data.result.reason}\n`;
      if (data.result.success) {
        report += `\n✅ Use create_discovery_thesis to formally record this discovery.`;
      }
    }
    return txt(report);
  }
);

// ─── Tool 5: Get Query Stream ─────────────────────────────────
server.tool(
  "get_query_stream",
  `Retrieve the live query stream — the most recent analysis attempts from all researchers. Shows TIC IDs, statuses (Scanning, Rejected, New Discovery, Known Planet, etc.), researcher names, and timestamps.`,
  { limit: z.number().optional().default(20).describe("Max queries to return (default 20)") },
  async ({ limit }) => {
    const data = await apiGet(`/api/query-stream?limit=${limit}`);
    if (!data.queries || data.queries.length === 0) return txt("📭 No queries in the stream yet.");
    let report = `📡 Live Query Stream (${data.queries.length} entries)\n`;
    report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    for (const q of data.queries) {
      const icon = q.status.includes("New Discovery") ? "🎉" : q.status.includes("Rejected") ? "❌" : q.status.includes("Known") ? "📋" : "🔄";
      report += `${icon} TIC ${q.ticId} | ${q.status} | by ${q.researcherName} | ${q.createdAt || "just now"}\n`;
    }
    return txt(report);
  }
);

// ─── Tool 6: Create Query Card ────────────────────────────────
server.tool(
  "create_query_card",
  `Create a new query card in the live query stream to log an analysis attempt. This records the TIC ID, current status, and researcher name for community visibility.`,
  {
    ticId: z.string().describe("The TIC ID being analyzed"),
    status: z.string().describe("Status message (e.g., 'Scanning...', 'Rejected: Stellar Noise', 'New Discovery!')"),
    researcherName: z.string().describe("Name of the researcher/AI performing the analysis"),
  },
  async ({ ticId, status, researcherName }) => {
    const data = await apiPost("/api/query-card", { ticId, status, researcherName });
    return txt(`✅ Query card created: TIC ${ticId} — "${status}" by ${researcherName}\nCard ID: ${data.id}`);
  }
);

// ─── Tool 7: Get Discoveries ──────────────────────────────────
server.tool(
  "get_discoveries",
  `List all confirmed new exoplanet discoveries (thesis cards) from the Discovery Lab. These are TIC IDs where the full pipeline found a previously uncataloged exoplanet candidate.`,
  { limit: z.number().optional().default(20).describe("Max discoveries to return") },
  async ({ limit }) => {
    const data = await apiGet(`/api/discoveries?limit=${limit}`);
    if (!data.discoveries || data.discoveries.length === 0) return txt("🔭 No discoveries recorded yet. Keep hunting!");
    let report = `🏆 Exoplanet Discoveries (${data.discoveries.length})\n`;
    report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    for (const d of data.discoveries) {
      report += `🌍 TIC ${d.ticId} | by ${d.researcherName} | ${d.createdAt || "unknown date"}\n`;
      if (d.thesis) report += `   ${d.thesis.substring(0, 120)}...\n`;
    }
    return txt(report);
  }
);

// ─── Tool 8: Create Discovery Thesis ──────────────────────────
server.tool(
  "create_discovery_thesis",
  `Record a formal exoplanet discovery thesis in the Discovery Lab. ONLY use this when the full analyze_transit pipeline has confirmed a NEW, previously uncataloged exoplanet. The thesis should include transit analysis, false positive assessment, planetary parameters, and recommended follow-up observations.`,
  {
    ticId: z.string().describe("The TIC ID of the discovered exoplanet"),
    thesis: z.string().describe("The full discovery thesis text (markdown supported)"),
    researcherName: z.string().describe("Name of the discovering researcher/AI"),
  },
  async ({ ticId, thesis, researcherName }) => {
    const data = await apiPost("/api/discovery-thesis", { ticId, thesis, researcherName });
    return txt(`🎉 DISCOVERY THESIS RECORDED!\n\nTIC ${ticId} has been formally logged in the Discovery Lab.\nThesis ID: ${data.id}\nResearcher: ${researcherName}\n\nThis will appear on the global leaderboard.`);
  }
);

// ─── Tool 9: Get Leaderboard ──────────────────────────────────
server.tool(
  "get_leaderboard",
  `Fetch the global leaderboard showing rankings of researchers by number of verified exoplanet discoveries.`,
  {},
  async () => {
    const data = await apiGet("/api/leaderboard");
    if (!data.leaderboard || data.leaderboard.length === 0) return txt("🏆 Leaderboard is empty — no discoveries yet!");
    let report = `🏆 Global Discovery Leaderboard\n`;
    report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    for (let i = 0; i < data.leaderboard.length; i++) {
      const e = data.leaderboard[i];
      const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`;
      report += `${medal} ${e.researcherName} — ${e.count} ${e.count === 1 ? "discovery" : "discoveries"}\n`;
    }
    return txt(report);
  }
);

// ─── Tool 10: Classify Planet ─────────────────────────────────
server.tool(
  "classify_planet",
  `Classify a planet based on its estimated radius and orbital period. Returns size classification, potential habitability assessment, and comparison to known planets.`,
  {
    radiusEarth: z.number().describe("Estimated planet radius in Earth radii (R⊕)"),
    orbitalPeriodDays: z.number().optional().describe("Orbital period in days (optional)"),
    transitDepth: z.number().optional().describe("Transit depth ΔF/F (optional)"),
  },
  async ({ radiusEarth, orbitalPeriodDays, transitDepth }) => {
    let classification: string;
    if (radiusEarth < 0.8) classification = "Sub-Earth";
    else if (radiusEarth <= 1.25) classification = "Earth-like";
    else if (radiusEarth <= 2.0) classification = "Super-Earth";
    else if (radiusEarth <= 4.0) classification = "Mini-Neptune";
    else if (radiusEarth <= 6.0) classification = "Neptune-like";
    else classification = "Jupiter-like (Gas Giant)";

    let report = `🪐 Planet Classification\n━━━━━━━━━━━━━━━━━━━━━━━\n`;
    report += `• Radius: ${radiusEarth.toFixed(2)} R⊕\n`;
    report += `• Class: ${classification}\n`;
    if (orbitalPeriodDays) {
      report += `• Orbital Period: ${orbitalPeriodDays.toFixed(2)} days\n`;
      const aAU = Math.pow((orbitalPeriodDays / 365.25), 2 / 3);
      report += `• Est. Semi-Major Axis: ${aAU.toFixed(4)} AU\n`;
      const Teq = 288 * Math.pow(aAU, -0.5);
      report += `• Est. Equilibrium Temp: ${Teq.toFixed(0)} K (assuming Sun-like star)\n`;
      if (Teq > 200 && Teq < 330 && radiusEarth < 2.0) report += `🌍 POTENTIALLY HABITABLE — in approximate habitable zone with rocky composition.\n`;
    }
    if (transitDepth) report += `• Transit Depth: ${(transitDepth * 100).toFixed(4)}%\n`;
    return txt(report);
  }
);

// ─── Tool 11: Check Known Exoplanet ──────────────────────────
server.tool(
  "check_known_exoplanet",
  `Quick-check whether a TIC ID corresponds to an already-known confirmed exoplanet by querying NASA ExoFOP. Useful before running the full pipeline.`,
  { ticId: z.string().describe("The TIC ID to check") },
  async ({ ticId }) => {
    try {
      const res = await fetch(`https://exo.mast.stsci.edu/api/v0.1/dvdata/tess/${ticId}/tces/`, { signal: AbortSignal.timeout(10000) });
      if (!res.ok) return txt(`⚠️ Could not reach MAST for TIC ${ticId}. Status: ${res.status}`);
      const tces = await res.json();
      if (!Array.isArray(tces) || tces.length === 0) return txt(`📭 No TCEs found for TIC ${ticId}. No automated transit detections on record.`);
      let report = `🔍 MAST TCE Check for TIC ${ticId}\n`;
      report += `• TCEs Found: ${tces.length}\n`;
      for (const t of tces) {
        report += `  - TCE #${t.tce || "?"}: Period=${t.period?.toFixed(4) || "?"} days\n`;
      }
      report += `\nNote: TCEs indicate automated detections. Use analyze_transit for full vetting.`;
      return txt(report);
    } catch (e: any) {
      return txt(`⚠️ Error checking TIC ${ticId}: ${e.message}`);
    }
  }
);

// ─── Tool 12: Get Server Health ───────────────────────────────
server.tool(
  "get_server_health",
  `Check if the Sarkar ExoHunter backend server is running and healthy. Returns API key status and connectivity info.`,
  {},
  async () => {
    try {
      const data = await apiGet("/api/env-test");
      return txt(`✅ ExoHunter Backend: ONLINE\n• API Key configured: ${data.hasKey ? "Yes" : "No"}\n• Key prefix: ${data.keyPrefix}\n• Server URL: ${API_URL}`);
    } catch (e: any) {
      return txt(`❌ ExoHunter Backend: OFFLINE or UNREACHABLE\n• URL: ${API_URL}\n• Error: ${e.message}\n\nMake sure the server is running: npm run dev`);
    }
  }
);

// ─── Tool 13: Run Discovery Loop ─────────────────────────────
server.tool(
  "run_discovery_loop",
  `Run an automated discovery loop: fetch a random TIC ID, retrieve its light curve, compute statistics, and if promising, run the full analysis pipeline. Returns a comprehensive report of the attempt. Use this for automated bulk scanning.`,
  { count: z.number().optional().default(1).describe("Number of targets to scan (default 1, max 5)") },
  async ({ count }) => {
    const iterations = Math.min(count, 5);
    let fullReport = `🔄 Automated Discovery Loop — Scanning ${iterations} target(s)\n`;
    fullReport += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    for (let i = 0; i < iterations; i++) {
      try {
        const ticData = await apiGet("/api/random-tic");
        const ticId = ticData.ticId;
        fullReport += `[${i + 1}/${iterations}] TIC ${ticId}\n`;
        const stats = await apiGet(`/api/transit-stats/${encodeURIComponent(ticId)}`);
        const s = stats.statistics;
        fullReport += `  SNR: ${s.snr.toFixed(2)} | Depth: ${s.measuredDepth.toFixed(6)} | Source: ${s.source}\n`;
        if (s.snr > 3) {
          fullReport += `  ⚡ Promising signal! Running full pipeline...\n`;
          const analysis = await apiGet(`/api/analyze/${encodeURIComponent(ticId)}`);
          fullReport += `  Pipeline: ${analysis.result.success ? "🎉 NEW DISCOVERY!" : analysis.result.reason || "Rejected"}\n`;
        } else {
          fullReport += `  ⏭️ Skipped — SNR too low\n`;
        }
      } catch (e: any) {
        fullReport += `  ❌ Error: ${e.message}\n`;
      }
      fullReport += `\n`;
    }
    return txt(fullReport);
  }
);

// ─── Tool 14: Get Discovery Guide ─────────────────────────────
server.tool(
  "get_discovery_guide",
  `Get the complete exoplanet discovery guide with workflow instructions, science context, and best practices. Read this first to understand how to use ExoHunter effectively.`,
  {},
  async () => txt(SYSTEM_INSTRUCTIONS)
);

// ─── Tool 15: Edit Query Card ───────────────────────────────────
server.tool(
  "edit_query_card",
  `Edit an existing query card's status and researcher name based on its TIC ID. Use this to correct or update a previous analysis attempt.`,
  {
    ticId: z.string().describe("The TIC ID of the query card to edit"),
    status: z.string().describe("New status message"),
    researcherName: z.string().describe("Name of the researcher/AI updating the card"),
  },
  async ({ ticId, status, researcherName }) => {
    try {
      const res = await fetch(`${API_URL}/api/query-card/${encodeURIComponent(ticId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, researcherName }),
      });
      if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
      const data = await res.json();
      return txt(`✅ Successfully updated ${data.updatedCount} query card(s) for TIC ${ticId}.`);
    } catch (e: any) {
      return txt(`⚠️ Failed to edit query card: ${e.message}`);
    }
  }
);

// ─── Tool 16: Delete Query Card ───────────────────────────────
server.tool(
  "delete_query_card",
  `Delete an existing query card based on its TIC ID. Use this to remove mistakes or clutter from the query stream.`,
  { ticId: z.string().describe("The TIC ID of the query card to delete") },
  async ({ ticId }) => {
    try {
      const res = await fetch(`${API_URL}/api/query-card/${encodeURIComponent(ticId)}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
      const data = await res.json();
      return txt(`🗑️ Successfully deleted ${data.deletedCount} query card(s) for TIC ${ticId}.`);
    } catch (e: any) {
      return txt(`⚠️ Failed to delete query card: ${e.message}`);
    }
  }
);

// ─── Tool 17: Edit Discovery Thesis ───────────────────────────
server.tool(
  "edit_discovery_thesis",
  `Edit an existing discovery thesis based on its TIC ID. Use this to correct calculations or update the thesis narrative.`,
  {
    ticId: z.string().describe("The TIC ID of the discovery thesis to edit"),
    thesis: z.string().describe("The updated full discovery thesis text (markdown supported)"),
    researcherName: z.string().describe("Name of the researcher/AI updating the thesis"),
  },
  async ({ ticId, thesis, researcherName }) => {
    try {
      const res = await fetch(`${API_URL}/api/discovery-thesis/${encodeURIComponent(ticId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thesis, researcherName }),
      });
      if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
      const data = await res.json();
      return txt(`📝 Successfully updated ${data.updatedCount} discovery thesis(es) for TIC ${ticId}.`);
    } catch (e: any) {
      return txt(`⚠️ Failed to edit discovery thesis: ${e.message}`);
    }
  }
);

// ─── Tool 18: Delete Discovery Thesis ─────────────────────────
server.tool(
  "delete_discovery_thesis",
  `Delete an existing discovery thesis based on its TIC ID. Use this to retract a false positive or mistake from the Discovery Lab.`,
  { ticId: z.string().describe("The TIC ID of the discovery thesis to delete") },
  async ({ ticId }) => {
    try {
      const res = await fetch(`${API_URL}/api/discovery-thesis/${encodeURIComponent(ticId)}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
      const data = await res.json();
      return txt(`🗑️ Successfully deleted ${data.deletedCount} discovery thesis(es) for TIC ${ticId}.`);
    } catch (e: any) {
      return txt(`⚠️ Failed to delete discovery thesis: ${e.message}`);
    }
  }
);

// ─── Tool 19: Create Rejection Thesis ─────────────────────────
server.tool(
  "create_rejection_thesis",
  `Create a detailed "Rejection Thesis" to document exactly why a TIC ID was rejected (e.g., failed False Positive Death Test, V-shape detected, etc.). Use this strictly for rejected candidates to maintain the False Positive Archive.`,
  {
    ticId: z.string().describe("The TIC ID of the rejected candidate"),
    thesis: z.string().describe("The detailed explanation of why it was rejected (markdown supported)"),
    researcherName: z.string().describe("Name of the researcher/AI logging the rejection"),
  },
  async ({ ticId, thesis, researcherName }) => {
    try {
      const data = await apiPost("/api/rejection-thesis", { ticId, thesis, researcherName });
      return txt(`❌ REJECTION THESIS RECORDED!\n\nTIC ${ticId} has been formally logged in the False Positive Archive.\nThesis ID: ${data.id}\nResearcher: ${researcherName}`);
    } catch (e: any) {
      return txt(`⚠️ Failed to create rejection thesis: ${e.message}`);
    }
  }
);

// ─── Tool 20: Edit Rejection Thesis ───────────────────────────
server.tool(
  "edit_rejection_thesis",
  `Edit an existing rejection thesis based on its TIC ID. Use this to update the detailed reasoning.`,
  {
    ticId: z.string().describe("The TIC ID of the rejection thesis to edit"),
    thesis: z.string().describe("The updated detailed reasoning (markdown supported)"),
    researcherName: z.string().describe("Name of the researcher/AI updating the thesis"),
  },
  async ({ ticId, thesis, researcherName }) => {
    try {
      const res = await fetch(`${API_URL}/api/rejection-thesis/${encodeURIComponent(ticId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thesis, researcherName }),
      });
      if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
      const data = await res.json();
      return txt(`📝 Successfully updated ${data.updatedCount} rejection thesis(es) for TIC ${ticId}.`);
    } catch (e: any) {
      return txt(`⚠️ Failed to edit rejection thesis: ${e.message}`);
    }
  }
);

// ─── Tool 21: Delete Rejection Thesis ─────────────────────────
server.tool(
  "delete_rejection_thesis",
  `Delete an existing rejection thesis based on its TIC ID.`,
  { ticId: z.string().describe("The TIC ID of the rejection thesis to delete") },
  async ({ ticId }) => {
    try {
      const res = await fetch(`${API_URL}/api/rejection-thesis/${encodeURIComponent(ticId)}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
      const data = await res.json();
      return txt(`🗑️ Successfully deleted ${data.deletedCount} rejection thesis(es) for TIC ${ticId}.`);
    } catch (e: any) {
      return txt(`⚠️ Failed to delete rejection thesis: ${e.message}`);
    }
  }
);

// ─── Tool 22: List Discovery Theses with All Data ─────────────
server.tool(
  "list_discovery_theses_full_data",
  `List all confirmed exoplanet discovery theses, including the FULL detailed markdown text of the thesis.`,
  { limit: z.number().optional().default(20).describe("Max discoveries to return") },
  async ({ limit }) => {
    const data = await apiGet(`/api/discoveries?limit=${limit}`);
    if (!data.discoveries || data.discoveries.length === 0) return txt("🔭 No discoveries recorded yet.");
    return txt(JSON.stringify(data.discoveries, null, 2));
  }
);

// ─── Tool 23: List Successful TIC IDs ─────────────────────────
server.tool(
  "list_successful_tic_ids",
  `List just the TIC IDs of all successful discoveries (accepted exoplanets).`,
  {},
  async () => {
    const data = await apiGet("/api/successful-tics");
    return txt(`✅ Successful TIC IDs:\n${JSON.stringify(data.tics)}`);
  }
);

// ─── Tool 24: List All TIC IDs ────────────────────────────────
server.tool(
  "list_all_tic_ids",
  `List ALL TIC IDs that have been queried or analyzed, including both accepted and rejected ones.`,
  {},
  async () => {
    const data = await apiGet("/api/all-tics");
    return txt(`🌐 All Analyzed TIC IDs:\n${JSON.stringify(data.tics)}`);
  }
);

// ─── Tool 25: List False Positive Theses ──────────────────────
server.tool(
  "list_false_positive_theses",
  `List all detailed false positive rejection theses, including the exact reasons and data for rejection.`,
  { limit: z.number().optional().default(20).describe("Max rejections to return") },
  async ({ limit }) => {
    const data = await apiGet(`/api/rejection-theses?limit=${limit}`);
    if (!data.theses || data.theses.length === 0) return txt("✅ No rejections recorded yet.");
    return txt(JSON.stringify(data.theses, null, 2));
  }
);

// ─── Tool 26: List Detailed Query Streams ─────────────────────
server.tool(
  "list_detailed_query_streams",
  `List the detailed query stream, returning the full JSON data for all recent analysis attempts.`,
  { limit: z.number().optional().default(20).describe("Max queries to return") },
  async ({ limit }) => {
    const data = await apiGet(`/api/query-stream?limit=${limit}`);
    if (!data.queries || data.queries.length === 0) return txt("📭 No queries in the stream.");
    return txt(JSON.stringify(data.queries, null, 2));
  }
);

// ─── Tool 27: List Leaderboard ────────────────────────────────
server.tool(
  "list_leaderboard",
  `Alias for get_leaderboard. List the global leaderboard of researchers.`,
  {},
  async () => {
    const data = await apiGet("/api/leaderboard");
    if (!data.leaderboard || data.leaderboard.length === 0) return txt("🏆 Leaderboard is empty.");
    return txt(JSON.stringify(data.leaderboard, null, 2));
  }
);

// ─── Tool 28: Run Python Verification Functions ───────────────
server.tool(
  "run_python_verification",
  `Run hard-coded Python Verification Functions (VFs) to test for Resonance Masking and Harmonic Sweeping. Use this to ensure the estimated orbital period is mathematically valid and not a multiple of the 13.7-day TESS downlink cycle.`,
  {
    ticId: z.string().describe("The TIC ID being analyzed"),
    period: z.number().describe("The estimated orbital period in days"),
  },
  async ({ ticId, period }) => {
    try {
      const data = await apiPost("/api/verify-period", { ticId, period });
      if (data.status === "error") throw new Error(data.message);
      
      let report = `🐍 Python Verification Results for TIC ${ticId}\n`;
      report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      report += `• Tested Period: ${data.tested_period} days\n`;
      report += `• Resonance Alert: ${data.resonance_alert ? "⚠️ TRUE (Artifact Likely)" : "✅ FALSE (Clear)"}\n`;
      report += `• TESS Downlink Diff: ${data.resonance_diff_days} days\n\n`;
      report += `Harmonic Sweeping (SNR):\n`;
      report += `• P (Original): ${data.harmonic_sweeping.snr_P}\n`;
      report += `• P/2 (Half): ${data.harmonic_sweeping.snr_half_P}\n`;
      report += `• P*2 (Double): ${data.harmonic_sweeping.snr_double_P}\n\n`;
      
      if (data.resonance_alert) {
        report += `❌ MANDATORY REJECTION: This period aligns with the 13.7-day TESS downlink artifact. You MUST reject this candidate via create_rejection_thesis.\n`;
      } else {
        report += `✅ PASS: No resonance artifact detected. Please verify which harmonic yields the truest SNR.\n`;
      }
      
      return txt(report);
    } catch (e: any) {
      return txt(`⚠️ Python VF Error: ${e.message}`);
    }
  }
);

// ─── Start Server ──────────────────────────────────────────────
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("🔭 Sarkar ExoHunter MCP Server running on stdio");
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
