import { action, page, query, route, type Spec } from "@wasp.sh/spec";

import { AccountPage } from "./AccountPage" with { type: "ref" };
import {
  getPaginatedUsers,
  getMyStudentAccountProfile,
  updateIsUserAdminById,
} from "./operations" with { type: "ref" };

export const userSpec: Spec = [
  route("AccountRoute", "/account", page(AccountPage, { authRequired: true })),
  query(getPaginatedUsers, { entities: ["User"] }),
  query(getMyStudentAccountProfile, { entities: ["User", "StudentProfile", "School", "ClassRoom", "Department", "AcademicYear"] }),
  action(updateIsUserAdminById, { entities: ["User"] }),
];
