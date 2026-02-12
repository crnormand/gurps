#!/bin/bash

# Example script for publishing GURPS releases to Foundry VTT
# This script shows different usage scenarios

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if FVTT_RELEASE_TOKEN is set
if [ -z "$FVTT_RELEASE_TOKEN" ]; then
    echo -e "${RED}Error: FVTT_RELEASE_TOKEN environment variable is not set${NC}"
    echo "Set it with: export FVTT_RELEASE_TOKEN='fvttp_your_token_here'"
    exit 1
fi

# Function to print usage
usage() {
    echo "Usage: $0 <command> [options]"
    echo ""
    echo "Commands:"
    echo "  dry-run <version> <tag>     Test release publishing (doesn't actually publish)"
    echo "  publish <version> <tag>     Publish a release to Foundry VTT"
    echo "  latest                      Publish the latest version from dist/system.json"
    echo ""
    echo "Examples:"
    echo "  $0 dry-run 0.18.12 v0.18.12"
    echo "  $0 publish 0.18.12 v0.18.12"
    echo "  $0 latest"
    echo ""
}

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
REPO="crnormand/gurps"  # Update this to match your repository

# Command handlers
case "$1" in
    dry-run)
        if [ -z "$2" ] || [ -z "$3" ]; then
            echo -e "${RED}Error: Version and tag required${NC}"
            usage
            exit 1
        fi
        
        VERSION="$2"
        TAG="$3"
        
        echo -e "${YELLOW}🔍 Testing release publication (dry run)${NC}"
        echo "Version: $VERSION"
        echo "Tag: $TAG"
        echo ""
        
        node "$SCRIPT_DIR/foundry-release.js" \
            --version "$VERSION" \
            --manifest-url "https://github.com/$REPO/releases/download/$TAG/system.json" \
            --notes-url "https://github.com/$REPO/releases/tag/$TAG" \
            --dry-run
        ;;
        
    publish)
        if [ -z "$2" ] || [ -z "$3" ]; then
            echo -e "${RED}Error: Version and tag required${NC}"
            usage
            exit 1
        fi
        
        VERSION="$2"
        TAG="$3"
        
        echo -e "${YELLOW}⚠️  Publishing release to Foundry VTT${NC}"
        echo "Version: $VERSION"
        echo "Tag: $TAG"
        echo ""
        read -p "Are you sure you want to publish this release? (yes/no): " confirm
        
        if [ "$confirm" != "yes" ]; then
            echo "Publication cancelled."
            exit 0
        fi
        
        node "$SCRIPT_DIR/foundry-release.js" \
            --version "$VERSION" \
            --manifest-url "https://github.com/$REPO/releases/download/$TAG/system.json" \
            --notes-url "https://github.com/$REPO/releases/tag/$TAG"
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ Successfully published!${NC}"
        else
            echo -e "${RED}❌ Publication failed!${NC}"
            exit 1
        fi
        ;;
        
    latest)
        SYSTEM_JSON="$SCRIPT_DIR/../dist/system.json"
        
        if [ ! -f "$SYSTEM_JSON" ]; then
            echo -e "${RED}Error: dist/system.json not found. Run 'npm run build' first.${NC}"
            exit 1
        fi
        
        # Extract version from system.json using node
        VERSION=$(node -p "require('$SYSTEM_JSON').version")
        TAG="v$VERSION"
        
        echo -e "${YELLOW}📦 Publishing latest version from dist/system.json${NC}"
        echo "Version: $VERSION"
        echo "Tag: $TAG"
        echo ""
        
        # First do a dry run
        echo "Running dry-run first..."
        node "$SCRIPT_DIR/foundry-release.js" \
            --version "$VERSION" \
            --manifest-url "https://github.com/$REPO/releases/download/$TAG/system.json" \
            --notes-url "https://github.com/$REPO/releases/tag/$TAG" \
            --dry-run
        
        if [ $? -ne 0 ]; then
            echo -e "${RED}❌ Dry run failed! Fix errors before publishing.${NC}"
            exit 1
        fi
        
        echo ""
        read -p "Dry run successful. Publish for real? (yes/no): " confirm
        
        if [ "$confirm" != "yes" ]; then
            echo "Publication cancelled."
            exit 0
        fi
        
        node "$SCRIPT_DIR/foundry-release.js" \
            --version "$VERSION" \
            --manifest-url "https://github.com/$REPO/releases/download/$TAG/system.json" \
            --notes-url "https://github.com/$REPO/releases/tag/$TAG"
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ Successfully published version $VERSION!${NC}"
        else
            echo -e "${RED}❌ Publication failed!${NC}"
            exit 1
        fi
        ;;
        
    *)
        usage
        exit 1
        ;;
esac
