export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-3"
            style={{ backgroundColor: '#1e3a5f' }}
          >
            <span className="text-white font-bold text-lg">W</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">WDLC Admin</h1>
          <p className="text-gray-500 text-sm mt-1">World Direct Link Corp</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
