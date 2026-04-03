export const GCD_SIGNAL_CODES = {
  l: { label: 'Not configured', status: 'missing' },
  p: { label: 'Default: denied', status: 'denied' },
  q: { label: 'Default: denied, update: denied', status: 'denied' },
  r: { label: 'Default: denied, update: granted', status: 'granted' },
  t: { label: 'Default: granted', status: 'granted' },
  u: { label: 'Default: granted, update: denied', status: 'denied' },
  v: { label: 'Default: granted, update: granted', status: 'granted' },
  m: { label: 'No default, update: denied', status: 'denied' },
  n: { label: 'No default, update: granted', status: 'granted' },
};

const GCD_TYPES = ['ad_storage', 'analytics_storage', 'ad_user_data', 'ad_personalization'];

/**
 * Decode a GCS parameter value (e.g. "G111").
 * Format: G1xy where x = ads consent (1/0), y = analytics consent (1/0).
 */
export function decodeGcs(gcsValue) {
  if (!gcsValue || typeof gcsValue !== 'string') return null;
  const match = gcsValue.match(/^G1([01])([01])$/);
  if (!match) return { raw: gcsValue, ads: 'unknown', analytics: 'unknown' };
  return {
    raw: gcsValue,
    ads: match[1] === '1' ? 'granted' : 'denied',
    analytics: match[2] === '1' ? 'granted' : 'denied',
  };
}

/**
 * Decode a GCD parameter value (e.g. "11t1t1t1t5").
 * Format: 11<ad_storage>1<analytics_storage>1<ad_user_data>1<ad_personalization><ending>
 */
export function decodeGcd(gcdValue) {
  if (!gcdValue || typeof gcdValue !== 'string') return null;
  const match = gcdValue.match(/^11([a-z])1([a-z])1([a-z])1([a-z])\d$/);
  if (!match) return { raw: gcdValue, signals: null };
  const signals = match.slice(1).map((code, i) => ({
    type: GCD_TYPES[i],
    code,
    ...(GCD_SIGNAL_CODES[code] || { label: `Unknown (${code})`, status: 'missing' }),
  }));
  return { raw: gcdValue, signals };
}
