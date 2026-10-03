import { describe, expect, it, vi } from "vitest";
import { activateUpdate, watchForUpdate } from "./register.ts";

class FakeWorker extends EventTarget {
  state = "installing";
  postMessage = vi.fn();
  become(state: string) {
    this.state = state;
    this.dispatchEvent(new Event("statechange"));
  }
}

class FakeRegistration extends EventTarget {
  installing: FakeWorker | null = null;
  waiting: FakeWorker | null = null;
}

describe("service worker updates", () => {
  it("reports a worker that is already waiting", () => {
    const registration = new FakeRegistration();
    registration.waiting = new FakeWorker();
    const onUpdate = vi.fn();
    watchForUpdate(registration as unknown as ServiceWorkerRegistration, true, onUpdate);
    expect(onUpdate).toHaveBeenCalledWith(registration.waiting);
  });

  it("reports a new worker once installed, but not on first install", () => {
    for (const hasController of [true, false]) {
      const registration = new FakeRegistration();
      const onUpdate = vi.fn();
      watchForUpdate(registration as unknown as ServiceWorkerRegistration, hasController, onUpdate);
      const worker = new FakeWorker();
      registration.installing = worker;
      registration.dispatchEvent(new Event("updatefound"));
      worker.become("installed");
      expect(onUpdate).toHaveBeenCalledTimes(hasController ? 1 : 0);
    }
  });

  it("ignores updatefound without an installing worker and other states", () => {
    const registration = new FakeRegistration();
    const onUpdate = vi.fn();
    watchForUpdate(registration as unknown as ServiceWorkerRegistration, true, onUpdate);
    registration.dispatchEvent(new Event("updatefound"));
    const worker = new FakeWorker();
    registration.installing = worker;
    registration.dispatchEvent(new Event("updatefound"));
    worker.become("redundant");
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it("asks the waiting worker to take over", () => {
    const worker = new FakeWorker();
    activateUpdate(worker as unknown as ServiceWorker);
    expect(worker.postMessage).toHaveBeenCalledWith("SKIP_WAITING");
  });
});
