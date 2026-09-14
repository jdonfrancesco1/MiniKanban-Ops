/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Replit Publish (Node 20) crashes Next 15.5.25's default webpack WASM hasher:
  //   TypeError: Cannot read properties of undefined (reading 'length')
  //   at WasmHash._updateWithBuffer (.../next/dist/compiled/webpack/bundle5.js)
  //   → "Next.js build worker exited with code: 1 and signal: null"
  // sha256 uses Node crypto (not WasmHash). A custom webpack() also disables
  // the forked webpack build worker in Next 15.5 (see webpackBuildWorker).
  webpack: (config) => {
    config.output.hashFunction = "sha256"
    return config
  },
}

export default nextConfig
