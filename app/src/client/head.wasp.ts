import { type App } from "@wasp.sh/spec";

const description =
  "Platform manajemen sekolah multi-tenant untuk data akademik, LMS, PKL, tata kelola, dan laporan sekolah.";

export const head: App["head"] = [
  "<link rel='icon' href='/favicon.ico' />",
  "<link rel='preconnect' href='https://fonts.googleapis.com' />",
  "<link rel='preconnect' href='https://fonts.gstatic.com' crossOrigin='anonymous' />",
  "<link href='https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap' rel='stylesheet' />",
  `<meta name='description' content='${description}' />`,
  "<meta name='author' content='SaaS Satu' />",
  "<meta name='keywords' content='sistem informasi sekolah, LMS, PKL, akademik, sekolah, multi-tenant' />",
];
