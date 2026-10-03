#!/usr/bin/env sh
# Downloads the pinned prebuilt opencv.js into dist/vendor/ (git-ignored) and verifies it.
set -eu

dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
version="5.0.0-release.1"
sha256="5f2289421462489de42444d8ddc59ed035de13458fd8d9d390616f9c53b35434"
url="https://registry.npmjs.org/@techstark/opencv-js/-/opencv-js-$version.tgz"
target="$dir/dist/vendor"

if [ -f "$target/opencv.js" ]; then
  echo "opencv.js already present"
  exit 0
fi

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
curl -fsSL "$url" -o "$tmp/opencv.tgz"
echo "$sha256  $tmp/opencv.tgz" | sha256sum -c - >/dev/null
tar -xzf "$tmp/opencv.tgz" -C "$tmp"
mkdir -p "$target"
cp "$tmp/package/dist/opencv.js" "$target/opencv.js"
echo "opencv.js $version (Apache-2.0) prepared in $target"
