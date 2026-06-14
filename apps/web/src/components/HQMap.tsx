/**
 * Embedded Google Map for World Direct Link HQ.
 * Uses Google's keyless `output=embed` map - free, no API key required.
 * Address: 5405 Memorial Drive, Suite A104, Stone Mountain, GA 30083
 */
const HQ_QUERY = '5405 Memorial Drive, Suite A104, Stone Mountain, GA 30083';

export default function HQMap({
  label = 'World Direct Link Corporate Headquarters - 5405 Memorial Drive, Stone Mountain, GA',
  height = 340,
}: {
  label?: string;
  height?: number;
}) {
  const q = encodeURIComponent(HQ_QUERY);
  const src = `https://www.google.com/maps?q=${q}&output=embed`;
  const fullLink = `https://www.google.com/maps/search/?api=1&query=${q}`;

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
        allowFullScreen
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
