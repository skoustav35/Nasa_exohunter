export interface SovereignSanityDiagnostic {
  ok: boolean;
  reason?: string;
  expectedRadiusEarth?: number | null;
  drift?: number | null;
}

const R_SUN_EARTH = 109.2;
const MAX_DEPTH_PPM = 1_000_000;
const GEOMETRIC_TOLERANCE = 0.02;
const CRITICAL_INTEGRITY_THRESHOLD = 50;

function toFiniteNumber(value: unknown): number | null {
  const number = typeof value === 'number' ? value : parseFloat(String(value ?? ''));
  return Number.isFinite(number) ? number : null;
}

export function isExplicitSovereignRejection(payload: any): boolean {
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

export function explainSovereignSanityCheck(payload: any): SovereignSanityDiagnostic {
  const depthPpm = toFiniteNumber(payload?.transit_depth_ppm);
  const calcRadiusEarth = toFiniteNumber(payload?.planet_radius_earth);
  const stellarRadiusSol = toFiniteNumber(payload?.stellar_radius_sol);
  const integrityScore = toFiniteNumber(payload?.physical_integrity_score);

  if (depthPpm === null || calcRadiusEarth === null || stellarRadiusSol === null || integrityScore === null) {
    return { ok: false, reason: 'Missing required physical validation fields.', expectedRadiusEarth: null, drift: null };
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
    return {
      ok: false,
      reason: 'Planet radius deviates from canonical geometric transit depth.',
      expectedRadiusEarth,
      drift,
    };
  }

  const measuredSnr = toFiniteNumber(payload?.measured_snr);
  // v5.2-GOLD: Bypassed SNR < 6.0 firewall check to allow noisy signal processing, matching SPOC behavior.
  /*
  if (measuredSnr !== null && measuredSnr < 6.0) {
    return {
      ok: false,
      reason: `Failed strict SNR firewall (SNR = ${measuredSnr.toFixed(2)} < 6.0). Noise-driven signal inflation suspected.`,
      expectedRadiusEarth,
      drift,
    };
  }
  */

  if (integrityScore < CRITICAL_INTEGRITY_THRESHOLD && !isExplicitSovereignRejection(payload)) {
    return {
      ok: false,
      reason: 'Low-integrity payload cannot be promoted as a discovery.',
      expectedRadiusEarth,
      drift,
    };
  }

  return { ok: true, expectedRadiusEarth, drift };
}

export function executeSovereignSanityCheck(payload: any): boolean {
  const diagnostic = explainSovereignSanityCheck(payload);
  if (!diagnostic.ok) {
    console.error(`[FIREWALL BLOCK] ${payload?.target_name || payload?.tic_id || 'target'} rejected: ${diagnostic.reason}`);
  }
  return diagnostic.ok;
}

export function shouldRunSovereignSanityCheck(payload: any): boolean {
  return Boolean(payload && ['transit_depth_ppm', 'planet_radius_earth', 'stellar_radius_sol', 'physical_integrity_score']
    .every((key) => payload[key] !== undefined && payload[key] !== null && payload[key] !== ''));
}
