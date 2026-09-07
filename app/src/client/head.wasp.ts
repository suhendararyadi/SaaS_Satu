import { type App } from "@wasp.sh/spec";

export const head: App["head"] = [
  "<link rel='icon' href='/favicon.ico' />",
  "<link rel='preconnect' href='https://fonts.googleapis.com' />",
  "<link rel='preconnect' href='https://fonts.gstatic.com' crossOrigin='anonymous' />",
  "<link href='https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,400;0,500;0,700;0,900;1,400;1,500;1,700&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap' rel='stylesheet' />",

  "<meta name='description' content='Your apps main description and features.' />",
  "<meta name='author' content='Your (App) Name' />",
  "<meta name='keywords' content='saas, solution, product, app, service' />",

  "<meta property='og:type' content='website' />",
  "<meta property='og:title' content='Your Open SaaS App' />",
  "<meta property='og:site_name' content='Your Open SaaS App' />",
  "<meta property='og:url' content='https://your-saas-app.com' />",
  "<meta property='og:description' content='Your apps main description and features.' />",
  "<meta property='og:image' content='https://your-saas-app.com/public-banner.webp' />",
  "<meta name='twitter:image' content='https://your-saas-app.com/public-banner.webp' />",
  "<meta name='twitter:image:width' content='800' />",
  "<meta name='twitter:image:height' content='400' />",
  "<meta name='twitter:card' content='summary_large_image' />",
  // TODO: You can put your Plausible analytics scripts below (https://docs.opensaas.sh/guides/analytics/):
  // NOTE: Plausible does not use Cookies, so you can simply add the scripts here.
  // Google, on the other hand, does, so you must instead add the script dynamically
  // via the Cookie Consent component after the user clicks the "Accept" cookies button.
  "<script async data-domain='<your-site-id>' src='https://plausible.io/js/script.js'></script>", // for production
  "<script async data-domain='<your-site-id>' src='https://plausible.io/js/script.local.js'></script>", // for development
];
