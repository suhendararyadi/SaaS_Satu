import { app, page, route } from "@wasp.sh/spec";

import { App } from "./src/client/App" with { type: "ref" };
import { NotFoundPage } from "./src/client/components/NotFoundPage" with { type: "ref" };
import { serverEnvValidationSchema } from "./src/env" with { type: "ref" };
import { LandingPage } from "./src/landing-page/LandingPage" with { type: "ref" };
import { seedMockUsers } from "./src/server/scripts/dbSeeds" with { type: "ref" };
import { seedSmkn9Garut } from "./src/server/scripts/seedSmkn9Garut" with { type: "ref" };

import { adminSpec } from "./src/admin/admin.wasp";
import { analyticsSpec } from "./src/analytics/analytics.wasp";
import { authConfig, authSpec } from "./src/auth/auth.wasp";
import { head } from "./src/client/head.wasp";
import { fileUploadSpec } from "./src/file-upload/file-upload.wasp";
import { paymentSpec } from "./src/payment/payment.wasp";
import { emailSender } from "./src/server/emailSender.wasp";
import { userSpec } from "./src/user/user.wasp";
import { schoolSpec } from "./src/school/school.wasp";
import { pklSpec } from "./src/pkl/pkl.wasp";
import { lmsSpec } from "./src/lms/lms.wasp";
import { governanceSpec } from "./src/governance/governance.wasp";
import { reportsSpec } from "./src/reports/reports.wasp";
import { attendance360Spec } from "./src/attendance360/attendance360.wasp";


export default app({
  name: "SaaSSatu",
  wasp: { version: "^0.25.0" },
  title: "SaaS Satu Smart School",
  head,
  auth: authConfig,
  db: {
    // Run `wasp db seed` to seed the database with the seed functions below:
    seeds: [
      // Populates the database with a bunch of fake users to work with during development.
      seedMockUsers,
      seedSmkn9Garut,
    ],
  },
  client: {
    rootComponent: App,
  },
  server: {
    envValidationSchema: serverEnvValidationSchema,
  },
  emailSender,
  spec: [
    // Prerendering routes with static content creates HTML files at build time that are served immediately,
    // improving SEO, search engine/AI crawling, and performance: https://wasp.sh/docs/advanced/prerendering
    route("LandingPageRoute", "/", page(LandingPage), { prerender: true }),
    route("NotFoundRoute", "*", page(NotFoundPage)),
    authSpec,
    userSpec,
    paymentSpec,
    fileUploadSpec,
    analyticsSpec,
    adminSpec,
    schoolSpec,
    attendance360Spec,
    pklSpec,
    lmsSpec,
    governanceSpec,
    reportsSpec,
  ],
});



