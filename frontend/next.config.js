/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",       // generates frontend/out/ as pure static HTML/JS/CSS
  trailingSlash: true,    // index.html per route — required for static serving
  images: {
    unoptimized: true,    // Image Optimization API not available in static export
  },
};

module.exports = nextConfig;
