/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Pexels URLs already carry ?w=&h= sizing, so Vercel's optimizer adds a
    // round trip and burns the Hobby-tier transformation quota for nothing.
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "images.pexels.com" },
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "i.pravatar.cc" },
      { protocol: "https", hostname: "fastly.picsum.photos" },
    ],
  },
};

module.exports = nextConfig;
