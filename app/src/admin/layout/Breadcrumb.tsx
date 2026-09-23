import { Link as WaspRouterLink, routes } from "wasp/client/router";

interface BreadcrumbProps {
  pageName: string;
}

export function Breadcrumb({ pageName }: BreadcrumbProps) {
  return (
    <nav className="mb-4 flex min-h-7 items-center text-[11.5px] text-md-on-surface-variant" aria-label="Breadcrumb">
      <WaspRouterLink to={routes.AdminRoute.to} className="rounded-[6px] font-medium text-md-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-md-primary/40">
        Super Admin
      </WaspRouterLink>
      <span className="mx-1.5 text-md-on-surface-variant/50" aria-hidden="true">›</span>
      <span className="font-medium text-md-on-surface">{pageName}</span>
    </nav>
  );
}
