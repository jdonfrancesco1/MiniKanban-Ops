import { createHash } from "node:crypto"

/**
 * Webpack Hash constructor: Node sha256, but skip null/undefined updates.
 *
 * Replit Publish (Node 20) + Next 15.5.25 still feeds `undefined` into
 * `hash.update` while sealing chunks. That is the same payload that crashed
 * the default WASM hasher:
 *   TypeError: Cannot read properties of undefined (reading 'length')
 *   at WasmHash._updateWithBuffer
 *
 * PR #8 switched `output.hashFunction` to the string `"sha256"`. That avoids
 * WasmHash, but Node's hasher is stricter:
 *   crypto.createHash("sha256").update(undefined)
 *   → TypeError [ERR_INVALID_ARG_TYPE]: The "data" argument must be of type
 *     string or an instance of Buffer, TypedArray, or DataView. Received undefined
 *
 * A custom webpack() also keeps Next 15.5 from forking the webpack build worker.
 */
class SafeSha256Hash {
  constructor() {
    this._hash = createHash("sha256")
  }

  update(data, inputEncoding) {
    if (data == null) return this
    this._hash.update(data, inputEncoding)
    return this
  }

  digest(encoding) {
    return this._hash.digest(encoding)
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  webpack: (config) => {
    config.output.hashFunction = SafeSha256Hash
    return config
  },
}

export default nextConfig
