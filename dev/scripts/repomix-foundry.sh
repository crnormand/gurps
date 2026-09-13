#!/bin/bash

cd '/Applications/Foundry Virtual Tabletop.app/Contents'
repomix \
  --include "Resources/app/**/*.mjs,Resources/app/**/*.js,Resources/app/common/**,Resources/app/client/**,*.d.ts" \
  --ignore "node_modules/**,dist/**,build/**,public/**,*.map,packs/**,fonts/**,lang/**,sounds/**,ui/**,*.woff*,*.webp,*.png,*.webm" \
  --compress \
  --output /Volumes/Projects/FoundryVTT/develop/digests/foundry-digest.md \
  --style markdown
