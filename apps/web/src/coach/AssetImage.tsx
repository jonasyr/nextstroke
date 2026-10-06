import type { ProjectStore } from "@nextstroke/projects";
import { useEffect, useState } from "react";

/** An immutable asset from the project store as an image; nothing while it loads or fails. */
export function AssetImage({
  store,
  assetId,
  className,
}: {
  store: ProjectStore;
  assetId: string;
  className?: string;
}) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    let made: string | null = null;
    store
      .getAsset(assetId)
      .then((asset) => {
        if (!live || !asset || typeof URL.createObjectURL !== "function") return;
        made = URL.createObjectURL(
          new Blob([new Uint8Array(asset.bytes)], { type: asset.record.mimeType }),
        );
        setUrl(made);
      })
      .catch(() => undefined);
    return () => {
      live = false;
      if (made) URL.revokeObjectURL(made);
    };
  }, [store, assetId]);
  return url ? <img src={url} alt="" className={className} /> : <span className={className} />;
}
