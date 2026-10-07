import { describe, expect, it, vi } from "vitest";
import {
  activateUpdate,
  applyWhenIdle,
  reloadOnRequestedUpdate,
  watchForUpdate,
} from "./register.ts";

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

  it("reloads on a new controller only after the user asked for the update", () => {
    const container = new EventTarget();
    const reload = vi.fn();
    const update = reloadOnRequestedUpdate(container, reload);
    // iOS hands control over by itself, e.g. while the photo picker is open: no reload.
    container.dispatchEvent(new Event("controllerchange"));
    expect(reload).not.toHaveBeenCalled();
    const worker = new FakeWorker();
    update(worker as unknown as ServiceWorker);
    expect(worker.postMessage).toHaveBeenCalledWith("SKIP_WAITING");
    container.dispatchEvent(new Event("controllerchange"));
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("reloads after an automatic update only when the app is idle", () => {
    const container = new EventTarget();
    const reload = vi.fn();
    let later: (() => void) | null = null;
    const update = reloadOnRequestedUpdate(container, reload, (run) => {
      later = run;
    });
    // Asked for on the start screen, but iOS hands control over only while the photo picker
    // is open in the coach: the reload waits until the app is idle again.
    update(new FakeWorker() as unknown as ServiceWorker, { automatic: true });
    container.dispatchEvent(new Event("controllerchange"));
    expect(reload).not.toHaveBeenCalled();
    (later as unknown as () => void)();
    expect(reload).toHaveBeenCalledOnce();
  });
});

describe("applyWhenIdle", () => {
  it("updates at once when nothing is in progress", () => {
    const apply = vi.fn();
    applyWhenIdle(
      () => true,
      apply,
      () => () => undefined,
    );
    expect(apply).toHaveBeenCalledOnce();
  });

  it("waits until the app is idle, then updates once and stops listening", () => {
    let idle = false;
    let check = () => {};
    const unsubscribe = vi.fn();
    const apply = vi.fn();
    applyWhenIdle(
      () => idle,
      apply,
      (c) => {
        check = c;
        return unsubscribe;
      },
    );
    check();
    expect(apply).not.toHaveBeenCalled();
    idle = true;
    check();
    check();
    expect(apply).toHaveBeenCalledOnce();
    expect(unsubscribe).toHaveBeenCalledOnce();
  });

  it("can stop waiting", () => {
    const apply = vi.fn();
    let check = () => {};
    let idle = false;
    const stop = applyWhenIdle(
      () => idle,
      apply,
      (c) => {
        check = c;
        return () => undefined;
      },
    );
    stop();
    idle = true;
    check();
    expect(apply).not.toHaveBeenCalled();
  });
});
