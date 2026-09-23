import { api, type Spec } from "@wasp.sh/spec";
import {
  integrationSchoolsApi,
  integrationAttendanceDailyApi,
  integrationAttendanceStudentApi,
} from "./integrationApi" with { type: "ref" };

// Entities the integration API may touch (read-only).
const integrationEntities = [
  "School",
  "User",
  "StudentProfile",
  "ClassRoom",
  "AcademicYear",
  "SchoolDailyAttendance",
  "StudentAttendanceEvent",
] as const;

// OpenClaw read-only integration endpoints.
// auth: false -> authorization is enforced inside the handlers with a bearer token
// (INTEGRATION_TOKEN). Public reachability is blocked at the nginx layer.
export const integrationSpec: Spec = [
  api("GET", "/operations/integration/schools", integrationSchoolsApi, {
    entities: [...integrationEntities],
    auth: false,
  }),
  api("GET", "/operations/integration/attendance/daily", integrationAttendanceDailyApi, {
    entities: [...integrationEntities],
    auth: false,
  }),
  api("GET", "/operations/integration/attendance/student/:studentId", integrationAttendanceStudentApi, {
    entities: [...integrationEntities],
    auth: false,
  }),
];
