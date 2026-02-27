import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: {
    bin: 'src/bin.ts',
    index: 'src/index.ts',
  },
  format: 'esm',
  dts: true,
  clean: true,
  deps: {
    neverBundle: ['vitest'],
  },
  banner: {
    js: '#!/usr/bin/env node',
  },
});
