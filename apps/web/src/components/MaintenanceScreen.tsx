import { company } from '@/lib/site';

// Full-page maintenance notice, shown across the public site when the
// `maintenanceMode` setting is enabled in the admin. Same calm, minimal
// styling as the "coming soon" pages.
export default function MaintenanceScreen() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        textAlign: 'center',
        background: '#0f172a',
        color: '#e2e8f0',
      }}
    >
      <div style={{ maxWidth: 560 }}>
        <p style={{ fontSize: '0.8rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#7dd3fc', marginBottom: '1rem' }}>
          {company.shortName}
        </p>
        <h1 style={{ fontSize: '2rem', fontWeight: 600, margin: '0 0 1rem' }}>We&apos;ll be right back</h1>
        <p style={{ fontSize: '1.05rem', lineHeight: 1.6, color: '#94a3b8' }}>
          Our site is undergoing scheduled maintenance and will return shortly.
          Thank you for your patience.
        </p>
        <p style={{ marginTop: '2rem', fontSize: '0.9rem', color: '#64748b' }}>
          Need help now? Email{' '}
          <a href={`mailto:${company.email}`} style={{ color: '#7dd3fc' }}>{company.email}</a>
          {company.tollFree ? <> or call <a href={`tel:${company.tollFree}`} style={{ color: '#7dd3fc' }}>{company.tollFree}</a></> : null}.
        </p>
      </div>
    </main>
  );
}
