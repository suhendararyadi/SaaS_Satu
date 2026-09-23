import { action, page, query, route, type Spec } from "@wasp.sh/spec";
import { AdministrationDashboardPage } from "./pages/AdministrationDashboardPage" with { type: "ref" };
import { AdministrationTemplatesPage } from "./pages/AdministrationTemplatesPage" with { type: "ref" };
import { AdministrationOutgoingPage } from "./pages/AdministrationOutgoingPage" with { type: "ref" };
import { AdministrationCreateDraftPage } from "./pages/AdministrationCreateDraftPage" with { type: "ref" };
import { AdministrationDocumentPage } from "./pages/AdministrationDocumentPage" with { type: "ref" };
import {
  initializeAdministrationModule,
  getAdministrationWorkspace,
  getAdministrationStudentOptions,
  searchAdministrationPeople,
  saveAdministrationTemplate,
  setAdministrationTemplateStatus,
  createAdministrationDraft,
  getAdministrationDocument,
  updateAdministrationDocumentStatus,
} from "./operations" with { type: "ref" };

const administrationEntities = [
  "School", "User", "StudentProfile", "ClassRoom", "Department", "AcademicYear",
  "SchoolStaffAssignment", "AdministrationTemplate", "AdministrationTemplateVersion",
  "LetterRegister", "AdministrationDocument", "AdministrationAuditEvent",
] as const;

export const administrationSpec: Spec = [
  query(getAdministrationWorkspace, { entities: [...administrationEntities] }),
  query(getAdministrationStudentOptions, { entities: [...administrationEntities] }),
  query(searchAdministrationPeople, { entities: [...administrationEntities] }),
  query(getAdministrationDocument, { entities: [...administrationEntities] }),
  action(initializeAdministrationModule, { entities: [...administrationEntities] }),
  action(saveAdministrationTemplate, { entities: [...administrationEntities] }),
  action(setAdministrationTemplateStatus, { entities: [...administrationEntities] }),
  action(createAdministrationDraft, { entities: [...administrationEntities] }),
  action(updateAdministrationDocumentStatus, { entities: [...administrationEntities] }),

  route("AdministrationDashboardRoute", "/school/administration", page(AdministrationDashboardPage, { authRequired: true })),
  route("AdministrationTemplatesRoute", "/school/administration/templates", page(AdministrationTemplatesPage, { authRequired: true })),
  route("AdministrationOutgoingRoute", "/school/administration/outgoing", page(AdministrationOutgoingPage, { authRequired: true })),
  route("AdministrationCreateDraftRoute", "/school/administration/outgoing/new", page(AdministrationCreateDraftPage, { authRequired: true })),
  route("AdministrationDocumentRoute", "/school/administration/documents/:id", page(AdministrationDocumentPage, { authRequired: true })),
];
