import { t } from "@nextstroke/ui";
import { Page } from "./pages/Pages.tsx";
import { useRoute } from "./routing/useRoute.ts";
import { useOnline } from "./useOnline.ts";

/** `onReloadForUpdate` is set when a new service worker is waiting (see sw/register.ts). */
export function App({ onReloadForUpdate }: { onReloadForUpdate?: () => void }) {
  const route = useRoute();
  const online = useOnline();
  return (
    <div className="ns-shell">
      {!online && (
        <p className="ns-banner" role="status">
          {t("offline.banner")}
        </p>
      )}
      {onReloadForUpdate && (
        <p className="ns-banner">
          {t("update.available")}{" "}
          <button type="button" className="ns-text ns-accent" onClick={onReloadForUpdate}>
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
