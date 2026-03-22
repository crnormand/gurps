import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

import { defineConfig } from 'vitest/config'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      '@module': resolve(__dirname, 'src/module'),
      '@lib': resolve(__dirname, 'src/lib'),
      '@util': resolve(__dirname, 'src/util'),
      '@rules': resolve(__dirname, 'src/rules'),
      '@gurps-types': resolve(__dirname, 'src/types'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./test/vitest.setup.ts'],
  },
})
