// Admin/back-office lives at secure.worlddirectlink.com in production.
const ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_URL || 'https://secure.worlddirectlink.com/login';

export default function AdminLoginPage() {
  return (
    <>
      <p className="auth-title">Admin access moved</p>
      <p style={{ textAlign: 'center', fontSize: '0.82rem', color: '#64748b', marginBottom: '20px', lineHeight: 1.6 }}>
        Staff sign-in belongs in the admin console, not the agent portal.
      </p>
      <a href={ADMIN_URL} className="auth-submit" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
        Open Admin Console
      </a>
    </>
  );
}
