import type { Quad } from "@nextstroke/compare";
import type { ProjectStore } from "@nextstroke/projects";
import { t } from "@nextstroke/ui";
import { pairsToQuad } from "./straighten.ts";

/** One image of a Quick Compare pair, with its saved paper corners when there are any. */
export interface PairImage {
  blob: Blob;
  name: string;
  corners?: Quad;
}

/** What Quick Compare opens from a project: the drawing and what it is compared against. */
export interface ComparePair {
  original: PairImage;
  reference: PairImage;
}

/**
 * The pair a project opens in Quick Compare (D-070): the latest drawing (newest checkpoint, else
 * the start) against the template; without a template, the latest checkpoint against the start.
 * Null when there is nothing to compare yet.
 */
export async function projectPair(store: ProjectStore, id: string): Promise<ComparePair | null> {
  const project = await store.getProject(id);
  if (!project) return null;
  const latest = project.checkpoints.at(-1);
  const load = async (
    assetId: string,
    name: string,
    corners: readonly (readonly [number, number])[] | undefined,
  ): Promise<PairImage | null> => {
    const asset = await store.getAsset(assetId);
    if (!asset) return null;
    return {
      blob: new Blob([new Uint8Array(asset.bytes)], { type: asset.record.mimeType }),
      name,
      ...(corners ? { corners: pairsToQuad(corners) } : {}),
    };
  };
  const drawing = latest
    ? await load(
        latest.assetId,
        t("compare.latest", { n: String(project.checkpoints.length) }),
        latest.paperCorners,
      )
    : await load(project.originalAssetId, t("compare.start"), project.paperCorners);
  const reference = project.referenceAssetId
    ? await load(project.referenceAssetId, t("project.template"), project.referenceCorners)
    : latest
      ? await load(project.originalAssetId, t("compare.start"), project.paperCorners)
      : null;
  return drawing && reference ? { original: drawing, reference } : null;
}
