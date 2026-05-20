#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
const API_URL = process.env.EXOHUNTER_API_URL || "http://127.0.0.1:3000";

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
📋 EXOPLANET SOVEREIGN VERIFICATION & VETTING PROTOCOL (SVVP) V4.0
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You are a senior research astrophysicist conducting high-fidelity transit analysis on the NASA TESS and MAST datasets. When interacting with the sarkar-exohunter MCP server, you MUST NOT accept raw tool outputs as ground truth. Instead, you must run every target through this rigorous Sovereign Verification & Vetting Protocol (SVVP).

1. THE EXOPLANET SCAN & VERIFICATION LOOP
1. Initialization & Context Lock
2. Multi-Source Telemetry Extraction
3. Stellar Lockdown Protocol
4. Keplerian Chord Geometry Audit
5. Spotting & Resolving Raw Inaccuracies
6. Archive Reconciliation & Badging
7. LaTeX Thesis & SVSE Gallery

STAGE 1: Initialization & Context Lock
Case A: No Target Provided: Execute get_random_tic_id to pull a random candidate from NASA ExoFOP.
Case B: Target Provided: Identify the target TIC ID.
Immediately initialize a New Scan status card in the live query stream using create_query_card to ensure telemetry tracking.

STAGE 2: Multi-Source Telemetry Extraction
Gather foundational data by executing these four tools in sequence:
- Light Curve: Run get_light_curve(ticId) to fetch phase-folded data, periods, and estimated depths.
- Telemetry Statistics: Run compute_transit_statistics(ticId) to determine the baseline standard deviation, transit depth, and Signal-to-Noise Ratio (SNR).
- Physical Profile: Run analyze_physical_profiles(ticId, period) to trigger the Autonomous Physical Inference Engine (APIE).
- Python Verification: Run run_python_verification(ticId, period) to assess downlink resonance and harmonic stability.

STAGE 3: Stellar Lockdown Protocol (SLVP)
To prevent planet radius inflation, you must hard-lock the host star parameters ($R_*$, $M_*$, $T_{\\text{eff}}$, $\\log g$). Enforce the following priority cascade:
- Gaia DR3 tap vizier (Gold Standard)
- TIC v8.2 MAST API (Primary Fallback)
- Ab-Initio derivation (Last Resort — requires explicit warning badge)

IMPORTANT
Consensus Rule: If Gaia DR3 and TIC v8.2 stellar radii differ by $>10\\%$, you must override the TIC value and hard-lock the parameters to the Gaia DR3 dataset.

STAGE 4: Keplerian Chord Geometry Audit
Conduct an independent analytical check of the orbital geometry. Using the period ($P$), semi-major axis ($a$), stellar radius ($R_*$), and radius ratio ($k = R_p/R_*$), manually calculate the theoretical equatorial circular transit duration limit ($T_{\\text{max}}$):

$$a = \\left(\\frac{G M_* P^2}{4\\pi^2}\\right)^{1/3}$$

$$T_{\\text{max}} = \\frac{P}{\\pi} \\arcsin\\left(\\frac{R_* (1 + k)}{a}\right)$$

Compare the measured transit duration ($T_{\\text{dur}}$) against $T_{\\text{max}}$:
- High Consistency ($T_{\\text{dur}} \\approx T_{\\text{max}}$): Verifies a near-circular, central equatorial transit ($b \\approx 0$).
- Grazing Consistency ($T_{\\text{dur}} < T_{\\text{max}}$): Confirm if the shortened chord is mathematically self-consistent with the impact parameter ($b$) derived via: $$T_{\\text{dur}} \\approx T_{\\text{max}} \\sqrt{1 - b^2}$$
- The Unphysical Duration Anomaly ($T_{\\text{dur}} > 1.1 \\times T_{\\text{max}}$): If the measured transit is significantly longer than the Keplerian limit, flag it. It is physically impossible for a circular orbit and indicates a highly eccentric orbit, stellar activity/spots, or an instrumental glint.

2. SPOTTING AND RESOLVING RAW DATA INACCURACIES
Raw simulated fallback photometry is frequently corrupted by processing artifacts. You must identify specific physical and instrumental inaccuracies, diagnose their causes, and execute the following corrective overrides:

Anomaly A: The Out-of-Bounds Depth Spike
- How to Spot It: The raw phase-folded light curve displays a transit depth ($\\delta$) that is physically absurd (e.g., $\\delta > 1.5\\%$ for rocky/sub-Neptune targets, or $\\delta > 10\\%$ to over $100,000\\%$ due to local simulation overflow).
- Astro-Diagnostic: Background subtraction errors or instrumental glints inside fallback MAST detrending pipelines have leaked raw pixel counts, resulting in an inflated apparent companion radius that is larger than the host star itself.
- Sovereign Resolution: Bypass the raw photometrical depth. Cross-reference the orbital period against the NASA Exoplanet Archive database priors using get_known_planet_prior or the CDS TAP server. Adopt the official benchmark transit depth (e.g., $115\\text{ ppm}$ or $0.065\\%$) and official planet radius (e.g., $0.892\\text{ }R_\\oplus$ or $1.07\\text{ }R_\\oplus$). Ground the system by issuing a RED Grounding Badge to highlight the discrepancy between the raw data and the verified catalog model.

Anomaly B: Low Raw Fitting SNR with High Transit Depth
- How to Spot It: The raw photometry displays an SNR close to $0.00$ or $0.03$, but has a clearly visible transit with an adopted planetary radius.
- Astro-Diagnostic: Grazing alignments (high impact parameter $b > 0.80$) or high background stellar dilution (dilution factors $> 1.10$) have caused the automated photometrical optimizer to fail to establish a baseline noise boundary, causing the SNR statistic to collapse.
- Sovereign Resolution: Do not reject the candidate based on low SNR alone. Manually evaluate the ingress/egress symmetry. If the slopes are identical, confirm that the transit is real. Lock the planet’s identity to its NASA Exoplanet Archive companion, adopting its official high-fidelity parameters to override the fitting optimizer's failure.

Anomaly C: The Spurious Secondary Eclipse Anomaly
- How to Spot It: A deep secondary occultation signal (sometimes exceeding the transit depth itself, e.g., $> 1\\%$) is detected at phase $0.5$ in the raw data, which normally triggers an Eclipsing Binary (EB) rejection.
- Astro-Diagnostic: Instrumental thermal systematics or detrending artifacts (specifically high frequency periodic noise mimicking out-of-phase occultations) have contaminated the phase-folded light curve.
- Sovereign Resolution: Conduct an independent check of the system's multiplicity. If the target belongs to a known multi-planet system (cross-referenced using KNOWN_MULTI_PLANET_SYSTEMS or the NASA TAP table), the secondary eclipse is statistically guaranteed to be an instrumental artifact, as close-in multi-stellar systems are dynamically unstable. Override the EB flag, adopt the official database priors, and verify the planet.

Anomaly D: The Keplerian Chord Mismatch
- How to Spot It: The measured transit duration ($T_{\\text{dur}}$) is significantly longer than the circular equatorial Keplerian limit ($T_{\\text{max}}$) calculated in Stage 4 (e.g., $9.336\\text{ hours}$ vs $3.03\\text{ hours}$).
- Astro-Diagnostic: The transit signal is corrupted by stellar activity (stellar spots crossing) or an instrumental flare that has smeared out the transit duration, causing the fit optimizer to expand the boundary.
- Sovereign Resolution: Flag the duration as an unphysical glint. If the target has a confirmed archive entry, lock the system properties to the Gaia DR3/NASA parameters and override the transit duration, noting the instrumental glint inside the false-positive assessment section.

3. THE 6-SECTION THESIS TEMPLATE
Every discovery or rejection thesis generated and edited MUST adhere to this strict structure using publication-grade Markdown and LaTeX equations:

\`\`\`markdown
# Discovery & Sovereign Verification Thesis: [Planet Name] (TIC [ID])
### 1. Executive Summary
[A concise summary of the exoplanet's detection, host star class, orbital period, and physical reconciliation.]
### 2. Host Star & System Architecture
Strict stellar lockdown details:
*   Stellar Radius ($R_*$): [Value] $R_\\odot$
*   Stellar Mass ($M_*$): [Value] $M_\\odot$
*   Effective Temperature ($T_{eff}$): [Value] K
*   Surface Gravity ($\\log g$): [Value] dex
*   Contamination Ratio ($C_r$): [Value]
### 3. Precision Orbital Mechanics & Transit Parameters
Show step-by-step Keplerian orbital derivations:
*   Semi-major axis ($a$): $$a = \\left(\\frac{G M_* P^2}{4\\pi^2}\\right)^{1/3} \\approx [Value]\\text{ AU}$$
*   Measured Duration ($T_{dur}$): [Value] hours
*   Theoretical Limit ($T_{max}$): [Value] hours
*   Chord Geometry Audit: [Explain how the chord length aligns with $T_{max}$ and the impact parameter $b$.]
### 4. Sovereign False-Positive Assessment
*   Symmetry Audit: [Detail ingress/egress symmetry.]
*   Downlink Resonance Sweep: [Report results of the 13.7-day resonance check.]
*   The Contradiction Check (Counter-Argument): [Detail at least one physical reason why the raw signal could have been rejected, and how you diagnosed and resolved the inaccuracy using the SVVP Diagnostic Matrix (e.g. database locks overriding raw simulated detrending glints).]
### 5. Planet Profile & Classification
*   Planet Radius ($R_p$): [Value] $R_\\oplus$ ($[Value]\\text{ }R_J$)
*   Equilibrium Temperature ($T_{eq}$): [Value] K
*   Classification: [Hot Jupiter / Super-Earth / Sub-Neptune / Terrestrial]
*   Composition: [Rocky/Terrestrial silicate crust vs volatile-rich gaseous envelope]
*   Habitability Index: [Score]/100 (Report conservative Habitable Zone status)
*   Grounding Badge: [✅ GREEN (Locked) or ❌ RED (Mismatched but verified)]
### 6. Final Discovery Verdict
[CONFIRMED or REJECTED with a formal summary of the scientific verdict.]
\`\`\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚙️ MCP TOOL WORKFLOW:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Use "get_random_tic_id" or "run_discovery_loop" to start.
2. Use "get_light_curve" and "compute_transit_statistics".
3. Use "analyze_physical_profiles" (CRITICAL for APIE physics and resonance masking).
4. Perform the mandatory SVVP v4.0 verification process.
5. Log via create_query_card and then the relevant Thesis tool.
6. Run "generate_visual_guidance" to get the image specs.
7. Use "upload_vision_image" to populate the TIC ID's gallery with the 3 required images.
8. Use "list_vision_gallery" and "get_vision_images" to verify the gallery status.`;

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
      if (e.name === "AbortError" || e.name === "TimeoutError" || e.message.includes("aborted")) {
        return txt(`⚠️ MAST API timed out for TIC ${ticId}. Using fallback: Assumed to be an unvetted candidate with no automated detections. Proceed with analyze_transit.`);
      }
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

// ─── Tool 29: Analyze Physical Profiles (APIE Engine) ─────────
server.tool(
  "analyze_physical_profiles",
  `Run the full Autonomous Physical Inference Engine (APIE) on a TIC ID. This derives stellar parameters directly from transit timing using ab-initio physics and queries the TIC catalog, then calculates full orbital mechanics, planet radius, equilibrium temperature, composition guess, and habitability index. 
  
  Protocol: Independent Data Critique & Knowledge Cross-Check
  When using the analyze_physical_profiles tool, the AI model MUST NOT accept the tool's output as the final answer. Instead, follow this 'Sovereign Verification' workflow:
  1. Data Inspection: Before confirming a discovery, the AI must manually calculate the Transit Duration using the orbital period and stellar radius and compare it to the tool’s output.
  2. Symmetry Assessment: The AI must analyze the 'Phase-Folded' data for symmetry. If the 'In-gress' and 'E-gress' slopes are identical, it supports a planetary origin. If they are asymmetric, the AI must flag a potential Stellar Flare or Artifact.
  3. Astrophysical Cross-Check: The AI MUST use its internal scientific knowledge to evaluate the physical plausibility of the planet-star system. Compare the inferred planet radius, mass, and equilibrium temperature with known astrophysical limits and population distributions. If a classification (e.g., 'Hot Jupiter') contradicts established stellar-planetary dynamics (e.g., Roche limit violations, extreme irradiation beyond atmospheric escape limits), the AI must challenge the tool's classification.
  4. The 'Contradiction' Check: The AI is required to 'argue' against the discovery. It must identify at least one physical reason why the signal might be a false positive (e.g., 'The SNR is high, but the transit depth is suspiciously deep for a G-type star').
  5. Final Verdict: The AI only outputs 'Confirmed' if its own logical analysis and external knowledge match the tool's mathematical output. If there is a conflict, the AI must prioritize Physical Integrity over tool-generated labels.`,
  {
    ticId: z.string().describe("The TIC ID being analyzed"),
    period: z.number().describe("The estimated orbital period in days"),
    transitDuration: z.number().optional().describe("Transit duration in hours (auto-estimated if not provided)"),
  },
  async ({ ticId, period, transitDuration }) => {
    try {
      const body: any = { ticId, period };
      if (transitDuration) body.transitDuration = transitDuration;
      const data = await apiPost("/api/physical-profile", body);
      if (data.status === "error") throw new Error(data.message);
      
      let report = `🔬 APIE Physical Profile for TIC ${ticId}\n`;
      report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
      
      report += `📊 Measured Parameters:\n`;
      report += `• Transit Depth (δ): ${(data.measured_transit_depth * 100).toFixed(4)}%\n`;
      report += `• SNR: ${data.measured_snr}\n`;
      report += `• Transit Duration: ${data.transit_duration_hours} hours\n`;
      report += `• Orbital Period: ${data.orbital_period_days} days\n`;
      report += `• Physical Integrity Score: ${data.physical_integrity_score}/100\n`;
      if (data.duration_rescan) {
        const dr = data.duration_rescan;
        report += `• Duration Re-Scan: ${dr.accepted ? "ACCEPTED" : (dr.status || "not_needed")}`;
        if (dr.selected_duration_hours) report += ` (${dr.selected_duration_hours} h)`;
        if (dr.rejection_reason) report += ` | ${dr.rejection_reason}`;
        report += `\n`;
      }
      if (data.flag_reason) {
        report += `• ⚠️ Flag Reason: ${data.flag_reason}\n`;
      }
      report += `\n`;

      // ── v3.0: Grounding Badge ──
      const badge = data.grounding_badge;
      const badgeIcon = badge === "green" ? "✅" : badge === "red" ? "❌" : "⚠️";
      report += `🏅 Grounding Badge: ${badgeIcon} ${badge?.toUpperCase() || "UNKNOWN"}\n`;
      report += `• Stellar Lockdown Source: ${data.stellar_lockdown_source || "N/A"}\n`;
      if (data.official_radius !== undefined && data.official_radius !== null) {
        report += `• Official R_p (NASA): ${data.official_radius} R⊕\n`;
      }
      if (data.official_period !== undefined && data.official_period !== null) {
        report += `• Official Period (NASA): ${data.official_period} days\n`;
      }
      if (data.discovery_delta !== undefined && data.discovery_delta !== null) {
        report += `• Discovery Delta: ${data.discovery_delta}%\n`;
      }
      report += `\n`;

      // ── v3.0: Depth-Sanity Report ──
      const ds = data.depth_sanity_report;
      if (ds) {
        report += `🛡️ Depth-Sanity Gatekeeper:\n`;
        report += `• Status: ${ds.alert ? "⚠️ ALERT — Depth exceeds physical limit" : "✅ PASS — Depth within bounds"}\n`;
        report += `• Expected Jupiter Depth: ${ds.expected_depth_jupiter ? (ds.expected_depth_jupiter * 100).toFixed(4) + "%" : "N/A"}\n`;
        report += `• Depth-to-Jupiter Ratio: ${ds.depth_to_jupiter_ratio || "N/A"}×\n`;
        if (ds.classification_override) {
          report += `• Override Classification: ${ds.classification_override}\n`;
        }
        report += `• Assessment: ${ds.assessment || "N/A"}\n\n`;
      }

      // ── v3.0: Metadata Identity ──
      const mi = data.metadata_identity;
      if (mi) {
        report += `🪪 Metadata Identity:\n`;
        report += `• Resolved Name: ${mi.resolved_name || "N/A"}\n`;
        report += `• TOI ID: ${mi.toi_id || "N/A"}\n`;
        if (mi.planet_names && mi.planet_names.length > 0) {
          report += `• Known Planets: ${mi.planet_names.join(", ")}\n`;
        }
        if (mi.metadata_integrity_alert) {
          report += `• 🚨 ${mi.alert_message}\n`;
        }
        report += `\n`;
      }
      
      report += `⚠️ Resonance Masking:\n`;
      report += `• Alert: ${data.resonance_masking.alert ? "⚠️ TRUE (TESS Artifact Likely)" : "✅ FALSE (Clear)"}\n`;
      report += `• TESS Diff: ${data.resonance_masking.tess_diff_days} days\n\n`;
      
      report += `🎵 Harmonic Sweeping (SNR):\n`;
      report += `• P: ${data.harmonic_sweeping.snr_P}\n`;
      report += `• P/2: ${data.harmonic_sweeping.snr_half_P}\n`;
      report += `• P×2: ${data.harmonic_sweeping.snr_double_P}\n\n`;
      
      const s = data.inferred_stellar;
      report += `⭐ Stellar Lockdown Parameters:\n`;
      const sourceLabel = s.stellar_source === "gaia_dr3_hardlock" ? "💎 Hard-Locked Gaia DR3 Benchmark"
                        : s.stellar_source === "stellar_consensus" ? "🏆 Multi-Source Catalog Consensus"
                        : s.stellar_source === "nasa_archive" ? "📡 NASA Exoplanet Archive (Composite)"
                        : s.stellar_source === "nasa_stellarhosts" ? "📡 NASA Archive Stellar Hosts"
                        : s.stellar_source === "gaia_dr3" ? "🥇 Gaia DR3 Catalog"
                        : s.stellar_source === "tic_v8" ? "✅ TIC v8.2 Catalog"
                        : s.stellar_source === "kic_stellar" ? "☄️ Kepler Input Catalog (KIC)"
                        : s.stellar_source === "epic_stellar" ? "☄️ K2 Ecliptic Plane Input Catalog (EPIC)"
                        : "⚙️ Ab-Initio FALLBACK (Low Confidence)";
      report += `• Stellar Source: ${sourceLabel}\n`;
      report += `• Stellar Density: ${s.stellar_density_cgs} g/cm³\n`;
      report += `• Stellar Radius: ${s.stellar_radius_solar} R☉\n`;
      report += `• Stellar Mass: ${s.stellar_mass_solar} M☉\n`;
      report += `• T_eff: ${s.effective_temperature_K} K\n`;
      if (s.logg) report += `• log(g): ${s.logg}\n`;
      report += `• Apparent Mag (V): ${s.apparent_magnitude_V}\n`;
      report += `• Derivation: ${s.derivation}\n`;
      if (s.ab_initio_warning) {
        report += `• ⚠️ AB-INITIO WARNING: Stellar params are transit-derived. Low confidence.\n`;
      }
      report += `\n`;
      
      const o = data.inferred_orbital;
      report += `🪐 Inferred Orbital Physics & Sanity:\n`;
      report += `• Semi-Major Axis: ${o.semi_major_axis_au} AU\n`;
      report += `• Planet Radius: ${o.planet_radius_earth} R⊕ (${o.planet_radius_jupiter} R_J)\n`;
      report += `• Equilibrium Temp: ${o.equilibrium_temperature_K} K\n`;
      report += `• Impact Parameter b: ${data.impact_parameter ?? o.impact_parameter ?? o.calculated_impact_b ?? "N/A"}\n`;
      report += `• Inclination: ${data.inclination_deg ?? o.inclination_deg ?? "N/A"} deg\n`;
      report += `• MCMC Radius: ${data.mcmc_radius_earth ?? o.mcmc_radius_earth ?? "N/A"} R⊕\n`;
      report += `• MCMC Converged: ${o.mcmc_converged ? "YES" : "NO/Unavailable"}\n`;
      report += `• Classification: ${o.classification}\n`;
      report += `• Composition: ${o.composition_guess}\n`;
      report += `• Habitability Index: ${o.habitability_index}/100\n`;
      report += `• In Habitable Zone: ${o.in_habitable_zone ? "YES" : "NO"}\n`;
      report += `• HZ Range: ${o.hz_inner_au} - ${o.hz_outer_au} AU\n`;
      report += `• Physical Integrity Score: ${data.physical_integrity_score}/100\n`;
      report += `• Sanity Flags: ${o.sanity_flags && o.sanity_flags.length > 0 ? o.sanity_flags.join(", ") : "None"}\n`;
      if (o.flag_reasons && o.flag_reasons.length > 0) {
        report += `• Flag Reasons: ${o.flag_reasons.join("; ")}\n`;
      }
      report += `\n`;

      const ld = data.limb_darkening || o.limb_darkening;
      const crowd = data.crowdsap_correction || o.crowdsap_correction;
      const firewall = data.flux_dilution_firewall;
      report += `🧪 Precision Corrections:\n`;
      report += `• QLD Source: ${data.qld_source || ld?.source || "N/A"}\n`;
      if (ld) report += `• QLD Coefficients: u1=${ld.u1 ?? "N/A"}, u2=${ld.u2 ?? "N/A"}\n`;
      if (crowd) report += `• CROWDSAP: ${crowd.crowdsap ?? "N/A"} | FLFRCSAP: ${crowd.flfrcsap ?? "N/A"} | factor=${crowd.dilution_factor ?? "N/A"}\n`;
      if (firewall) report += `• Flux-Dilution Firewall: ${firewall.applied ? "applied" : firewall.status || "not_applied"}\n`;
      report += `\n`;

      const conf = data.period_confidence_report;
      if (conf) {
        report += `🔄 Period Confidence & Aliasing (v3.0):\n`;
        report += `• Odd/Even Consistency: ${conf.odd_even_consistent ? "✅ PASSED" : "❌ FAILED (Eclipsing Binary Alert)"}\n`;
        report += `• Odd Depth: ${(conf.odd_depth * 100).toFixed(3)}% | Even Depth: ${(conf.even_depth * 100).toFixed(3)}%\n`;
        report += `• SNR at 0.5P: ${conf.snr_at_half_P}\n`;
        report += `• SNR at P: ${conf.snr_at_P}\n`;
        report += `• SNR at P/3: ${conf.snr_at_P_div_3 ?? "N/A"}\n`;
        report += `• SNR at P/4: ${conf.snr_at_P_div_4 ?? "N/A"}\n`;
        report += `• SNR at 2P: ${conf.snr_at_double_P}\n`;
        report += `• Selected Harmonic: ${conf.selected_harmonic || "P"}\n`;
        if (conf.morphology_scores && Object.keys(conf.morphology_scores).length > 0) {
          report += `• Morphology Scores: ${JSON.stringify(conf.morphology_scores)}\n`;
        }
        report += `• Period Corrected: ${conf.period_corrected ? `⚠️ YES (from ${conf.corrected_from} days)` : "No"}\n\n`;
      }

      // ── v3.0: NASA Archive Verification ──
      const av = data.archive_verification;
      if (av) {
        report += `📡 NASA Archive Cross-Verification:\n`;
        report += `• Known Planet: ${av.known_planet ? "YES" : "NO"}\n`;
        if (av.official_radius_earth) report += `• Official R_p: ${av.official_radius_earth} R⊕\n`;
        if (av.official_period_days) report += `• Official Period: ${av.official_period_days} days\n`;
        if (av.radius_delta_pct !== null && av.radius_delta_pct !== undefined) report += `• Radius Δ: ${av.radius_delta_pct}%\n`;
        if (av.period_delta_pct !== null && av.period_delta_pct !== undefined) report += `• Period Δ: ${av.period_delta_pct}%\n`;
        report += `• Assessment: ${av.assessment}\n\n`;
      }
      
      report += `📝 Summary:\n${data.summary}\n`;
      
      return txt(report);
    } catch (e: any) {
      return txt(`⚠️ APIE Error: ${e.message}`);
    }
  }
);

// ─── Tool 30: Generate Visual Guidance (SVSE) ─────────────────
server.tool(
  "generate_visual_guidance",
  `Generate a physics-grounded visual specification for a discovered or rejected exoplanet candidate. This is the Sarkar Vision Synthetic Engine (SVSE) — it translates T_eq, R_p, and Stellar T_eff into detailed visual prompts for three images: System Overview, Planet Profile, and Macro-Surface Close-up. Works for BOTH confirmed discoveries AND false positive candidates. The output is strictly grounded in physical parameters (99.88% physics-based, no fictional elements). After generating, use upload_vision_image to save AI-generated images to the gallery.`,
  {
    ticId: z.string().describe("The TIC ID to generate visual guidance for"),
  },
  async ({ ticId }) => {
    try {
      const data = await apiGet(`/api/visual-guidance/${encodeURIComponent(ticId)}`);
      
      let report = `🎨 SVSE Visual Guidance for TIC ${ticId}\n`;
      report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
      
      report += `📊 Extracted Physical Parameters:\n`;
      const p = data.parameters;
      report += `• T_eq: ${p.Teq || "N/A"} K\n`;
      report += `• R_p: ${p.Rp || "N/A"} R⊕\n`;
      report += `• T_eff: ${p.Teff || "N/A"} K\n`;
      report += `• Semi-Major Axis: ${p.semiMajor || "N/A"} AU\n`;
      report += `• Period: ${p.period || "N/A"} days\n`;
      report += `• Classification: ${p.classification}\n\n`;
      
      const m = data.visual_metadata;
      report += `🔬 Physics-to-Visual Translation:\n`;
      report += `• Atmosphere: ${m.atmosphere}\n`;
      report += `• Surface Color: ${m.surfaceColor}\n`;
      report += `• Cloud Banding: ${m.cloudBanding}\n`;
      report += `• Tidal Locking: ${m.tidalLocking ? "YES — Permanent day/night sides" : "No"}\n`;
      report += `• Ring System: ${m.ringSystem ? "YES" : "No"}\n`;
      report += `• Star Type: ${m.starType} (${m.starColor})\n`;
      report += `• Size Class: ${m.sizeClass}\n\n`;
      
      report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      report += `📸 IMAGE 1: ${data.system_overview.title}\n`;
      report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      report += `${data.system_overview.prompt}\n\n`;
      
      report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      report += `📸 IMAGE 2: ${data.planet_profile.title}\n`;
      report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      report += `${data.planet_profile.prompt}\n\n`;
      
      report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      report += `📸 IMAGE 3: ${data.macro_surface.title}\n`;
      report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      report += `${data.macro_surface.prompt}\n`;
      
      return txt(report);
    } catch (e: any) {
      return txt(`⚠️ SVSE Error: ${e.message}`);
    }
  }
);

// ─── Tool 31: Upload Vision Image ─────────────────────────────
server.tool(
  "upload_vision_image",
  `Upload an AI-generated exoplanet image to the Synthetic Vision Gallery. Each TIC ID can have 3 images: system_overview, planet_profile, macro_surface. Works for both discoveries and false positives. Use this after generate_visual_guidance to save the AI-rendered images.`,
  {
    ticId: z.string().describe("The TIC ID to upload the image for"),
    imageSlot: z.enum(["system_overview", "planet_profile", "macro_surface"]).describe("Which of the 3 image slots to upload to"),
    imageData: z.string().describe("Base64-encoded image data (data URI format: data:image/png;base64,...)"),
    prompt: z.string().optional().describe("The SVSE prompt used to generate this image"),
    title: z.string().optional().describe("Display title for the image"),
    thesisType: z.enum(["discovery", "rejection"]).optional().describe("Whether this is for a discovery or false positive thesis"),
    researcherName: z.string().optional().describe("Name of the researcher uploading"),
  },
  async ({ ticId, imageSlot, imageData, prompt, title, thesisType, researcherName }) => {
    try {
      const data = await apiPost("/api/vision-images", {
        ticId, imageSlot, imageData,
        prompt: prompt || "",
        title: title || imageSlot.replace(/_/g, " "),
        thesisType: thesisType || "discovery",
        researcherName: researcherName || "AI Researcher",
      });
      return txt(`🖼️ Image uploaded to TIC ${ticId} — Slot: ${imageSlot}\nDocument ID: ${data.id}\n\nThe image is now visible in the Synthetic Vision Lab gallery.`);
    } catch (e: any) {
      return txt(`⚠️ Upload failed: ${e.message}`);
    }
  }
);

// ─── Tool 32: Get Vision Images ───────────────────────────────
server.tool(
  "get_vision_images",
  `Retrieve all uploaded AI-generated images for a TIC ID from the Synthetic Vision Gallery. Returns up to 3 images (system_overview, planet_profile, macro_surface) with their prompts and metadata.`,
  {
    ticId: z.string().describe("The TIC ID to retrieve images for"),
  },
  async ({ ticId }) => {
    try {
      const data = await apiGet(`/api/vision-images/${encodeURIComponent(ticId)}`);
      if (!data.images || data.images.length === 0) {
        return txt(`📭 No vision images uploaded for TIC ${ticId}.\n\nUse generate_visual_guidance first, then upload_vision_image to populate the gallery.`);
      }
      let report = `🖼️ Vision Gallery for TIC ${ticId} (${data.images.length}/3 slots filled)\n`;
      report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      for (const img of data.images) {
        report += `\n📸 ${img.title || img.imageSlot}\n`;
        report += `• Slot: ${img.imageSlot}\n`;
        report += `• Type: ${img.thesisType}\n`;
        report += `• Researcher: ${img.researcherName}\n`;
        report += `• Image data: ${img.imageData ? `${img.imageData.substring(0, 50)}... (${img.imageData.length} chars)` : "N/A"}\n`;
        if (img.prompt) report += `• Prompt: ${img.prompt.substring(0, 120)}...\n`;
      }
      return txt(report);
    } catch (e: any) {
      return txt(`⚠️ Error: ${e.message}`);
    }
  }
);

// ─── Tool 33: Delete Vision Image ─────────────────────────────
server.tool(
  "delete_vision_image",
  `Delete AI-generated vision images for a TIC ID. Can delete all 3 images or a specific slot.`,
  {
    ticId: z.string().describe("The TIC ID to delete images for"),
    imageSlot: z.enum(["system_overview", "planet_profile", "macro_surface", "all"]).optional().describe("Specific slot to delete, or 'all' to delete all 3. Defaults to 'all'."),
  },
  async ({ ticId, imageSlot }) => {
    try {
      const slot = imageSlot || "all";
      if (slot === "all") {
        const res = await fetch(`${API_URL}/api/vision-images/${encodeURIComponent(ticId)}`, { method: "DELETE" });
        if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
        const data = await res.json();
        return txt(`🗑️ Deleted ${data.deletedCount} vision image(s) for TIC ${ticId}.`);
      } else {
        const res = await fetch(`${API_URL}/api/vision-images/${encodeURIComponent(ticId)}/${encodeURIComponent(slot)}`, { method: "DELETE" });
        if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
        return txt(`🗑️ Deleted vision image slot '${slot}' for TIC ${ticId}.`);
      }
    } catch (e: any) {
      return txt(`⚠️ Delete failed: ${e.message}`);
    }
  }
);

// ─── Tool 34: Replace Vision Image ────────────────────────────
server.tool(
  "replace_vision_image",
  `Replace or update a specific AI-generated vision image for a TIC ID. Use this to swap out an image with a better rendering.`,
  {
    ticId: z.string().describe("The TIC ID of the image to replace"),
    imageSlot: z.enum(["system_overview", "planet_profile", "macro_surface"]).describe("Which slot to replace"),
    imageData: z.string().optional().describe("New base64-encoded image data"),
    prompt: z.string().optional().describe("Updated prompt text"),
    title: z.string().optional().describe("Updated title"),
    researcherName: z.string().optional().describe("Name of researcher making the update"),
  },
  async ({ ticId, imageSlot, imageData, prompt, title, researcherName }) => {
    try {
      const body: any = {};
      if (imageData) body.imageData = imageData;
      if (prompt) body.prompt = prompt;
      if (title) body.title = title;
      if (researcherName) body.researcherName = researcherName;
      const res = await fetch(`${API_URL}/api/vision-images/${encodeURIComponent(ticId)}/${encodeURIComponent(imageSlot)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
      const data = await res.json();
      return txt(`📝 Updated vision image '${imageSlot}' for TIC ${ticId}.\nDocument ID: ${data.id}`);
    } catch (e: any) {
      return txt(`⚠️ Update failed: ${e.message}`);
    }
  }
);

// ─── Tool 35: List Vision Gallery ─────────────────────────────
server.tool(
  "list_vision_gallery",
  `List all TIC IDs that have AI-generated vision images in the gallery. Shows which slots are filled and whether each is a discovery or false positive.`,
  {},
  async () => {
    try {
      const data = await apiGet("/api/vision-images");
      if (!data.gallery || data.gallery.length === 0) {
        return txt("📭 No vision images in the gallery yet.\n\nUse generate_visual_guidance + upload_vision_image to populate the gallery.");
      }
      let report = `🖼️ Synthetic Vision Gallery (${data.gallery.length} TIC IDs)\n`;
      report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      for (const entry of data.gallery) {
        const icon = entry.thesisType === "discovery" ? "🌍" : "❌";
        report += `${icon} TIC ${entry.ticId} | ${entry.imageCount}/3 images | ${entry.thesisType} | Slots: ${entry.slots.join(", ")}\n`;
      }
      return txt(report);
    } catch (e: any) {
      return txt(`⚠️ Error: ${e.message}`);
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
