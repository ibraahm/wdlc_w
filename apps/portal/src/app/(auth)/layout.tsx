export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="auth-brand-name">World Direct Link</span>
          <span className="auth-brand-sub">Agent Compliance Portal</span>
        </div>
        {children}
        <p style={{ marginTop: '32px', textAlign: 'center', fontSize: '0.72rem', color: 'rgba(44,44,44,0.35)' }}>
          &copy; {new Date().getFullYear()} World Direct Link, Corp. · Secure Platform
        </p>
      </div>
    </div>
  );
}
