export interface ShareDeps {
  canShare(data: ShareData): boolean;
  share(data: ShareData): Promise<void>;
  download(file: File): void;
}

/** Share sheet first; a cancelled share does nothing; anything else falls back to a download. */
export async function shareOrDownload(
  file: File,
  deps: ShareDeps,
): Promise<"shared" | "cancelled" | "downloaded"> {
  const data = { files: [file], title: file.name };
  if (deps.canShare(data)) {
    try {
      await deps.share(data);
      return "shared";
    } catch (error) {
      if ((error as { name?: string }).name === "AbortError") return "cancelled";
    }
  }
  deps.download(file);
  return "downloaded";
}
