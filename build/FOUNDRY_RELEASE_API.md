# Foundry VTT Package Release API Integration

This document explains how to use the Foundry VTT Package Release API integration for the GURPS system.

## Overview

The GURPS system is configured to automatically publish releases to Foundry VTT using their Package Release API. This eliminates the need to manually update package information on the Foundry website.

## Automatic Release Publishing

### GitHub Actions Workflow

When you create a **full release** (not a prerelease or draft) on GitHub, the release workflow will automatically:

1. Build the system
2. Create and upload release artifacts (`system.json` and `system.zip`)
3. **Publish the release to Foundry VTT** using the Package Release API

The workflow will only publish to Foundry VTT for **full releases**. Prereleases and drafts are not automatically published.

### Setup Requirements

To enable automatic publishing, you need to add your Foundry VTT Package Release Token as a GitHub secret:

1. Go to your package page on https://foundryvtt.com
2. Find the "Package Release Token" field (above the "Save Package" button)
3. Copy the token (starts with `fvttp_`)
4. Go to your GitHub repository → Settings → Secrets and variables → Actions
5. Create a new repository secret named `FVTT_RELEASE_TOKEN`
6. Paste the token value

**⚠️ IMPORTANT:** Keep this token secret! Anyone with this token can update your package on Foundry VTT.

## Manual Release Publishing

### Using NPM Scripts

You can manually publish a release using the provided npm scripts:

#### Dry Run (Test Mode)

```bash
npm run foundry:release:dry-run -- \
  --version "0.18.12" \
  --manifest-url "https://github.com/crnormand/gurps/releases/download/v0.18.12/system.json" \
  --notes-url "https://github.com/crnormand/gurps/releases/tag/v0.18.12"
```

This will validate your release data without actually publishing it.

#### Actual Release

```bash
npm run foundry:release -- \
  --version "0.18.12" \
  --manifest-url "https://github.com/crnormand/gurps/releases/download/v0.18.12/system.json" \
  --notes-url "https://github.com/crnormand/gurps/releases/tag/v0.18.12"
```

### Using the Script Directly

```bash
FVTT_RELEASE_TOKEN="fvttp_your_token_here" node build/foundry-release.cjs \
  --version "0.18.12" \
  --manifest-url "https://github.com/crnormand/gurps/releases/download/v0.18.12/system.json" \
  --notes-url "https://github.com/crnormand/gurps/releases/tag/v0.18.12" \
  --dry-run
```

## Configuration

### Environment Variables

| Variable                      | Required | Default   | Description                                |
| ----------------------------- | -------- | --------- | ------------------------------------------ |
| `FVTT_RELEASE_TOKEN`          | Yes      | -         | Your Foundry VTT package release API token |
| `FVTT_PACKAGE_ID`             | No       | `gurps`   | The package ID                             |
| `FVTT_COMPATIBILITY_MIN`      | No       | `12`      | Minimum compatible Foundry version         |
| `FVTT_COMPATIBILITY_VERIFIED` | No       | `13.351`  | Verified Foundry version                   |
| `FVTT_COMPATIBILITY_MAX`      | No       | _(empty)_ | Maximum compatible Foundry version         |

### Command Line Arguments

| Argument         | Required | Description                                                  |
| ---------------- | -------- | ------------------------------------------------------------ |
| `--version`      | Yes\*    | The version number to publish (e.g., "0.18.12")              |
| `--manifest-url` | Yes      | URL to the versioned system.json manifest                    |
| `--notes-url`    | No       | URL to the release notes (typically the GitHub release page) |
| `--dry-run`      | No       | Test mode - validates without publishing                     |

\* If not provided, the version will be read from `dist/system.json`

## How It Works

1. **Version Detection**: The script reads compatibility information from `dist/system.json` if available
2. **Validation**: Ensures all required fields are present and properly formatted
3. **API Request**: Sends a POST request to `https://foundryvtt.com/_api/packages/release_version/`
4. **Response Handling**: Displays success or error messages with detailed information

### Success Response

When successful, you'll see:

```
✅ SUCCESS!
🎉 Package release published to Foundry VTT!
📦 Package page: https://foundryvtt.com/packages/gurps/edit/
```

### Error Responses

The script handles various error scenarios:

- **400 Bad Request**: Validation errors (missing fields, invalid URLs, etc.)
- **429 Too Many Requests**: Rate limiting (wait before retrying)
- **Duplicate Version**: A release with this version already exists

## Troubleshooting

### Token Issues

If you get authentication errors:

1. Verify the token is correct and starts with `fvttp_`
2. Check it's properly set in GitHub secrets or environment variable
3. Refresh the token on Foundry VTT if you suspect it's been compromised

### Rate Limiting

Foundry VTT limits releases to one per 60 seconds per package. If you hit this limit:

- The response will include a `Retry-After` header telling you how long to wait
- Wait the specified time before trying again

### Duplicate Version Error

If you try to publish a version that already exists:

```json
{
  "status": "error",
  "errors": {
    "__all__": [
      {
        "message": "Package Version with this Package and Version Number already exists.",
        "code": "unique_together"
      }
    ]
  }
}
```

To fix this:

- Use a different version number
- Delete the existing version on Foundry VTT first (if it was a mistake)

### Validation Errors

Common validation errors:

- Invalid URL format for manifest or notes
- Missing required fields
- Invalid version format (use semantic versioning: "1.0.0")

## Best Practices

1. **Always test with --dry-run first** to catch errors before publishing
2. **Use semantic versioning** for your releases (MAJOR.MINOR.PATCH)
3. **Keep your token secure** - never commit it to your repository
4. **Use the automatic workflow** for releases when possible
5. **Test manifest URLs** ensure they're accessible before publishing
6. **Update compatibility** information in system.json to keep it accurate

## References

- [Foundry VTT Package Release API Documentation](https://foundryvtt.com/article/package-release-api/)
- [Semantic Versioning](https://semver.org/)
- The script: [build/foundry-release.cjs](./foundry-release.cjs)
- Release workflow: [.github/workflows/release.yml](../.github/workflows/release.yml)
