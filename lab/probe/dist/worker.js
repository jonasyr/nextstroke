'use strict';
// Loads opencv.js single-threaded and computes a homography plus a 2048x1536 warp.
self.onmessage = async () => {
  const t0 = performance.now();
  try {
    importScripts('vendor/opencv.js');
    let cv = self.cv;
    if (cv && typeof cv.then === 'function') cv = await cv;
    if (!cv.Mat) await new Promise(resolve => { cv.onRuntimeInitialized = resolve; });
    const loadMs = performance.now() - t0;
    const t1 = performance.now();
    const src = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, 2047, 0, 2047, 1535, 0, 1535]);
    const dst = cv.matFromArray(4, 1, cv.CV_32FC2, [20, 10, 2030, 30, 2000, 1500, 10, 1520]);
    const h = cv.findHomography(src, dst, cv.RANSAC);
    const image = new cv.Mat(1536, 2048, cv.CV_8UC4, new cv.Scalar(235, 235, 235, 255));
    const warped = new cv.Mat();
    cv.warpPerspective(image, warped, h, new cv.Size(2048, 1536));
    const ok = h.rows === 3 && warped.cols === 2048;
    for (const m of [src, dst, h, image, warped]) m.delete();
    self.postMessage({ ok, loadMs: Math.round(loadMs), computeMs: Math.round(performance.now() - t1) });
  } catch (error) {
    self.postMessage({ ok: false, error: String(error), loadMs: Math.round(performance.now() - t0) });
  }
};
