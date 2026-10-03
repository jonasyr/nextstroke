import { z } from "zod";
import { NormalizedPoint } from "./common.ts";

/** Structured stroke plan, the only controlled preview construction (D-048, D-051). */
const Width = z.number().gt(0).max(0.01);
const Darkness = z.number().gt(0).max(1);
const Order = z.int().min(1);

export const StrokeSchema = z
  .object({
    order: Order,
    points: z.array(NormalizedPoint).min(2).max(500),
    width: Width,
    darkness: Darkness,
  })
  .strict();

/** Parallel hatching clipped to a polygon; angle 0 horizontal, 90 vertical (D-049). */
export const FillSchema = z
  .object({
    order: Order,
    polygon: z.array(NormalizedPoint).min(3).max(64),
    angleDeg: z.number().min(0).lt(180),
    spacing: z.number().min(0.002).max(0.05),
    width: Width,
    darkness: Darkness,
    cross: z.boolean(),
  })
  .strict();

export const StrokePlanSchema = z
  .object({
    schemaVersion: z.literal("2"),
    strokes: z.array(StrokeSchema).max(200),
    fills: z.array(FillSchema).max(20),
  })
  .strict()
  .superRefine((plan, ctx) => {
    if (plan.strokes.length + plan.fills.length === 0) {
      ctx.addIssue({ code: "custom", message: "a plan needs strokes or fills" });
    }
    const orders = [...plan.strokes, ...plan.fills].map((item) => item.order);
    if (new Set(orders).size !== orders.length) {
      ctx.addIssue({ code: "custom", message: "order values must be unique" });
    }
  });

export type StrokePlan = z.infer<typeof StrokePlanSchema>;
