import { Link as WaspRouterLink, routes } from "wasp/client/router";
import { Button } from "../../client/components/ui/button";

export function Hero() {
  return (
    <section className="mx-auto max-w-7xl px-6 pb-16 pt-20 lg:px-8 lg:pb-24 lg:pt-28">
      <div className="max-w-4xl">
        <p className="text-primary text-sm font-semibold uppercase tracking-wider">
          SaaS Satu Smart School
        </p>
        <h1 className="text-foreground mt-4 text-4xl font-bold tracking-tight sm:text-6xl">
          Satu portal untuk data akademik dan layanan sekolah.
        </h1>
        <p className="text-muted-foreground mt-6 max-w-3xl text-lg leading-8">
          Kelola master data, pembelajaran LMS, PKL, tata kelola, dan laporan
          dalam aplikasi multi-tenant dengan pemisahan data per sekolah.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button size="lg" asChild>
            <WaspRouterLink to={routes.LoginRoute.to}>Masuk ke portal</WaspRouterLink>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <a href="#features">Lihat modul</a>
          </Button>
        </div>
      </div>
    </section>
  );
}
