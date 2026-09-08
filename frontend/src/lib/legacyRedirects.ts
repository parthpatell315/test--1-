/**
 * Exact old youthcamping.in paths → new youthcamping.online paths.
 * Used by Next.js (new host) and documented for the old origin.
 */
export const LEGACY_PATH_REDIRECTS: { source: string; destination: string }[] = [
  { source: "/tours/spiti-valley-bike-trip", destination: "/trips/spiti-valley-road-trip" },
  { source: "/trips/spiti-valley-bike-trip", destination: "/trips/spiti-valley-road-trip" },
  { source: "/tours/spiti-valley-road-trip-137856", destination: "/trips/spiti-valley-road-trip" },
  { source: "/tours/winter-spiti-156526", destination: "/trips/winter-spiti-road-trip" },
  { source: "/tours/kerala-getaway-165724", destination: "/trips/kerala-trip" },
  {
    source: "/tours/leh-to-leh-bike-expedition-2026-youth-camping-164365",
    destination: "/trips/leh-ladakh-bike-expedition-2026",
  },
  {
    source: "/tours/magical-kashmir-backpacking-trip-138723",
    destination: "/trips/jannat-e-kashmir-backpacking-trip",
  },
  {
    source: "/tours/manali-kasol-amritsar-adventure-trip-140500",
    destination: "/trips/manali-kasol-adventure",
  },
  {
    source: "/tours/manali-kasol-amritsar-trip-137683",
    destination: "/trips/manali-kasol-summer-2026",
  },
  {
    source: "/tours/kedarnath-tungnath-rishikesh-backpacking-trip",
    destination: "/trips/kedarnath-tungnath-rishikesh-trip",
  },
  {
    source: "/tours/kedarnath-tungnath-rishikesh-multiple-starting-points-as-addons-138288",
    destination: "/trips/kedarnath-badrinath-tungnath-rishikesh",
  },
  { source: "/tours/shimla-manali-kullu-138567", destination: "/trips/shimla-manali-kullu" },
  {
    source: "/tours/shimla-manali-dalhousie-dharamshala-155815",
    destination: "/trips/shimla-manali-dalhousie-dharamshala",
  },
  { source: "/collections", destination: "/trips" },
  { source: "/collections/tours", destination: "/trips" },
  { source: "/collections/backpacking-trips", destination: "/trips" },
  { source: "/collections/trips-from-gujarat", destination: "/trips" },
  { source: "/contact-us", destination: "/contact" },
  { source: "/tour-packages", destination: "/trips" },
  { source: "/about", destination: "/about-us" },
  { source: "/privacy", destination: "/privacy-policy" },
  { source: "/terms", destination: "/terms-and-conditions" },
];
