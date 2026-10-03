#!/usr/bin/env sh
set -eu

prototype_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
archive="$prototype_dir/vendor.tar.gz"
target="$prototype_dir/dist/vendor"

if [ -d "$target" ]; then
  echo "PDF.js vendor assets already prepared."
  exit 0
fi

if [ ! -f "$archive" ]; then
  echo "Missing vendor archive: $archive" >&2
  exit 1
fi

tar -xzf "$archive" -C "$prototype_dir/dist"
echo "PDF.js vendor assets prepared in $target"
