/** @type {import('next').NextConfig} */
const nextConfig = {
  // pdf-parse (via pdfjs-dist) sets up a worker using a path relative to its
  // own bundled chunk. Next's bundler doesn't carry that worker file along,
  // so parsing fails with "Setting up fake worker failed: Cannot find
  // module .../pdf.worker.mjs". Marking it external makes Next leave it as
  // a real Node require() instead of bundling it, so it resolves the worker
  // via normal node_modules resolution. (Carried over from the shared app —
  // same library, same bug.)
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],
};

export default nextConfig;
