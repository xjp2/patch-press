// Shipping rate configuration.
//
// Rates are in SGD (the merchant/base currency) and are converted to the
// customer's display/charge currency the same way product prices are.
//
// IMPORTANT: the server-side copy of this table lives in
// supabase/functions/create-payment-intent/index.ts (the edge function is the
// authority — it recomputes the fee from the destination country and never
// trusts a client-sent amount). Keep the two tables in sync when rates change.

export interface ShippingCountry {
  code: string; // ISO 3166-1 alpha-2
  name: string;
}

// Countries offered at checkout. Also enforced server-side via Stripe's
// shipping_address_collection.allowed_countries.
export const SHIPPING_COUNTRIES: ShippingCountry[] = [
  { code: 'SG', name: 'Singapore' },
  { code: 'MY', name: 'Malaysia' },
  { code: 'ID', name: 'Indonesia' },
  { code: 'TH', name: 'Thailand' },
  { code: 'PH', name: 'Philippines' },
  { code: 'VN', name: 'Vietnam' },
  { code: 'HK', name: 'Hong Kong' },
  { code: 'TW', name: 'Taiwan' },
  { code: 'CN', name: 'China' },
  { code: 'JP', name: 'Japan' },
  { code: 'KR', name: 'South Korea' },
  { code: 'AU', name: 'Australia' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'US', name: 'United States' },
];

export interface ShippingZone {
  // ISO country codes this zone covers; '*' matches any country not matched
  // by an earlier zone.
  countries: string[];
  rateSgd: number;
  label: string;
  estimate: string;
}

// First matching zone wins. Based on SingPost counter rates for a ~0.5 kg
// small packet (22 x 11 x 5 cm): Tracked Letterbox domestically, Speedpost
// Saver International abroad — both include tracking.
export const SHIPPING_ZONES: ShippingZone[] = [
  {
    countries: ['SG'],
    rateSgd: 3.9,
    label: 'Singapore — Tracked Letterbox',
    estimate: '2–3 working days',
  },
  {
    countries: ['MY'],
    rateSgd: 9.9,
    label: 'Malaysia — Tracked International',
    estimate: '5–11 working days',
  },
  {
    countries: ['*'],
    rateSgd: 21.9,
    label: 'International — Tracked',
    estimate: '8–18 working days',
  },
];

export const DEFAULT_SHIPPING_COUNTRY = 'SG';

export function getShippingZone(countryCode: string): ShippingZone {
  const code = (countryCode || '').toUpperCase();
  for (const zone of SHIPPING_ZONES) {
    if (zone.countries.includes(code)) return zone;
  }
  return SHIPPING_ZONES[SHIPPING_ZONES.length - 1]; // '*' rest-of-world zone
}

export function getShippingRateSgd(countryCode: string): number {
  return getShippingZone(countryCode).rateSgd;
}

export function isShippingCountryAllowed(countryCode: string): boolean {
  return SHIPPING_COUNTRIES.some((c) => c.code === countryCode.toUpperCase());
}
