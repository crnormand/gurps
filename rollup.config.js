import autoprefixer from 'autoprefixer'
import tsConfigPaths from 'rollup-plugin-tsconfig-paths'
import copy from '@guanghechen/rollup-plugin-copy'
import { defineConfig } from 'rollup'
import postcss from 'rollup-plugin-postcss'
import typescript from '@rollup/plugin-typescript'
import resolve from '@rollup/plugin-node-resolve'

const name = 'gurps'
const distDirectory = 'dist'
const srcDirectory = '.'

const staticFiles = [
  'assets',
  'fonts',
  'icons',
  'lang',
  'lib',
  'scripts',
  'styles',
  'templates',
  'utils',
  'system.json',
  'template.json',
  'changelog.md',
]

const isProd = process.env.NODE_ENV === 'production'

export default defineConfig({
  strictDeprecations: true,
  input: { [`${name}`]: `${srcDirectory}/module/${name}.js` },
  output: {
    dir: distDirectory,
    format: 'es',
    sourcemap: true,
    assetFileNames: `[name].[ext]`,
  },
  plugins: [
    resolve({
      browser: true,
      preferBuiltins: false,
      extensions: ['.ts', '.js', '.json'],
    }),
    typescript({ noEmitOnError: true }),
    tsConfigPaths(),
    postcss({
      extract: true,
      minimize: isProd,
      sourceMap: true,
      use: ['sass'],
      plugins: [autoprefixer()],
    }),
    copy({
      targets: [
        {
          src: staticFiles.map(file => `${srcDirectory}/${file}`),
          dest: distDirectory,
        },
      ],
    }),
  ],
})
