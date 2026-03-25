#!/usr/bin/env bash
# Copy self-hosted font files from @fontsource packages to public/fonts/
set -euo pipefail

DEST="$(dirname "$0")/../public/fonts"
mkdir -p "$DEST"

# Space Mono — latin subset, weights 400 (normal + italic) and 700 (normal)
cp node_modules/@fontsource/space-mono/files/space-mono-latin-400-normal.woff2 "$DEST/"
cp node_modules/@fontsource/space-mono/files/space-mono-latin-400-italic.woff2 "$DEST/"
cp node_modules/@fontsource/space-mono/files/space-mono-latin-700-normal.woff2 "$DEST/"

# Urbanist — latin subset, weights 400, 600, 700, 800 (normal only)
cp node_modules/@fontsource/urbanist/files/urbanist-latin-400-normal.woff2 "$DEST/"
cp node_modules/@fontsource/urbanist/files/urbanist-latin-600-normal.woff2 "$DEST/"
cp node_modules/@fontsource/urbanist/files/urbanist-latin-700-normal.woff2 "$DEST/"
cp node_modules/@fontsource/urbanist/files/urbanist-latin-800-normal.woff2 "$DEST/"

# Rye — latin subset, weight 400 (Old West style for LP Ranger heading)
cp node_modules/@fontsource/rye/files/rye-latin-400-normal.woff2 "$DEST/"

echo "Fonts copied to $DEST"
