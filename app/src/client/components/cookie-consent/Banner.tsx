import { useEffect } from "react";
import * as CookieConsent from "vanilla-cookieconsent";
import "vanilla-cookieconsent/dist/cookieconsent.css";
import { getConfig } from "./Config";

/**
 * NOTE: if you do not want to use the cookie consent banner, you should
 * run `npm uninstall vanilla-cookieconsent`, and delete this component, its config file,
 * as well as its import in src/client/App.tsx .
 */
export function CookieConsentBanner() {
  const analyticsId = import.meta.env.REACT_APP_GOOGLE_ANALYTICS_ID?.trim();
  useEffect(() => {
    if (analyticsId) CookieConsent.run(getConfig());
  }, [analyticsId]);

  if (!analyticsId) return null;
  return <div id="cookieconsent"></div>;
}
