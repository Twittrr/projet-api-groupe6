/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // image Docker légère
  reactStrictMode: true,
  poweredByHeader: false, // ne pas divulguer la stack (sécurité)
  compress: true, // compression gzip des réponses
  productionBrowserSourceMaps: false, // build prod plus léger
  // Le lint est exécuté en CI (job dédié) plutôt qu'au build de l'image
  eslint: { ignoreDuringBuilds: true },
  // En production, le gateway Nginx route /api et /uploads vers les services.
  // En développement (next dev lancé seul), on relaie /api et /uploads vers le
  // gateway pour que l'app fonctionne sans reverse proxy devant le frontend.
  async rewrites() {
    const gateway = process.env.GATEWAY_URL || 'http://localhost:8080';
    return [
      { source: '/api/:path*', destination: `${gateway}/api/:path*` },
      { source: '/uploads/:path*', destination: `${gateway}/uploads/:path*` },
    ];
  },
};

export default nextConfig;
