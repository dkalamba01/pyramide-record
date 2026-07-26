/** @type {import('next').NextConfig} */
const nextConfig = {
  // The real site lives entirely in /public as static HTML/CSS/JS.
  // These rewrites let Next serve the static index at the root URL.
  async rewrites() {
    return [
      { source: '/', destination: '/index.html' },
    ];
  },
};

module.exports = nextConfig;
