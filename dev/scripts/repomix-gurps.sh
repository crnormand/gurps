#!/bin/bash

cd /Volumes/Projects/FoundryVTT/develop/gurps_v1
repomix \
  --ignore "node_modules/**,dist/**,build/**,*.map,.git/**,packs/**,**/*.log,.history/**,.vscode/**,.github/**,.husky/**,coverage/**" \
  --compress \
  --output ../digests/gurps-digest.md \
  --style markdown

