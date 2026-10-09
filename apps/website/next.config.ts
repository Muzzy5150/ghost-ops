import type { NextConfig } from 'next';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = dirname(fileURLToPath(import.meta.url));
const config: NextConfig = {
  output: 'export', trailingSlash: true,
  turbopack: { root }, outputFileTracingRoot: root,
  poweredByHeader: false, productionBrowserSourceMaps: false,
  images: { unoptimized: true },
};
export default config;
