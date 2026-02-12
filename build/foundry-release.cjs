/**
 * Foundry VTT Package Release API Script
 *
 * This script publishes a package release to Foundry VTT using their Package Release API.
 * It can be used in GitHub Actions or run manually for local testing.
 *
 * Usage:
 *   node build/foundry-release.js --version 1.0.0 --manifest-url https://... --notes-url https://... [--dry-run]
 *
 * Environment Variables:
 *   FVTT_PACKAGE_ID      - The package ID (defaults to "gurps")
 *   FVTT_RELEASE_TOKEN   - The Foundry VTT release API token (required)
 *   FVTT_COMPATIBILITY_MIN      - Minimum compatible Foundry version (defaults to "12")
 *   FVTT_COMPATIBILITY_VERIFIED - Verified Foundry version (defaults to "13.351")
 *   FVTT_COMPATIBILITY_MAX      - Maximum compatible Foundry version (optional)
 */

const https = require('https')
const fs = require('fs')
const path = require('path')

// Parse command line arguments
const args = process.argv.slice(2)
const getArg = (name, defaultValue = null) => {
  const index = args.indexOf(name)
  return index !== -1 && args[index + 1] ? args[index + 1] : defaultValue
}
const hasFlag = name => args.includes(name)

// Configuration from environment variables and arguments
const config = {
  packageId: process.env.FVTT_PACKAGE_ID || 'gurps',
  releaseToken: process.env.FVTT_RELEASE_TOKEN,
  version: getArg('--version'),
  manifestUrl: getArg('--manifest-url'),
  notesUrl: getArg('--notes-url'),
  dryRun: hasFlag('--dry-run'),
  compatibility: {
    minimum: process.env.FVTT_COMPATIBILITY_MIN || '12',
    verified: process.env.FVTT_COMPATIBILITY_VERIFIED || '13.351',
    maximum: process.env.FVTT_COMPATIBILITY_MAX || '',
  },
}

// Read compatibility from system.json if available
const systemJsonPath = path.join(__dirname, '..', 'dist', 'system.json')
if (fs.existsSync(systemJsonPath)) {
  try {
    const systemJson = JSON.parse(fs.readFileSync(systemJsonPath, 'utf8'))
    if (systemJson.compatibility) {
      config.compatibility.minimum = systemJson.compatibility.minimum || config.compatibility.minimum
      config.compatibility.verified = systemJson.compatibility.verified || config.compatibility.verified
      config.compatibility.maximum = systemJson.compatibility.maximum || config.compatibility.maximum
    }
    // Use version from system.json if not provided via args
    if (!config.version && systemJson.version) {
      config.version = systemJson.version
    }
  } catch (error) {
    console.warn('Warning: Could not read system.json for compatibility info:', error.message)
  }
}

// Validate required parameters
function validate() {
  const errors = []

  if (!config.releaseToken) {
    errors.push('FVTT_RELEASE_TOKEN environment variable is required')
  }

  if (!config.version) {
    errors.push('--version argument is required')
  }

  if (!config.manifestUrl) {
    errors.push('--manifest-url argument is required')
  }

  if (errors.length > 0) {
    console.error('❌ Configuration errors:')
    errors.forEach(error => console.error(`  - ${error}`))
    console.error('\nUsage:')
    console.error(
      '  node build/foundry-release.js --version 1.0.0 --manifest-url https://... --notes-url https://... [--dry-run]'
    )
    console.error('\nEnvironment variables:')
    console.error('  FVTT_RELEASE_TOKEN (required) - Your Foundry VTT release API token')
    console.error('  FVTT_PACKAGE_ID (optional) - Package ID, defaults to "gurps"')
    console.error('  FVTT_COMPATIBILITY_MIN (optional) - Minimum Foundry version')
    console.error('  FVTT_COMPATIBILITY_VERIFIED (optional) - Verified Foundry version')
    console.error('  FVTT_COMPATIBILITY_MAX (optional) - Maximum Foundry version')
    process.exit(1)
  }
}

// Build the request payload
function buildPayload() {
  const payload = {
    id: config.packageId,
    release: {
      version: config.version,
      manifest: config.manifestUrl,
      compatibility: {
        minimum: config.compatibility.minimum,
        verified: config.compatibility.verified,
        maximum: config.compatibility.maximum,
      },
    },
  }

  if (config.notesUrl) {
    payload.release.notes = config.notesUrl
  }

  if (config.dryRun) {
    payload['dry-run'] = true
  }

  return payload
}

// Make the API request
function publishRelease(payload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload)

    const options = {
      hostname: 'foundryvtt.com',
      path: '/_api/packages/release_version/',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        Authorization: config.releaseToken,
      },
    }

    const req = https.request(options, res => {
      let responseData = ''

      res.on('data', chunk => {
        responseData += chunk
      })

      res.on('end', () => {
        try {
          const json = JSON.parse(responseData)

          if (res.statusCode === 200) {
            resolve({ success: true, statusCode: res.statusCode, data: json, headers: res.headers })
          } else {
            resolve({ success: false, statusCode: res.statusCode, data: json, headers: res.headers })
          }
        } catch (error) {
          resolve({
            success: false,
            statusCode: res.statusCode,
            data: { error: 'Failed to parse response', raw: responseData },
            headers: res.headers,
          })
        }
      })
    })

    req.on('error', error => {
      reject(error)
    })

    req.write(data)
    req.end()
  })
}

// Format and display the result
function displayResult(result) {
  console.log('\n' + '='.repeat(60))

  if (result.success) {
    console.log('✅ SUCCESS!')
    console.log('='.repeat(60))

    if (config.dryRun) {
      console.log('🔍 Dry run completed successfully')
      console.log('   To actually publish, run again without --dry-run')
    } else {
      console.log('🎉 Package release published to Foundry VTT!')
    }

    if (result.data.page) {
      console.log(`📦 Package page: ${result.data.page}`)
    }

    if (result.data.message) {
      console.log(`💬 Message: ${result.data.message}`)
    }
  } else {
    console.log('❌ FAILED!')
    console.log('='.repeat(60))
    console.log(`HTTP Status: ${result.statusCode}`)

    if (result.statusCode === 429 && result.headers['retry-after']) {
      console.log(`⏰ Rate limited. Retry after ${result.headers['retry-after']} seconds.`)
    }

    if (result.data.errors) {
      console.log('\nValidation errors:')
      for (const [field, errors] of Object.entries(result.data.errors)) {
        console.log(`  ${field}:`)
        errors.forEach(error => {
          console.log(`    - ${error.message} (${error.code})`)
        })
      }
    } else if (result.data.error) {
      console.log(`\nError: ${result.data.error}`)
      if (result.data.raw) {
        console.log(`Raw response: ${result.data.raw}`)
      }
    }
  }

  console.log('='.repeat(60))
  console.log('\nRequest details:')
  console.log(`  Package ID: ${config.packageId}`)
  console.log(`  Version: ${config.version}`)
  console.log(`  Manifest URL: ${config.manifestUrl}`)
  console.log(`  Notes URL: ${config.notesUrl || '(not provided)'}`)
  console.log(`  Compatibility:`)
  console.log(`    - Minimum: ${config.compatibility.minimum}`)
  console.log(`    - Verified: ${config.compatibility.verified}`)
  console.log(`    - Maximum: ${config.compatibility.maximum || '(none)'}`)
  console.log(`  Dry run: ${config.dryRun ? 'Yes' : 'No'}`)
  console.log('='.repeat(60) + '\n')

  return result.success
}

// Main execution
async function main() {
  console.log('🚀 Foundry VTT Package Release Publisher')
  console.log('='.repeat(60))

  validate()

  const payload = buildPayload()

  console.log('\n📋 Publishing release with the following details:')
  console.log(JSON.stringify(payload, null, 2))
  console.log()

  try {
    const result = await publishRelease(payload)
    const success = displayResult(result)
    process.exit(success ? 0 : 1)
  } catch (error) {
    console.error('❌ Request failed:', error.message)
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  main()
}

module.exports = { publishRelease, buildPayload, validate }
