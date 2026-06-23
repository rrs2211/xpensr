// Indian City Per-Diem & Hotel Rates
// Source: GoI/DOPT OM dated 2023 + RBI Tier classification
// Rates are standard DOPT rates used as defaults — companies can override in Policy

export const CITY_TIER_RATES = {
  // Format: cityName: { tier, state, diem, hotel }
  // diem = per diem daily allowance (₹), hotel = hotel ceiling (₹/night)
  // Tiers: A1 (metros), A (major cities), B1, B2, C (smaller cities)

  // ── TIER A1 — METRO (Highest rates) ─────────────────────────────────────
  'Mumbai':     { tier: 'A', state: 'Maharashtra', diem: 600, hotel: 4500 },
  'Delhi':      { tier: 'A', state: 'Delhi', diem: 600, hotel: 4500 },
  'Bengaluru':  { tier: 'A', state: 'Karnataka', diem: 600, hotel: 4500 },
  'Bangalore':  { tier: 'A', state: 'Karnataka', diem: 600, hotel: 4500 },
  'Chennai':    { tier: 'A', state: 'Tamil Nadu', diem: 600, hotel: 4500 },
  'Hyderabad':  { tier: 'A', state: 'Telangana', diem: 600, hotel: 4500 },
  'Kolkata':    { tier: 'A', state: 'West Bengal', diem: 600, hotel: 4500 },
  'Ahmedabad':  { tier: 'A', state: 'Gujarat', diem: 500, hotel: 3500 },
  'Pune':       { tier: 'A', state: 'Maharashtra', diem: 500, hotel: 3500 },

  // ── TIER A — STATE CAPITALS / MAJOR CITIES ──────────────────────────────
  'Jaipur':     { tier: 'A', state: 'Rajasthan', diem: 450, hotel: 3000 },
  'Lucknow':    { tier: 'A', state: 'Uttar Pradesh', diem: 450, hotel: 3000 },
  'Chandigarh': { tier: 'A', state: 'Chandigarh', diem: 450, hotel: 3000 },
  'Bhopal':     { tier: 'A', state: 'Madhya Pradesh', diem: 450, hotel: 3000 },
  'Patna':      { tier: 'A', state: 'Bihar', diem: 450, hotel: 3000 },
  'Bhubaneswar':{ tier: 'A', state: 'Odisha', diem: 450, hotel: 3000 },
  'Guwahati':   { tier: 'A', state: 'Assam', diem: 450, hotel: 3000 },
  'Thiruvananthapuram': { tier: 'A', state: 'Kerala', diem: 450, hotel: 3000 },
  'Kochi':      { tier: 'A', state: 'Kerala', diem: 450, hotel: 3000 },
  'Raipur':     { tier: 'A', state: 'Chhattisgarh', diem: 450, hotel: 3000 },
  'Dehradun':   { tier: 'A', state: 'Uttarakhand', diem: 450, hotel: 3000 },
  'Ranchi':     { tier: 'A', state: 'Jharkhand', diem: 450, hotel: 3000 },
  'Shimla':     { tier: 'A', state: 'Himachal Pradesh', diem: 450, hotel: 3000 },
  'Gandhinagar':{ tier: 'A', state: 'Gujarat', diem: 450, hotel: 3000 },
  'Panaji':     { tier: 'A', state: 'Goa', diem: 450, hotel: 3500 },
  'Goa':        { tier: 'A', state: 'Goa', diem: 450, hotel: 3500 },
  'Nagpur':     { tier: 'A', state: 'Maharashtra', diem: 400, hotel: 2500 },
  'Surat':      { tier: 'A', state: 'Gujarat', diem: 400, hotel: 2500 },
  'Vadodara':   { tier: 'A', state: 'Gujarat', diem: 400, hotel: 2500 },
  'Rajkot':     { tier: 'A', state: 'Gujarat', diem: 400, hotel: 2500 },
  'Coimbatore': { tier: 'A', state: 'Tamil Nadu', diem: 400, hotel: 2500 },
  'Madurai':    { tier: 'A', state: 'Tamil Nadu', diem: 400, hotel: 2500 },
  'Vizag':      { tier: 'A', state: 'Andhra Pradesh', diem: 400, hotel: 2500 },
  'Visakhapatnam':{ tier: 'A', state: 'Andhra Pradesh', diem: 400, hotel: 2500 },
  'Vijayawada': { tier: 'A', state: 'Andhra Pradesh', diem: 400, hotel: 2500 },
  'Indore':     { tier: 'A', state: 'Madhya Pradesh', diem: 400, hotel: 2500 },
  'Varanasi':   { tier: 'A', state: 'Uttar Pradesh', diem: 400, hotel: 2500 },
  'Agra':       { tier: 'A', state: 'Uttar Pradesh', diem: 400, hotel: 2500 },
  'Amritsar':   { tier: 'A', state: 'Punjab', diem: 400, hotel: 2500 },
  'Ludhiana':   { tier: 'A', state: 'Punjab', diem: 400, hotel: 2500 },

  // ── TIER B — TIER-2 CITIES ──────────────────────────────────────────────
  'Srinagar':   { tier: 'B', state: 'J&K', diem: 350, hotel: 2000 },
  'Jammu':      { tier: 'B', state: 'J&K', diem: 350, hotel: 2000 },
  'Leh':        { tier: 'B', state: 'Ladakh', diem: 400, hotel: 2000 },
  'Jodhpur':    { tier: 'B', state: 'Rajasthan', diem: 350, hotel: 2000 },
  'Udaipur':    { tier: 'B', state: 'Rajasthan', diem: 350, hotel: 2000 },
  'Kota':       { tier: 'B', state: 'Rajasthan', diem: 300, hotel: 1800 },
  'Mysuru':     { tier: 'B', state: 'Karnataka', diem: 350, hotel: 2000 },
  'Mysore':     { tier: 'B', state: 'Karnataka', diem: 350, hotel: 2000 },
  'Hubli':      { tier: 'B', state: 'Karnataka', diem: 300, hotel: 1800 },
  'Mangaluru':  { tier: 'B', state: 'Karnataka', diem: 350, hotel: 2000 },
  'Tiruchirappalli':{ tier: 'B', state: 'Tamil Nadu', diem: 300, hotel: 1800 },
  'Salem':      { tier: 'B', state: 'Tamil Nadu', diem: 300, hotel: 1800 },
  'Thrissur':   { tier: 'B', state: 'Kerala', diem: 300, hotel: 1800 },
  'Kozhikode':  { tier: 'B', state: 'Kerala', diem: 300, hotel: 1800 },
  'Nashik':     { tier: 'B', state: 'Maharashtra', diem: 300, hotel: 1800 },
  'Aurangabad': { tier: 'B', state: 'Maharashtra', diem: 300, hotel: 1800 },
  'Kolhapur':   { tier: 'B', state: 'Maharashtra', diem: 300, hotel: 1800 },
  'Solapur':    { tier: 'B', state: 'Maharashtra', diem: 300, hotel: 1800 },
  'Jabalpur':   { tier: 'B', state: 'Madhya Pradesh', diem: 300, hotel: 1800 },
  'Gwalior':    { tier: 'B', state: 'Madhya Pradesh', diem: 300, hotel: 1800 },
  'Allahabad':  { tier: 'B', state: 'Uttar Pradesh', diem: 300, hotel: 1800 },
  'Prayagraj':  { tier: 'B', state: 'Uttar Pradesh', diem: 300, hotel: 1800 },
  'Kanpur':     { tier: 'B', state: 'Uttar Pradesh', diem: 300, hotel: 1800 },
  'Meerut':     { tier: 'B', state: 'Uttar Pradesh', diem: 300, hotel: 1800 },
  'Ghaziabad':  { tier: 'B', state: 'Uttar Pradesh', diem: 300, hotel: 1800 },
  'Noida':      { tier: 'B', state: 'Uttar Pradesh', diem: 400, hotel: 3000 },
  'Gurugram':   { tier: 'B', state: 'Haryana', diem: 500, hotel: 4000 },
  'Gurgaon':    { tier: 'B', state: 'Haryana', diem: 500, hotel: 4000 },
  'Faridabad':  { tier: 'B', state: 'Haryana', diem: 350, hotel: 2000 },
  'Bhubaneshwar':{ tier: 'B', state: 'Odisha', diem: 300, hotel: 1800 },
  'Cuttack':    { tier: 'B', state: 'Odisha', diem: 300, hotel: 1800 },
  'Siliguri':   { tier: 'B', state: 'West Bengal', diem: 300, hotel: 1800 },
  'Durgapur':   { tier: 'B', state: 'West Bengal', diem: 300, hotel: 1800 },
  'Shillong':   { tier: 'B', state: 'Meghalaya', diem: 350, hotel: 2000 },
  'Imphal':     { tier: 'B', state: 'Manipur', diem: 350, hotel: 2000 },
  'Aizawl':     { tier: 'B', state: 'Mizoram', diem: 350, hotel: 2000 },
  'Agartala':   { tier: 'B', state: 'Tripura', diem: 350, hotel: 2000 },
  'Itanagar':   { tier: 'B', state: 'Arunachal Pradesh', diem: 350, hotel: 2000 },
  'Kohima':     { tier: 'B', state: 'Nagaland', diem: 350, hotel: 2000 },
  'Gangtok':    { tier: 'B', state: 'Sikkim', diem: 400, hotel: 2500 },
  'Puducherry': { tier: 'B', state: 'Puducherry', diem: 350, hotel: 2000 },
  'Pondicherry':{ tier: 'B', state: 'Puducherry', diem: 350, hotel: 2000 },
  'Bhilai':     { tier: 'B', state: 'Chhattisgarh', diem: 300, hotel: 1800 },
  'Bilaspur':   { tier: 'B', state: 'Chhattisgarh', diem: 300, hotel: 1800 },
  'Jamshedpur': { tier: 'B', state: 'Jharkhand', diem: 300, hotel: 1800 },
  'Dhanbad':    { tier: 'B', state: 'Jharkhand', diem: 300, hotel: 1800 },
  'Bokaro':     { tier: 'B', state: 'Jharkhand', diem: 300, hotel: 1800 },
  'Mussoorie':  { tier: 'B', state: 'Uttarakhand', diem: 350, hotel: 2000 },
  'Haridwar':   { tier: 'B', state: 'Uttarakhand', diem: 300, hotel: 1800 },
  'Rishikesh':  { tier: 'B', state: 'Uttarakhand', diem: 300, hotel: 1800 },
  'Nainital':   { tier: 'B', state: 'Uttarakhand', diem: 350, hotel: 2000 },

  // ── TIER C — SMALLER CITIES ─────────────────────────────────────────────
  // Default for unlisted cities
};

// Tier defaults (used when specific city rate not found)
export const TIER_DEFAULTS = {
  A: { diem: 450, hotel: 3000 },
  B: { diem: 300, hotel: 1800 },
  C: { diem: 200, hotel: 1200 },
  D: { diem: 150, hotel: 800 },  // D = unclassified / small town
};

// Get rates for a city — returns tier + rates
export function getCityRates(cityName) {
  if (!cityName) return { tier: 'D', ...TIER_DEFAULTS.D };
  // Case-insensitive lookup
  const key = Object.keys(CITY_TIER_RATES).find(
    k => k.toLowerCase() === cityName.toLowerCase().trim()
  );
  if (key) return { tier: CITY_TIER_RATES[key].tier, ...CITY_TIER_RATES[key] };
  return { tier: 'D', ...TIER_DEFAULTS.D, city: cityName };
}

// Get all cities as array for dropdown/search
export function getAllCities() {
  return Object.entries(CITY_TIER_RATES).map(([city, data]) => ({
    city, ...data
  })).sort((a, b) => a.city.localeCompare(b.city));
}

// Build policy-ready city tiers array from this data
export function buildCityTiersForPolicy() {
  return getAllCities().map(({ city, tier, state }) => ({ city, tier, state }));
}
