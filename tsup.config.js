import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['**/*.ts', '!node_modules/**', '!**/*.test.ts'],
  format: ['esm'],
  splitting: false,
  bundle: false,
  clean: false,
  outDir: '.',
  shims: false,
  skipNodeModulesBundle: true,
  sourcemap: false,
  dts: false,
})
