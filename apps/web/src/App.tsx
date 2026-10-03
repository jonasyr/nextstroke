import { t } from "@nextstroke/ui";
import { Page, TITLES } from "./pages/Pages.tsx";
import { hrefFor, ROUTES } from "./routing/routes.ts";
import { useRoute } from "./routing/useRoute.ts";
import { useOnline } from "./useOnline.ts";

/** `onReloadForUpdate` is set when a new service worker is waiting (see sw/register.ts). */
export function App({ onReloadForUpdate }: { onReloadForUpdate?: () => void }) {
  const route = useRoute();
  const online = useOnline();
  return (
    <div className="ns-shell">
      <header className="ns-header">
        <span className="ns-brand">{t("app.name")}</span>
        <nav aria-label={t("nav.label")}>
          {ROUTES.map((r) => (
            <a key={r} href={hrefFor(r)} aria-current={r === route ? "page" : undefined}>
              {t(TITLES[r])}
            </a>
          ))}
        </nav>
      </header>
      {!online && (
        <p className="ns-offline" role="status">
          {t("offline.banner")}
        </p>
      )}
      {onReloadForUpdate && (
        <p className="ns-update">
          {t("update.available")}{" "}
          <button type="button" onClick={onReloadForUpdate}>
            {t("update.reload")}
          </button>
        </p>
      )}
      <main className="ns-main">
        <Page route={route} />
      </main>
    </div>
  );
}
