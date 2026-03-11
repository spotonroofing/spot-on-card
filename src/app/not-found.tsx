export default function NotFound() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="text-center">
        <img src="/images/logo-white.png" alt="SpotOnRoof" style={{ maxWidth: 200 }} className="mx-auto mb-6" />
        <h1 className="text-2xl font-bold text-white mb-2">Page not found</h1>
        <p className="text-zinc-400 mb-6">The page you're looking for doesn't exist.</p>
        <a
          href="/"
          className="inline-block px-6 py-3 bg-gradient-to-r from-[#00AEEF] to-[#0077A8] text-white font-semibold rounded-lg hover:opacity-90 transition-opacity"
        >
          Go Home
        </a>
      </div>
    </div>
  );
}
