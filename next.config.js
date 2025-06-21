/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.kydwwogo.a2hosted.com',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.in',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'lhglwepqlgikpixtjofm.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'placehold.co',
      }
    ],
  },
  // Remove static export since we're using Supabase
  // output: "export",
  webpack: (config, { isServer }) => {
    // Ignore the punycode warning
    config.ignoreWarnings = [
      { module: /node_modules\/punycode/ }
    ];
    // Disable webpack cache temporarily
    config.cache = false;
    return config;
  },
}

module.exports = nextConfig
