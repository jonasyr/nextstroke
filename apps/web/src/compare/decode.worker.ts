/// <reference lib="webworker" />
import { decodeToWorking } from "./decode.ts";

// Decoding runs off the main thread (Task 1): the probe measured main-thread blocks up to 285 ms.
const scope = self as unknown as DedicatedWorkerGlobalScope;
scope.onmessage = async (event: MessageEvent<{ id: number; blob: Blob }>) => {
  const { id, blob } = event.data;
  try {
    const decoded = await decodeToWorking(blob, (source, options) =>
      createImageBitmap(source, options),
    );
    scope.postMessage({ id, decoded }, [decoded.bitmap]);
  } catch (error) {
    scope.postMessage({ id, error: String(error) });
  }
};
