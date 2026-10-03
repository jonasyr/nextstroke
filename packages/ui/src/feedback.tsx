/** Loading and error primitives; text comes from the caller's message catalog. */
export function Loading({ label }: { label: string }) {
  return (
    <p className="ns-loading" role="status" aria-live="polite">
      {label}
    </p>
  );
}

export function ErrorNotice({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="ns-error" role="alert">
      <strong>{title}</strong>
      <p>{detail}</p>
    </div>
  );
}
