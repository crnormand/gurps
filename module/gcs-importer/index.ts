import { GurpsModule } from '../gurps-module.js'
import { importGCS } from './importer.js'

interface GcsImportModule extends GurpsModule {}

function init() {
  console.log('GURPS | Initializing GURPS GCSImport module.')
  Hooks.on('ready', () => {
    GURPS.importGCS = importGCS
  })
}

export const GcsImport: GcsImportModule = {
  init,
}
