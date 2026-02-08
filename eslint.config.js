import eslint from '@eslint/js'
import eslintConfigPrettier from 'eslint-config-prettier'
import importPlugin from 'eslint-plugin-import'
import tseslint from 'typescript-eslint'

const foundryGlobals = {
  // Core Foundry VTT
  game: 'readonly',
  canvas: 'readonly',
  ui: 'readonly',
  foundry: 'readonly',
  CONFIG: 'readonly',
  CONST: 'readonly',
  Hooks: 'readonly',
  Actor: 'readonly',
  Item: 'readonly',
  Token: 'readonly',
  ChatMessage: 'readonly',
  Dialog: 'readonly',
  Application: 'readonly',
  FormApplication: 'readonly',
  Roll: 'readonly',
  Macro: 'readonly',
  User: 'readonly',
  Scene: 'readonly',
  Combat: 'readonly',
  Combatant: 'readonly',
  ActiveEffect: 'readonly',
  TextEditor: 'readonly',
  FilePicker: 'readonly',
  AudioHelper: 'readonly',
  SocketInterface: 'readonly',
  DocumentSheet: 'readonly',
  ActorSheet: 'readonly',
  ItemSheet: 'readonly',
  JournalEntry: 'readonly',
  Journal: 'readonly',
  Folder: 'readonly',
  Draggable: 'readonly',
  SortingHelpers: 'readonly',
  SearchFilter: 'readonly',
  HandlebarsHelpers: 'readonly',
  CanvasAnimation: 'readonly',
  CompendiumCollection: 'readonly',

  // Foundry utilities
  renderTemplate: 'readonly',
  getTemplate: 'readonly',
  loadTemplates: 'readonly',
  fromUuid: 'readonly',
  fromUuidSync: 'readonly',
  duplicate: 'readonly',
  mergeObject: 'readonly',
  setProperty: 'readonly',
  getProperty: 'readonly',
  hasProperty: 'readonly',
  expandObject: 'readonly',
  flattenObject: 'readonly',
  randomID: 'readonly',
  debounce: 'readonly',

  // GURPS system
  GURPS: 'readonly',

  // External libraries
  $: 'readonly',
  jQuery: 'readonly',
  Handlebars: 'readonly',
  XRegExp: 'readonly',

  // External Foundry modules
  libWrapper: 'readonly',
  SimpleCalendar: 'readonly',
  dragRuler: 'readonly',
  warpgate: 'readonly',
  dae: 'readonly',

  // Browser globals
  console: 'readonly',
  document: 'readonly',
  window: 'readonly',
  navigator: 'readonly',
  setTimeout: 'readonly',
  setInterval: 'readonly',
  clearTimeout: 'readonly',
  clearInterval: 'readonly',
  fetch: 'readonly',
  FormData: 'readonly',
  MutationObserver: 'readonly',
  HTMLElement: 'readonly',
  HTMLInputElement: 'readonly',
  FileReader: 'readonly',
  FileSystemDirectoryHandle: 'readonly',
  showOpenFilePicker: 'readonly',
  showDirectoryPicker: 'readonly',
  event: 'readonly',

  // Node.js / CommonJS
  global: 'readonly',
  module: 'readonly',

  // Other
  structuredClone: 'readonly',
  typePrototypes: 'readonly',
  _patchedFuncs: 'writable',
  XMLHttpRequest: 'readonly',
  performance: 'readonly',
  Image: 'readonly',
  ImagePopout: 'readonly',
  DragDrop: 'readonly',
  KeyboardManager: 'readonly',
  ImportSettings: 'readonly',
  version: 'readonly',
  xml: 'readonly',
  _token: 'readonly',

  // Debug utilities (defined in lib/utilities.js)
  debug: 'readonly',
  warn: 'readonly',
  debugEnabled: 'readonly',
  uconsole: 'readonly',
  display: 'readonly',

  // Effect utilities (Times Up integration)
  timesUpEnabled: 'readonly',
  enablePassiveEffects: 'readonly',
  GMEffectQueue: 'readonly',
  effectQueue: 'readonly',
  isTransferEffect: 'readonly',
  expireEffect: 'readonly',
  isEffectExpired: 'readonly',
  isDurationExpired: 'readonly',
  hasDuration: 'readonly',
  hasDurationSeconds: 'readonly',
  hasExpiry: 'readonly',
  getApplicableEffects: 'readonly',
  getEffectActor: 'readonly',
  getExpireTransferEffectUpdate: 'readonly',
  getUnexpireEffectUpdate: 'readonly',
  getMacroRepeat: 'readonly',
  setEffectsExpiryToRounds: 'readonly',
  setEffectsExpiryToSeconds: 'readonly',
  onlyGMsCanOpenADD: 'readonly',
  makeRegexPattern: 'readonly',
}

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  eslintConfigPrettier,
  {
    ignores: ['dist/', 'node_modules/', 'lib/', 'src/lib/', 'build/', 'scripts/'],
  },
  {
    languageOptions: {
      globals: foundryGlobals,
    },
  },
  {
    files: ['dev/scripts/**/*.{js,mjs,cjs}', 'build/**/*.{js,mjs,cjs}'],
    languageOptions: {
      globals: {
        process: 'readonly',
        URL: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        require: 'readonly',
        exports: 'readonly',
      },
    },
  },
  {
    files: ['**/*.cjs'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  {
    files: ['**/*.ts'],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.eslint.json'],
      },
    },
  },
  {
    files: ['**/*.js'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  {
    plugins: {
      import: importPlugin,
    },
    rules: {
      'id-length': [2, { exceptions: ['i', 'x', 'y', '_'], properties: 'never' }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-namespace': 'off',
      '@typescript-eslint/ban-ts-comment': 'warn',
      '@typescript-eslint/no-empty-object-type': 'warn',
      '@typescript-eslint/no-wrapper-object-types': 'warn',
      'no-unused-vars': 'off',
      'import/extensions': [
        'error',
        'always',
        {
          ignorePackages: true,
        },
      ],
      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
      'import/newline-after-import': ['error', { count: 1 }],
      'padding-line-between-statements': [
        'error',
        { blankLine: 'always', prev: '*', next: 'return' },
        { blankLine: 'always', prev: ['const', 'let', 'var'], next: '*' },
        { blankLine: 'any', prev: ['const', 'let', 'var'], next: ['const', 'let', 'var'] },
        { blankLine: 'always', prev: 'directive', next: '*' },
        { blankLine: 'always', prev: '*', next: 'function' },
        { blankLine: 'always', prev: 'function', next: '*' },
        { blankLine: 'always', prev: '*', next: 'class' },
        { blankLine: 'always', prev: 'class', next: '*' },
        { blankLine: 'always', prev: 'block-like', next: '*' },
        { blankLine: 'always', prev: '*', next: 'block-like' },
        { blankLine: 'any', prev: 'block-like', next: 'case' },
        { blankLine: 'any', prev: 'case', next: 'case' },
      ],
    },
  }
)
