import { moveCorner, type Point, type Quad } from "@nextstroke/compare";
import { type MessageKey, t } from "@nextstroke/ui";
import { useRef, useState } from "react";
import type { VisionDeps } from "../compare/visionClient.ts";
import { guessCorners, INSET_CORNERS, snapCorner } from "./paper.ts";
import type { CornerProps } from "./screens/PhotoScreen.tsx";

/**
 * Paper corners of one photo (the original or a checkpoint): the automatic guess, dragging,
 * and snapping on drop (D-061, D-062). `say` receives the status line.
 */
export function useCorners(vision: VisionDeps | null, say: (text: string) => void) {
  const [image, setImage] = useState<ImageBitmap | null>(null);
  const [quad, setQuad] = useState<Quad>(INSET_CORNERS);
  const [unsure, setUnsure] = useState<number[]>([]);
  /** Set once the user moves a ring, so a late guess does not overwrite it. */
  const moved = useRef(false);
  /** Bumped per photo, so a guess for an earlier photo is ignored. */
  const photo = useRef(0);
  const snaps = useRef(new Map<number, Point[]>());

  /**
   * A new photo: `known` corners saved earlier, else the automatic guess; without a sheet the
   * rings sit at `fallback` and `missing` is said (a digital template uses the whole image).
   */
  const start = (
    bitmap: ImageBitmap,
    options: { known?: Quad; fallback?: Quad; missing?: MessageKey } = {},
  ) => {
    const { known, fallback = INSET_CORNERS, missing = "guided.corners.missing" } = options;
    const id = ++photo.current;
    setImage(bitmap);
    setQuad(known ?? fallback);
    setUnsure([]);
    moved.current = false;
    snaps.current = new Map();
    if (known) return;
    say(t("guided.corners.finding"));
    void guessCorners(vision, bitmap, fallback).then((guess) => {
      if (moved.current || id !== photo.current) return;
      setQuad(guess.quad);
      setUnsure(guess.unsure);
      say(
        t(
          !guess.found
            ? missing
            : guess.unsure.length
              ? "guided.corners.check"
              : "guided.corners.found",
        ),
      );
    });
  };

  /** No photo any more (a template removed); a late guess for the old one is ignored. */
  const clear = () => {
    photo.current++;
    setImage(null);
  };

  const onMove = (index: number, point: Point) => {
    moved.current = true;
    setQuad((q) => moveCorner(q, index, point));
    setUnsure((u) => u.filter((i) => i !== index));
  };

  const onDrop = async (index: number) => {
    if (!image) return;
    const earlier = snaps.current.get(index) ?? [];
    const found = await snapCorner(vision, image, quad, index, earlier);
    if (!found) return;
    snaps.current.set(index, [...earlier, found]);
    setQuad((q) => moveCorner(q, index, found));
    say(t("status.snapped"));
  };

  const props: CornerProps | null = image
    ? { quad, unsure, onMove, onDrop: (i) => void onDrop(i) }
    : null;
  return { image, quad, start, clear, props };
}
