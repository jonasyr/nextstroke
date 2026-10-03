/// <reference lib="webworker" />
import {
  acceptHomography,
  choosePaper,
  type Neighbour,
  type PaperCandidate,
  ratioTest,
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
function grayOf(image: ImageBitmap, track: Mat[]) {
  const size = workingSize(image.width, image.height);
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
    return choosePaper(candidates, size.width, size.height, (x, y) => gray.ucharAt(y, x));
  } finally {
    for (const m of track) m.delete();
  }
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
