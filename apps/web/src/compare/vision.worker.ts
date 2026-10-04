/// <reference lib="webworker" />
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
  type Neighbour,
  type PaperCandidate,
  type Point,
  type Quad,
  ratioTest,
  SNAP,
  workingSize,
} from "@nextstroke/compare";
import opencvUrl from "@techstark/opencv-js/dist/opencv.js?url";
import type { VisionRequest, VisionResponse } from "./visionClient.ts";

/**
 * opencv.js adapter (D-055): paper detection (jscanify approach) and ORB feature homography on
 * copies of at most 1024 px. Every accept or reject decision is in @nextstroke/compare
 * (vision.ts); this file only calls opencv.js. Exercised in a real browser (apps/web/e2e).
 */

type Cv = typeof import("@techstark/opencv-js");
interface Mat {
  delete(): void;
}

const scope = self as unknown as DedicatedWorkerGlobalScope & { cv?: unknown };
let cv: Cv;

/**
 * Classic worker plus importScripts, as in the iPhone probe (843 ms on an iPhone 13 mini). If
 * the script cannot load (offline before the precache finished, or a module worker), the
 * error reply makes vision unavailable and Quick Compare carries on without it.
 */
async function loadOpenCv(): Promise<number> {
  const start = performance.now();
  scope.importScripts(opencvUrl);
  let module = scope.cv as Cv | Promise<Cv>;
  if (module && typeof (module as Promise<Cv>).then === "function") module = await module;
  const ready = module as Cv & { onRuntimeInitialized?: () => void };
  if (!ready.Mat) {
    await new Promise<void>((resolve) => {
      ready.onRuntimeInitialized = resolve;
    });
  }
  cv = ready;
  return Math.round(performance.now() - start);
}

/** Grayscale working copy (≤ 1024 px) of a transferred bitmap, which is closed afterwards. */
function grayOf(
  image: ImageBitmap,
  track: Mat[],
  size: { width: number; height: number } = workingSize(image.width, image.height),
) {
  const canvas = new OffscreenCanvas(size.width, size.height);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("no 2d context in the vision worker");
  ctx.drawImage(image, 0, 0, size.width, size.height);
  image.close();
  const rgba = cv.matFromImageData(ctx.getImageData(0, 0, size.width, size.height));
  const gray = new cv.Mat();
  track.push(rgba, gray);
  cv.cvtColor(rgba, gray, cv.COLOR_RGBA2GRAY);
  return { gray, size };
}

function detectPaper(image: ImageBitmap) {
  const track: Mat[] = [];
  try {
    const { gray, size } = grayOf(image, track);
    const blurred = new cv.Mat();
    const edges = new cv.Mat();
    const kernel = cv.Mat.ones(3, 3, cv.CV_8U);
    const contours = new cv.MatVector();
    const hierarchy = new cv.Mat();
    track.push(blurred, edges, kernel, contours, hierarchy);
    cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);
    cv.Canny(blurred, edges, 50, 150);
    cv.dilate(edges, edges, kernel);
    // Every contour, not only the outermost: the inner edge of the sheet's outline survives a
    // busy background that merges with the outer one.
    cv.findContours(edges, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);
    const candidates: PaperCandidate[] = [];
    const minArea = 0.15 * size.width * size.height;
    for (let i = 0; i < contours.size(); i++) {
      const contour = contours.get(i);
      track.push(contour);
      const contourArea = cv.contourArea(contour);
      if (contourArea < minArea) continue;
      const approx = new cv.Mat();
      track.push(approx);
      cv.approxPolyDP(contour, approx, 0.02 * cv.arcLength(contour, true), true);
      const data = approx.data32S;
      const points = [];
      for (let k = 0; k + 1 < data.length; k += 2) {
        points.push({ x: data[k] as number, y: data[k + 1] as number });
      }
      candidates.push({ points, contourArea });
    }
    return (
      choosePaper(candidates, size.width, size.height, (x, y) => gray.ucharAt(y, x)) ??
      paperFromLines(gray, size, track)
    );
  } finally {
    for (const m of track) m.delete();
  }
}

/**
 * Second try for an outline with gaps (D-057): at 512 px with a stronger blur and a lower
 * Canny threshold, straight Hough lines become the sides; the dilated edges score them.
 */
function paperFromLines(
  gray: InstanceType<Cv["Mat"]>,
  size: { width: number; height: number },
  track: Mat[],
) {
  const small = workingSize(size.width, size.height, 512);
  const scaled = new cv.Mat();
  const blurred = new cv.Mat();
  const edges = new cv.Mat();
  const near = new cv.Mat();
  const lines = new cv.Mat();
  const kernel = cv.Mat.ones(5, 5, cv.CV_8U);
  track.push(scaled, blurred, edges, near, lines, kernel);
  cv.resize(gray, scaled, new cv.Size(small.width, small.height), 0, 0, cv.INTER_AREA);
  cv.GaussianBlur(scaled, blurred, new cv.Size(7, 7), 0);
  cv.Canny(blurred, edges, 15, 45);
  cv.HoughLines(
    edges,
    lines,
    1,
    Math.PI / 180,
    Math.round(0.2 * Math.min(small.width, small.height)),
  );
  const found: HoughLine[] = [];
  for (let i = 0; i < Math.min(lines.rows, 60); i++) {
    found.push({ rho: lines.data32F[2 * i] as number, theta: lines.data32F[2 * i + 1] as number });
  }
  cv.dilate(edges, near, kernel);
  return chooseLineQuad(found, small.width, small.height, (x, y) => near.ucharAt(y, x) > 0);
}

function align(original: ImageBitmap, reference: ImageBitmap) {
  const track: Mat[] = [];
  try {
    const ref = grayOf(reference, track);
    const orig = grayOf(original, track);
    const orb = new cv.ORB(2000);
    const noMask = new cv.Mat();
    const refPoints = new cv.KeyPointVector();
    const origPoints = new cv.KeyPointVector();
    const refDescriptors = new cv.Mat();
    const origDescriptors = new cv.Mat();
    const matcher = new cv.BFMatcher(cv.NORM_HAMMING, false);
    const knn = new cv.DMatchVectorVector();
    track.push(orb, noMask, refPoints, origPoints, refDescriptors, origDescriptors, matcher, knn);
    orb.detectAndCompute(ref.gray, noMask, refPoints, refDescriptors);
    orb.detectAndCompute(orig.gray, noMask, origPoints, origDescriptors);
    const sizes = { reference: ref.size, original: orig.size };
    if (refDescriptors.rows < 2 || origDescriptors.rows < 2) {
      return acceptHomography({ h: null, inliers: 0, matches: 0, ...sizes });
    }
    matcher.knnMatch(refDescriptors, origDescriptors, knn, 2);
    const pairs: Neighbour[][] = [];
    for (let i = 0; i < knn.size(); i++) {
      const row = knn.get(i);
      const pair: Neighbour[] = [];
      for (let k = 0; k < row.size(); k++) pair.push(row.get(k));
      pairs.push(pair);
    }
    const good = ratioTest(pairs);
    if (good.length < 4) {
      return acceptHomography({ h: null, inliers: 0, matches: good.length, ...sizes });
    }
    const src = good.flatMap((m) => {
      const p = refPoints.get(m.queryIdx).pt;
      return [p.x, p.y];
    });
    const dst = good.flatMap((m) => {
      const p = origPoints.get(m.trainIdx).pt;
      return [p.x, p.y];
    });
    const srcMat = cv.matFromArray(good.length, 1, cv.CV_32FC2, src);
    const dstMat = cv.matFromArray(good.length, 1, cv.CV_32FC2, dst);
    const inlierMask = new cv.Mat();
    track.push(srcMat, dstMat, inlierMask);
    const h = cv.findHomography(srcMat, dstMat, cv.RANSAC, 3, inlierMask);
    track.push(h);
    const inliers = h.empty() ? 0 : cv.countNonZero(inlierMask);
    return acceptHomography({
      h: h.empty() ? null : Array.from(h.data64F),
      inliers,
      matches: good.length,
      ...sizes,
    });
  } finally {
    for (const m of track) m.delete();
  }
}

/**
 * Block matching of the Vorlage, already warped by the placed corners, onto the drawing
 * (D-060). Both are compared at the drawing's working size, so a block's own place is its
 * expected place; the found shifts give a RANSAC homography.
 */
function refine(original: ImageBitmap, prewarped: ImageBitmap, paper: Quad) {
  const track: Mat[] = [];
  try {
    const size = workingSize(original.width, original.height, BLOCKS.maxEdge);
    const orig = grayOf(original, track, size).gray;
    const ref = grayOf(prewarped, track, size).gray;
    for (const m of [orig, ref]) cv.GaussianBlur(m, m, new cv.Size(3, 3), 0);
    const block = Math.round(BLOCKS.size * Math.min(size.width, size.height));
    const margin = Math.round(BLOCKS.searchRadius * Math.max(size.width, size.height));
    const scores = new cv.Mat();
    const mean = new cv.Mat();
    const spread = new cv.Mat();
    const noMask = new cv.Mat();
    track.push(scores, mean, spread, noMask);
    const src: Point[] = [];
    const dst: Point[] = [];
    const quad = paper.map((p) => ({ x: p.x * size.width, y: p.y * size.height }));
    const blocks = blocksOnPaper(blockGrid(size.width, size.height, block, margin), block, quad);
    for (const at of blocks) {
      const template = ref.roi(new cv.Rect(at.x, at.y, block, block));
      const window = orig.roi(
        new cv.Rect(at.x - margin, at.y - margin, block + 2 * margin, block + 2 * margin),
      );
      try {
        cv.meanStdDev(template, mean, spread);
        if ((spread.data64F[0] ?? 0) < BLOCKS.minSpread) continue;
        cv.matchTemplate(window, template, scores, cv.TM_CCOEFF_NORMED);
        // opencv.js takes (src, mask) and returns the extremes; the typings show the C++ form.
        const best = cv.minMaxLoc(scores, noMask);
        if (best.maxVal < BLOCKS.minScore) continue;
        src.push({ x: at.x + block / 2, y: at.y + block / 2 });
        dst.push({
          x: at.x - margin + best.maxLoc.x + block / 2,
          y: at.y - margin + best.maxLoc.y + block / 2,
        });
      } finally {
        template.delete();
        window.delete();
      }
    }
    const { h, inliers } = fitSimilarity(src, dst, BLOCKS.fitPx);
    return acceptHomography(
      { h, inliers, matches: src.length, reference: size, original: size },
      BLOCKS,
    );
  } finally {
    for (const m of track) m.delete();
  }
}

/**
 * Paper corners near rings of a quad (D-061), searched along the directions to each ring's
 * neighbours (`cornerNear`) on a lightly blurred grey copy; null where none is clear.
 */
function findCorners(image: ImageBitmap, quad: Quad, indices: readonly number[]): (Point | null)[] {
  const track: Mat[] = [];
  try {
    const { gray, size } = grayOf(image, track);
    const smooth = new cv.Mat();
    track.push(smooth);
    cv.GaussianBlur(gray, smooth, new cv.Size(5, 5), 0);
    const { data, cols, rows } = smooth;
    const intensity = (x: number, y: number) => {
      if (x < 0 || y < 0 || x > cols - 1 || y > rows - 1) return Number.NaN;
      const x0 = Math.floor(x);
      const y0 = Math.floor(y);
      const x1 = Math.min(x0 + 1, cols - 1);
      const y1 = Math.min(y0 + 1, rows - 1);
      const fx = x - x0;
      const fy = y - y0;
      const at = (xx: number, yy: number) => data[yy * cols + xx] as number;
      const top = at(x0, y0) * (1 - fx) + at(x1, y0) * fx;
      const bottom = at(x0, y1) * (1 - fx) + at(x1, y1) * fx;
      return top * (1 - fy) + bottom * fy;
    };
    const px = quad.map((p) => ({ x: p.x * size.width, y: p.y * size.height }));
    const radius = SNAP.radius * Math.max(size.width, size.height);
    return indices.map((i) => {
      const ring = px[i] as Point;
      const neighbours = [px[(i + 1) % 4], px[(i + 3) % 4]] as [Point, Point];
      const at = cornerNear(ring, neighbours, intensity, radius);
      return at && { x: at.x / size.width, y: at.y / size.height };
    });
  } finally {
    for (const m of track) m.delete();
  }
}

let loaded: Promise<number> | null = null;

scope.onmessage = async (event: MessageEvent<VisionRequest>) => {
  const message = event.data;
  const reply = (response: VisionResponse) => scope.postMessage(response);
  try {
    loaded ??= loadOpenCv();
    const ms = await loaded;
    if (message.type === "load") reply({ id: message.id, type: "load", ms });
    else if (message.type === "paper") {
      reply({ id: message.id, type: "paper", paper: detectPaper(message.image) });
    } else if (message.type === "corners") {
      reply({
        id: message.id,
        type: "corners",
        found: findCorners(message.image, message.quad, message.indices),
      });
    } else if (message.type === "refine") {
      reply({
        id: message.id,
        type: "align",
        verdict: refine(message.original, message.prewarped, message.paper),
      });
    } else {
      reply({
        id: message.id,
        type: "align",
        verdict: align(message.original, message.reference),
      });
    }
  } catch (error) {
    reply({ id: message.id, type: "error", error: String(error) });
  }
};
