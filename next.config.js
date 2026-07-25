/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  turbopack: {
    root: __dirname,
  },
  async redirects() {
    // When the lagging islamic-kids-platform project eventually deploys this
    // commit, edge redirects migrate Cap/WebView traffic to the live host
    // before any stale quiz JS can block on "Submitting your answers…".
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'islamic-kids-platform.vercel.app' }],
        destination: 'https://huzaifahp1989-audio.vercel.app/:path*',
        permanent: false,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/quiz',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, max-age=0' },
          { key: 'Pragma', value: 'no-cache' },
        ],
      },
      {
        source: '/quiz/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, max-age=0' },
          { key: 'Pragma', value: 'no-cache' },
        ],
      },
      {
        source: '/((?!_next/static|_next/image|favicon.ico).*)',
        headers: [{ key: 'Cache-Control', value: 'no-store, must-revalidate' }],
      },
    ];
  },
}

module.exports = nextConfig
