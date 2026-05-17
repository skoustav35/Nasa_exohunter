declare const Deno: {
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
};

export {};

const R_SUN_EARTH = 109.2;
const MAX_DEPTH_PPM = 1_000_000;
const GEOMETRIC_TOLERANCE = 0.01;
const CRITICAL_INTEGRITY_THRESHOLD = 50;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function toFiniteNumber(value: unknown): number | null {
  const number = typeof value === 'number' ? value : parseFloat(String(value ?? ''));
  return Number.isFinite(number) ? number : null;
}

function isExplicitRejection(payload: any): boolean {
  const joined = [
    payload?.status,
    payload?.validation_status,
    payload?.verdict,
    payload?.badge,
    payload?.classification,
    payload?.reason,
  ].filter(Boolean).join(' ');
  return /reject|retract|false positive|artifact|physical impossibility/i.test(joined);
}

function explainSovereignSanityCheck(payload: any) {
  const missing = ['tic_id', 'target_name', 'transit_depth_ppm', 'planet_radius_earth', 'stellar_radius_sol', 'physical_integrity_score']
    .filter((key) => payload?.[key] === undefined || payload?.[key] === null || payload?.[key] === '');
  if (missing.length) {
    return { ok: false, reason: `Missing required fields: ${missing.join(', ')}`, expectedRadiusEarth: null, drift: null };
  }

  const depthPpm = toFiniteNumber(payload.transit_depth_ppm);
  const calcRadiusEarth = toFiniteNumber(payload.planet_radius_earth);
  const stellarRadiusSol = toFiniteNumber(payload.stellar_radius_sol);
  const integrityScore = toFiniteNumber(payload.physical_integrity_score);
  const snr = toFiniteNumber(payload.snr);

  if (depthPpm === null || calcRadiusEarth === null || stellarRadiusSol === null || integrityScore === null) {
    return { ok: false, reason: 'Physical validation fields must be finite numbers.', expectedRadiusEarth: null, drift: null };
  }
  if (depthPpm <= 0 || depthPpm > MAX_DEPTH_PPM) {
    return { ok: false, reason: `Non-physical transit depth (${depthPpm} PPM).`, expectedRadiusEarth: null, drift: null };
  }
  if (stellarRadiusSol <= 0) {
    return { ok: false, reason: 'Missing verified stellar radius.', expectedRadiusEarth: null, drift: null };
  }
  if (calcRadiusEarth <= 0) {
    return { ok: false, reason: 'Planet radius must be positive.', expectedRadiusEarth: null, drift: null };
  }

  const expectedRadiusEarth = stellarRadiusSol * R_SUN_EARTH * Math.sqrt(depthPpm / MAX_DEPTH_PPM);
  const drift = Math.abs(calcRadiusEarth - expectedRadiusEarth) / expectedRadiusEarth;
  if (drift > GEOMETRIC_TOLERANCE) {
    console.error(`[CRITICAL CONSENSUS FAILURE] Payload dropped for ${payload.target_name}. Radius and Depth are structurally decoupled.`);
    return { ok: false, reason: 'Planet radius deviates from canonical geometric transit depth.', expectedRadiusEarth, drift };
  }
  if (integrityScore < CRITICAL_INTEGRITY_THRESHOLD && !isExplicitRejection(payload)) {
    return { ok: false, reason: 'Low-integrity payload cannot be promoted as a discovery.', expectedRadiusEarth, drift };
  }

  // 2. Clear out manual override cognitive dissonance bugs
  if (snr !== null && snr < 6.0 && (payload.status || "").includes("CONFIRMED")) {
    console.error(`[CRITICAL CONSENSUS FAILURE] Blocked manual override confirmation on sub-threshold noise.`);
    return { ok: false, reason: 'Blocked manual override confirmation on sub-threshold noise.', expectedRadiusEarth, drift };
  }

  console.log(`[FIREWALL SUCCESS] Absolute parameter consensus verified for ${payload.target_name}. Pushing to Firestore.`);
  return { ok: true, expectedRadiusEarth, drift };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json({ ok: false, reason: 'Method not allowed.' }, 405);
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, reason: 'Invalid JSON payload.' }, 400);
  }

  const payload = body?.payload ?? body;
  const diagnostic = explainSovereignSanityCheck(payload);
  if (!diagnostic.ok) {
    console.error(`[FIREWALL BLOCK] ${payload?.target_name || payload?.tic_id || 'target'} rejected: ${diagnostic.reason}`);
    return json({ ok: false, ...diagnostic }, 422);
  }

  return json({ ok: true, diagnostic, acceptedAt: new Date().toISOString() });
});
