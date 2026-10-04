import { describe, expect, it } from "vitest";
import { applyHomography, type Homography, type Point, type Quad } from "./homography.ts";
import { IMAGE_CORNERS } from "./state.ts";
import {
  acceptHomography,
  BLOCKS,
  blockGrid,
  blocksOnPaper,
  chooseLineQuad,
  choosePaper,
  cornerNear,
  fitSimilarity,
  type HoughLine,
  MATCH,
  orderCorners,
  PAPER,
  quadArea,
  ratioTest,
  workingSize,
} from "./vision.ts";

const close = (a: readonly Point[], b: readonly Point[], digits = 6) => {
  expect(a).toHaveLength(b.length);
  a.forEach((p, i) => {
    expect(p.x).toBeCloseTo((b[i] as Point).x, digits);
    expect(p.y).toBeCloseTo((b[i] as Point).y, digits);
  });
};

describe("workingSize", () => {
  it("bounds the longer edge and keeps the aspect ratio", () => {
    expect(workingSize(4000, 3000)).toEqual({ width: 1024, height: 768, scale: 0.256 });
    expect(workingSize(3000, 4000, 500)).toEqual({ width: 375, height: 500, scale: 0.125 });
  });

  it("never enlarges and never returns an empty size", () => {
    expect(workingSize(800, 600)).toEqual({ width: 800, height: 600, scale: 1 });
    expect(workingSize(5000, 1).height).toBe(1);
  });
});

describe("orderCorners", () => {
  it("orders four points top-left, top-right, bottom-right, bottom-left", () => {
    const quad: Point[] = [
      { x: 90, y: 85 },
      { x: 10, y: 12 },
      { x: 15, y: 80 },
      { x: 95, y: 5 },
    ];
    expect(orderCorners(quad)).toEqual([
      { x: 10, y: 12 },
      { x: 95, y: 5 },
      { x: 90, y: 85 },
      { x: 15, y: 80 },
    ]);
  });

  it("starts a diamond at its top point and goes clockwise on screen", () => {
    const diamond: Point[] = [
      { x: 0, y: 50 },
      { x: 50, y: 100 },
      { x: 100, y: 50 },
      { x: 50, y: 0 },
    ];
    expect(orderCorners(diamond)).toEqual([
      { x: 50, y: 0 },
      { x: 100, y: 50 },
      { x: 50, y: 100 },
      { x: 0, y: 50 },
    ]);
  });

  it("needs exactly four points", () => {
    expect(orderCorners([{ x: 0, y: 0 }])).toBeNull();
    expect(orderCorners([...IMAGE_CORNERS, { x: 0.5, y: 0.5 }])).toBeNull();
  });
});

describe("quadArea", () => {
  it("is the absolute shoelace area", () => {
    expect(quadArea(IMAGE_CORNERS)).toBe(1);
    expect(quadArea([...IMAGE_CORNERS].reverse())).toBe(1);
  });
});

describe("choosePaper", () => {
  const sheet: Point[] = [
    { x: 520, y: 690 },
    { x: 110, y: 80 },
    { x: 90, y: 700 },
    { x: 560, y: 60 },
  ];
  const sheetArea = quadArea(orderCorners(sheet) as Quad);
  /** A bright sheet on a dark table. */
  const inside = (q: Quad, x: number, y: number) =>
    q.every((a, i) => {
      const b = q[(i + 1) % 4] as Point;
      return (b.x - a.x) * (y - a.y) - (b.y - a.y) * (x - a.x) >= 0;
    });
  const table = (x: number, y: number) => (inside(orderCorners(sheet) as Quad, x, y) ? 230 : 40);

  it("returns the sheet's corners normalized to the image, ordered, with a confidence", () => {
    const paper = choosePaper([{ points: sheet, contourArea: sheetArea * 0.98 }], 640, 800, table);
    expect(paper).not.toBeNull();
    close(paper?.corners ?? [], [
      { x: 110 / 640, y: 80 / 800 },
      { x: 560 / 640, y: 60 / 800 },
      { x: 520 / 640, y: 690 / 800 },
      { x: 90 / 640, y: 700 / 800 },
    ]);
    expect(paper?.confidence).toBeCloseTo(0.98, 6);
  });

  it("takes the largest acceptable candidate", () => {
    const inner = [
      { x: 200, y: 200 },
      { x: 500, y: 200 },
      { x: 500, y: 600 },
      { x: 200, y: 600 },
    ];
    const paper = choosePaper(
      [
        { points: inner, contourArea: 120_000 },
        { points: sheet, contourArea: sheetArea },
      ],
      640,
      800,
      table,
    );
    expect(paper?.corners[0]).toEqual({ x: 110 / 640, y: 80 / 800 });
  });

  it("rejects candidates that are small, not four-sided, concave, or poorly filled", () => {
    const small = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 },
    ];
    const arrow = [
      { x: 0, y: 0 },
      { x: 600, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 700 },
    ];
    expect(
      choosePaper(
        [
          { points: small, contourArea: 10_000 },
          { points: sheet.slice(0, 3), contourArea: sheetArea },
          { points: arrow, contourArea: 100_000 },
          { points: sheet, contourArea: sheetArea * (PAPER.minFill - 0.05) },
        ],
        640,
        800,
        table,
      ),
    ).toBeNull();
    expect(choosePaper([], 640, 800, table)).toBeNull();
  });

  it("rejects a quad that is not brighter than its surroundings, like a drawing's outline", () => {
    const candidate = [{ points: sheet, contourArea: sheetArea }];
    expect(choosePaper(candidate, 640, 800, () => 230)).toBeNull();
    // Dark strokes just inside the outline, white paper outside it.
    expect(choosePaper(candidate, 640, 800, (x, y) => 270 - table(x, y))).toBeNull();
  });

  it("rejects a quad whose surroundings lie mostly outside the image", () => {
    const frame = [
      { x: 2, y: 2 },
      { x: 638, y: 2 },
      { x: 638, y: 798 },
      { x: 2, y: 798 },
    ];
    const area = quadArea(frame);
    expect(choosePaper([{ points: frame, contourArea: area }], 640, 800, () => 230)).toBeNull();
  });

  it("caps the confidence when the contour is larger than its quad", () => {
    const paper = choosePaper([{ points: sheet, contourArea: sheetArea * 1.03 }], 640, 800, table);
    expect(paper?.confidence).toBeCloseTo(1 / 1.03, 6);
  });
});

describe("ratioTest", () => {
  it("keeps matches clearly better than the second-best neighbour", () => {
    const kept = ratioTest([
      [
        { queryIdx: 0, trainIdx: 4, distance: 10 },
        { queryIdx: 0, trainIdx: 7, distance: 40 },
      ],
      [
        { queryIdx: 1, trainIdx: 2, distance: 30 },
        { queryIdx: 1, trainIdx: 3, distance: 31 },
      ],
      [{ queryIdx: 2, trainIdx: 9, distance: 5 }],
      [],
    ]);
    expect(kept).toEqual([{ queryIdx: 0, trainIdx: 4 }]);
  });

  it("uses the given ratio", () => {
    const pair = [
      { queryIdx: 0, trainIdx: 1, distance: 30 },
      { queryIdx: 0, trainIdx: 2, distance: 31 },
    ];
    expect(ratioTest([pair], 0.99)).toHaveLength(1);
  });
});

describe("acceptHomography", () => {
  const reference = { width: 500, height: 400 };
  const original = { width: 1000, height: 800 };
  const evidence = (h: Homography | null, inliers = 80, matches = 120) => ({
    h,
    inliers,
    matches,
    reference,
    original,
  });

  it("expresses an accepted homography as reference image corners on the original", () => {
    // Twice the size and 10 % right: the reference covers x 0.1–1.1 of the original.
    const h = [2, 0, 100, 0, 2, 0, 0, 0, 1];
    const result = acceptHomography(evidence(h));
    expect(result.accepted).toBe(true);
    if (!result.accepted) return;
    close(result.corners, [
      { x: 0.1, y: 0 },
      { x: 1.1, y: 0 },
      { x: 1.1, y: 1 },
      { x: 0.1, y: 1 },
    ]);
    expect(result.confidence).toBeCloseTo(80 / 120, 6);
  });

  it("takes the block matcher's own inlier limits (D-060)", () => {
    const h = [2, 0, 0, 0, 2, 0, 0, 0, 1];
    expect(acceptHomography(evidence(h, 10, 20)).accepted).toBe(false);
    expect(acceptHomography(evidence(h, 10, 20), BLOCKS).accepted).toBe(true);
    expect(acceptHomography(evidence(h, 7, 12), BLOCKS)).toEqual({
      accepted: false,
      reason: "few-inliers",
    });
  });

  it("keeps a perspective result that the four-corner warp reproduces", () => {
    const h = [1.6, 0.1, 120, 0.05, 1.7, 60, 0.0002, 0.0001, 1];
    const result = acceptHomography(evidence(h));
    expect(result.accepted).toBe(true);
    if (!result.accepted) return;
    const mapped = applyHomography(h, { x: 500, y: 400 });
    expect(result.corners[2].x).toBeCloseTo(mapped.x / 1000, 9);
    expect(result.corners[2].y).toBeCloseTo(mapped.y / 800, 9);
  });

  it("rejects missing, weak, or ambiguous evidence", () => {
    const h = [2, 0, 0, 0, 2, 0, 0, 0, 1];
    expect(acceptHomography(evidence(null))).toEqual({ accepted: false, reason: "no-homography" });
    expect(acceptHomography(evidence(h, MATCH.minInliers - 1, 30))).toEqual({
      accepted: false,
      reason: "few-inliers",
    });
    expect(acceptHomography(evidence(h, 40, 200))).toEqual({
      accepted: false,
      reason: "low-inlier-ratio",
    });
    expect(acceptHomography(evidence(h, 40, 0)).accepted).toBe(false);
    expect(acceptHomography(evidence([2, 0, 0, 0, 2, 0, 0, 0, Number.NaN]))).toEqual({
      accepted: false,
      reason: "no-homography",
    });
    expect(acceptHomography(evidence([2, 0, 0]))).toEqual({
      accepted: false,
      reason: "no-homography",
    });
  });

  it("rejects mirrored, folded, behind-the-camera, tiny and huge quads", () => {
    const mirrored = [-2, 0, 1000, 0, 2, 0, 0, 0, 1];
    const behind = [1, 0, 0, 0, 1, 0, -0.004, 0, 1];
    const folded = [2, 0, 0, 0, 2, 0, 0.0035, 0.004, -1];
    const tiny = [0.1, 0, 0, 0, 0.1, 0, 0, 0, 1];
    const huge = [20, 0, -5000, 0, 20, -4000, 0, 0, 1];
    for (const h of [mirrored, behind, folded]) {
      expect(acceptHomography(evidence(h))).toEqual({ accepted: false, reason: "degenerate" });
    }
    expect(acceptHomography(evidence(tiny))).toEqual({ accepted: false, reason: "implausible" });
    expect(acceptHomography(evidence(huge))).toEqual({ accepted: false, reason: "implausible" });
  });

  it("rejects a quad that lands far outside the original", () => {
    const shifted = [2, 0, 2500, 0, 2, 0, 0, 0, 1];
    expect(acceptHomography(evidence(shifted))).toEqual({
      accepted: false,
      reason: "implausible",
    });
  });
});

describe("chooseLineQuad (a sheet whose outline has gaps)", () => {
  const W = 400;
  const H = 500;
  /** Edge map: true within 2 px of any of the given segments. */
  function edges(segments: [number, number, number, number][]) {
    return (x: number, y: number) =>
      segments.some(([x1, y1, x2, y2]) => {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)));
        return Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy)) <= 2;
      });
  }
  const horizontal = (y: number): HoughLine => ({ rho: y, theta: Math.PI / 2 });
  const vertical = (x: number): HoughLine => ({ rho: x, theta: 0 });
  const near = (q: readonly Point[], expected: [number, number][]) =>
    q.forEach((p, i) => {
      expect(p.x * W).toBeCloseTo((expected[i] as [number, number])[0], -0.5);
      expect(p.y * H).toBeCloseTo((expected[i] as [number, number])[1], -0.5);
    });

  it("closes a board outline with gaps from its four edge lines", () => {
    // Each side is 80 % visible: the outline never closes, so no contour would find it.
    const seen = edges([
      [60, 50, 300, 50],
      [340, 60, 340, 380],
      [100, 450, 340, 450],
      [60, 120, 60, 450],
    ]);
    const lines = [horizontal(50), vertical(340), horizontal(450), vertical(60)];
    const paper = chooseLineQuad(lines, W, H, seen);
    near(paper?.corners ?? [], [
      [60, 50],
      [340, 50],
      [340, 450],
      [60, 450],
    ]);
    expect(paper?.confidence).toBeGreaterThan(0.6);
    // A guess from straight lines is never certain: the app asks to check the corners.
    expect(paper?.confidence).toBeLessThan(0.95);
  });

  it("prefers the whole board over a better-supported smaller quad", () => {
    // The board's left edge is outside the photo; the drawing's tower edge is a strong line.
    const seen = edges([
      [0, 40, 390, 40],
      [390, 40, 390, 460],
      [0, 460, 390, 460],
      [200, 40, 200, 460],
    ]);
    const lines = [vertical(200), horizontal(40), vertical(390), horizontal(460)];
    const corners = chooseLineQuad(lines, W, H, seen)?.corners ?? [];
    expect((corners[0]?.x ?? 1) * W).toBeLessThan(2);
  });

  it("uses the image border for a side that lies outside the photo, with lower confidence", () => {
    const seen = edges([
      [0, 50, 340, 50],
      [340, 50, 340, 450],
      [0, 450, 340, 450],
    ]);
    const paper = chooseLineQuad([horizontal(50), vertical(340), horizontal(450)], W, H, seen);
    expect((paper?.corners[0]?.x ?? 1) * W).toBeLessThan(2);
    expect(paper?.confidence).toBeLessThan(0.95);
  });

  it("prefers the sheet over a longer table edge and the drawing's own lines", () => {
    const seen = edges([
      [0, 20, 400, 20], // table edge across the whole photo
      [60, 80, 340, 80],
      [340, 80, 340, 450],
      [60, 450, 340, 450],
      [60, 80, 60, 450],
      [180, 150, 180, 400], // a straight stroke of the drawing
    ]);
    const lines = [
      horizontal(20),
      vertical(180),
      horizontal(80),
      vertical(340),
      horizontal(450),
      vertical(60),
    ];
    near(chooseLineQuad(lines, W, H, seen)?.corners ?? [], [
      [60, 80],
      [340, 80],
      [340, 450],
      [60, 450],
    ]);
  });

  it("finds nothing without at least three well-supported edges", () => {
    const seen = edges([
      [60, 50, 340, 50],
      [60, 450, 340, 450],
    ]);
    expect(chooseLineQuad([horizontal(50), horizontal(450)], W, H, seen)).toBeNull();
    // Lines the edges do not back up (a drawing's long Hough votes) are not a sheet.
    expect(
      chooseLineQuad(
        [horizontal(50), vertical(340), horizontal(450), vertical(60)],
        W,
        H,
        () => false,
      ),
    ).toBeNull();
  });

  it("ignores steep diagonals and small quads", () => {
    const seen = edges([
      [150, 200, 250, 200],
      [250, 200, 250, 300],
      [150, 300, 250, 300],
      [150, 200, 150, 300],
    ]);
    const lines = [
      horizontal(200),
      vertical(250),
      horizontal(300),
      vertical(150),
      { rho: 100, theta: Math.PI / 4 },
    ];
    expect(chooseLineQuad(lines, W, H, seen)).toBeNull();
  });
});

describe("blockGrid (D-060)", () => {
  it("spreads blocks evenly with every search window inside the image", () => {
    const grid = blockGrid(200, 100, 20, 10, 3, 2);
    expect(grid).toEqual([
      { x: 10, y: 10 },
      { x: 90, y: 10 },
      { x: 170, y: 10 },
      { x: 10, y: 70 },
      { x: 90, y: 70 },
      { x: 170, y: 70 },
    ]);
    const centred = blockGrid(100, 100, 20, 10, 1, 1);
    expect(centred).toEqual([{ x: 40, y: 40 }]);
    expect(blockGrid(30, 100, 20, 10)).toEqual([]);
  });
});

describe("blocksOnPaper (D-060)", () => {
  it("keeps only blocks wholly inside the paper, for either corner winding", () => {
    const paper = [
      { x: 10, y: 10 },
      { x: 90, y: 20 },
      { x: 90, y: 90 },
      { x: 10, y: 90 },
    ];
    const blocks = [
      { x: 20, y: 30 }, // inside
      { x: 75, y: 10 }, // top edge slopes down: its top right corner is off the paper
      { x: 0, y: 50 }, // left of the paper
    ];
    expect(blocksOnPaper(blocks, 10, paper)).toEqual([{ x: 20, y: 30 }]);
    expect(blocksOnPaper(blocks, 10, [...paper].reverse())).toEqual([{ x: 20, y: 30 }]);
  });
});

describe("fitSimilarity (D-060)", () => {
  it("recovers scale, rotation and shift from a column of points despite outliers", () => {
    // A tower: points stacked in one narrow column, the drawing 2 % larger, 1° turned, moved.
    const src = [0, 1, 2, 3, 4, 5, 6, 7].map((k) => ({ x: 200 + (k % 2) * 30, y: 100 + 40 * k }));
    const angle = Math.PI / 180;
    const s = 1.02;
    const truth = [
      s * Math.cos(angle),
      -s * Math.sin(angle),
      6,
      s * Math.sin(angle),
      s * Math.cos(angle),
      -4,
      0,
      0,
      1,
    ];
    const dst = src.map((p) => applyHomography(truth, p));
    // Two blocks matched repeating texture far off.
    dst[1] = { x: (dst[1]?.x ?? 0) + 35, y: dst[1]?.y ?? 0 };
    dst[6] = { x: dst[6]?.x ?? 0, y: (dst[6]?.y ?? 0) - 28 };
    const { h, inliers } = fitSimilarity(src, dst, 1.5);
    expect(inliers).toBe(6);
    const far = applyHomography(h ?? [], { x: 500, y: 500 });
    const want = applyHomography(truth, { x: 500, y: 500 });
    expect(far.x).toBeCloseTo(want.x, 6);
    expect(far.y).toBeCloseTo(want.y, 6);
  });

  it("finds nothing in fewer than two agreeing points", () => {
    expect(fitSimilarity([{ x: 1, y: 1 }], [{ x: 2, y: 2 }], 1)).toEqual({ h: null, inliers: 0 });
    const same = [
      { x: 5, y: 5 },
      { x: 5, y: 5 },
    ];
    expect(fitSimilarity(same, same, 1)).toEqual({ h: null, inliers: 0 });
  });
});

describe("cornerNear (D-061)", () => {
  // A 200 × 200 photo: a sheet (grey 200) on a board (grey 190), its top-left corner at
  // (60, 70), tilted by 2°, under canvas-like texture of ±8.
  const tilt = (2 * Math.PI) / 180;
  const texture = (x: number, y: number) => 8 * Math.sin(x * 2.1) * Math.cos(y * 1.7);
  const onSheet = (x: number, y: number) => {
    const u = (x - 60) * Math.cos(tilt) + (y - 70) * Math.sin(tilt);
    const v = -(x - 60) * Math.sin(tilt) + (y - 70) * Math.cos(tilt);
    return u >= 0 && v >= 0;
  };
  const photo = (x: number, y: number) =>
    x < 0 || y < 0 || x >= 200 || y >= 200
      ? Number.NaN
      : (onSheet(x, y) ? 200 : 190) + texture(Math.round(x), Math.round(y));
  // The ring was dropped 10 px off; its neighbours sit roughly along the sheet's edges.
  const ring = { x: 52, y: 78 };
  const neighbours = [
    { x: 190, y: 72 },
    { x: 58, y: 190 },
  ] as const;

  it("finds a faint, tilted corner under texture", () => {
    const at = cornerNear(ring, neighbours, photo, 20);
    expect(at?.x).toBeCloseTo(60, 0);
    expect(at?.y).toBeCloseTo(70, 0);
  });

  it("finds nothing on texture alone, or beyond the search distance", () => {
    const blank = (x: number, y: number) => 190 + texture(Math.round(x), Math.round(y));
    expect(cornerNear(ring, neighbours, blank, 20)).toBeNull();
    expect(cornerNear({ x: 20, y: 120 }, neighbours, photo, 20)).toBeNull();
  });

  it("prefers the nearer of nested edges", () => {
    // The board's own corner at (30, 40), a much stronger step to the darker table.
    const nested = (x: number, y: number) =>
      x < 30 || y < 40 ? 120 + texture(Math.round(x), Math.round(y)) : photo(x, y);
    const at = cornerNear(ring, neighbours, nested, 20);
    expect(at?.x).toBeCloseTo(60, 0);
    expect(at?.y).toBeCloseTo(70, 0);
  });
});
