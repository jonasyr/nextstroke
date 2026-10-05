import type { MaterialDataset } from "../dataset.ts";
import { CLAIMS, FINELINERS, SOURCES } from "./fineliners.ts";
import { PAPERS } from "./papers.ts";

/** The shipped dataset, offline with the app. */
export const DATASET: MaterialDataset = {
  sources: SOURCES,
  fineliners: FINELINERS,
  papers: PAPERS,
  claims: CLAIMS,
};
