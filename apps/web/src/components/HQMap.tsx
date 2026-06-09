/**
 * Embedded OpenStreetMap for World Direct Link HQ.
 * Uses OSM export iframe — no API key required.
 * Coordinates: 5405 Memorial Drive, Suite A104, Stone Mountain, GA 30083
 *   lat ≈ 33.7930, lon ≈ -84.1820
 */
export default function HQMap({
  label = 'World Direct Link Corporate Headquarters — 5405 Memorial Drive, Stone Mountain, GA',
  height = 340,
}: {
  label?: string;
  height?: number;
}) {
  const lat = 33.793;
  const lon = -84.182;
  const delta = 0.018;
  const bbox = `${lon - delta},${lat - delta},${lon + delta},${lat + delta}`;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lon}`;
  const fullLink = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=15/${lat}/${lon}`;

  return (
    <div className="overflow-hidden rounded-xl border border-[#d9e0e8] bg-gray-100">
      <iframe
        title={label}
        src={src}
        width="100%"
        height={height}
        style={{ border: 0, display: 'block' }}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        aria-label={label}
      />
      <a
        href={fullLink}
        target="_blank"
        rel="noopener noreferrer"
        className="block px-3 py-1.5 text-xs text-gray-400 hover:text-primary text-right"
      >
        View larger map ↗
      </a>
    </div>
  );
}
