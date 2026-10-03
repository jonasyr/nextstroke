import { describe, expect, it, vi } from "vitest";
import { createVisionClient, type VisionRequest, type VisionResponse } from "./visionClient.ts";

/** A worker double that answers each request with `reply`. */
class FakeWorker {
  sent: { message: VisionRequest; transfer: Transferable[] }[] = [];
  terminated = false;
  private listeners: Record<string, ((event: unknown) => void)[]> = {};
  constructor(
    private readonly reply: (message: VisionRequest) => VisionResponse | "error" | null,
  ) {}
  addEventListener(type: string, listener: (event: unknown) => void) {
    this.listeners[type] = [...(this.listeners[type] ?? []), listener];
  }
  postMessage(message: VisionRequest, transfer: Transferable[] = []) {
    this.sent.push({ message, transfer });
    const answer = this.reply(message);
    queueMicrotask(() => {
      if (answer === "error") this.emit("error", { message: "boom" });
      else if (answer) this.emit("message", { data: answer });
    });
  }
  terminate() {
    this.terminated = true;
  }
  emit(type: string, event: unknown) {
    for (const listener of this.listeners[type] ?? []) listener(event);
  }
}

const bitmap = () => ({ width: 10, height: 10, close: vi.fn() }) as unknown as ImageBitmap;
const quad = [
  { x: 0.1, y: 0.1 },
  { x: 0.9, y: 0.1 },
  { x: 0.9, y: 0.9 },
  { x: 0.1, y: 0.9 },
] as const;

function setup(reply: (message: VisionRequest) => VisionResponse | "error" | null) {
  const workers: FakeWorker[] = [];
  const clone = vi.fn(async () => bitmap());
  const client = createVisionClient(() => {
    const worker = new FakeWorker(reply);
    workers.push(worker);
    return worker as unknown as Worker;
  }, clone);
  return { client, workers, clone };
}

const answer = (message: VisionRequest): VisionResponse => {
  if (message.type === "load") return { id: message.id, type: "load", ms: 420 };
  if (message.type === "paper") {
    return { id: message.id, type: "paper", paper: { corners: quad, confidence: 0.97 } };
  }
  return {
    id: message.id,
    type: "align",
    verdict: { accepted: true, corners: quad, confidence: 0.6 },
  };
};

describe("vision client", () => {
  it("loads opencv.js in one worker only once and reports the load time", async () => {
    const { client, workers } = setup(answer);
    const [a, b] = await Promise.all([client.load(), client.load()]);
    expect(a).toEqual({ ok: true, ms: 420 });
    expect(b).toBe(a);
    expect(workers).toHaveLength(1);
    expect(workers[0]?.sent.map((s) => s.message.type)).toEqual(["load"]);
  });

  it("sends copies of the bitmaps, transferred, and returns the worker's results", async () => {
    const { client, workers, clone } = setup(answer);
    const image = bitmap();
    expect(await client.detectPaper(image)).toEqual({ corners: quad, confidence: 0.97 });
    expect(clone).toHaveBeenCalledWith(image);
    const sent = workers[0]?.sent[1];
    expect(sent?.message.type).toBe("paper");
    expect(sent?.transfer).toHaveLength(1);
    expect(await client.align(bitmap(), bitmap())).toEqual({
      accepted: true,
      corners: quad,
      confidence: 0.6,
    });
    expect(workers[0]?.sent[2]?.transfer).toHaveLength(2);
  });

  it("reports unavailable when opencv.js fails to load, without retrying", async () => {
    const { client, workers } = setup((m) =>
      m.type === "load" ? { id: m.id, type: "error", error: "offline" } : null,
    );
    expect(await client.load()).toEqual({ ok: false, ms: 0 });
    expect(workers[0]?.terminated).toBe(true);
    expect(await client.detectPaper(bitmap())).toBeNull();
    expect(await client.align(bitmap(), bitmap())).toBeNull();
    expect(workers).toHaveLength(1);
  });

  it("treats a crashed worker as unavailable and fails pending requests", async () => {
    let crash = false;
    const { client, workers } = setup((m) => {
      if (m.type === "load") return answer(m);
      return crash ? "error" : answer(m);
    });
    await client.load();
    crash = true;
    expect(await client.detectPaper(bitmap())).toBeNull();
    expect(workers[0]?.terminated).toBe(true);
    expect(await client.align(bitmap(), bitmap())).toBeNull();
  });

  it("returns null for a failed analysis but stays available", async () => {
    const { client } = setup((m) =>
      m.type === "load" ? answer(m) : { id: m.id, type: "error", error: "bad image" },
    );
    expect(await client.detectPaper(bitmap())).toBeNull();
    expect((await client.load()).ok).toBe(true);
  });

  it("reports unavailable when no worker can be created", async () => {
    const client = createVisionClient(
      () => {
        throw new Error("no workers");
      },
      async () => bitmap(),
    );
    expect(await client.load()).toEqual({ ok: false, ms: 0 });
  });

  it("ignores messages for other requests", async () => {
    const { client, workers } = setup((m) => (m.type === "load" ? answer(m) : null));
    await client.load();
    const pending = client.detectPaper(bitmap());
    await vi.waitFor(() => expect(workers[0]?.sent).toHaveLength(2));
    const id = workers[0]?.sent[1]?.message.id ?? 0;
    workers[0]?.emit("message", { data: { id: id + 100, type: "paper", paper: null } });
    workers[0]?.emit("message", { data: { id, type: "paper", paper: null } });
    expect(await pending).toBeNull();
  });
});
