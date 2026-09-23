const schema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      "@id": "https://sekolah.suhendararyadi.com/#software",
      name: "SaaS Satu Smart School",
      description:
        "Platform manajemen sekolah multi-tenant untuk data akademik, LMS, PKL, tata kelola, dan laporan sekolah.",
      url: "https://sekolah.suhendararyadi.com",
      applicationCategory: "EducationalApplication",
      operatingSystem: "Web",
    },
    {
      "@type": "WebSite",
      "@id": "https://sekolah.suhendararyadi.com/#website",
      url: "https://sekolah.suhendararyadi.com",
      name: "SaaS Satu Smart School",
    },
  ],
};

export function SchemaMarkup() {
  return <script type="application/ld+json">{JSON.stringify(schema)}</script>;
}
