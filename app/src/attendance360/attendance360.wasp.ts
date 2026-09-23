import { action, api, page, query, route, type Spec } from "@wasp.sh/spec";
import { AttendanceCommandCenterPage } from "./pages/AttendanceCommandCenterPage" with { type: "ref" };
import { MyAttendancePage } from "./pages/MyAttendancePage" with { type: "ref" };
import { AttendanceSettingsPage } from "./pages/AttendanceSettingsPage" with { type: "ref" };
import { HabituationAttendancePage } from "./pages/HabituationAttendancePage" with { type: "ref" };
import { AttendanceAuditPage } from "./pages/AttendanceAuditPage" with { type: "ref" };
import { attendanceEvidenceFileApi, attendanceEvidenceUploadApi } from "./evidenceApi" with { type: "ref" };
import {
  getAttendanceSettings,
  saveAttendancePolicy,
  saveAttendanceCalendarDay,
  deleteAttendanceCalendarDay,
  getMyAttendance,
  recordSelfAttendance,
  submitAttendancePermitRequest,
  getAttendanceCommandCenter,
  getAttendanceReconciliationWorkspace,
  verifyAttendanceRecord,
  reconcileAttendanceClass,
  getDutyAttendanceConsole,
  recordDutyAttendanceEvent,
  getAttendanceActivities,
  createAttendanceActivity,
  recordAttendanceActivity,
  closeAttendanceActivity,
  getAttendanceAudit,
} from "./operations" with { type: "ref" };

const coreEntities = [
  "School", "User", "StudentProfile", "TeacherProfile", "AcademicYear", "ClassRoom", "Department",
  "SchoolAttendancePolicy", "SchoolCalendarDay", "StudentAttendanceEvent", "SchoolDailyAttendance",
  "SchoolStaffAssignment", "WakasekAssignment", "StudentPermit", "AttendanceActivity", "AttendanceActivityRecord",
] as const;

export const attendance360Spec: Spec = [
  query(getAttendanceSettings, { entities: [...coreEntities] }),
  query(getMyAttendance, { entities: [...coreEntities] }),
  query(getAttendanceCommandCenter, { entities: [...coreEntities] }),
  query(getAttendanceReconciliationWorkspace, { entities: [...coreEntities] }),
  query(getDutyAttendanceConsole, { entities: [...coreEntities] }),
  query(getAttendanceActivities, { entities: [...coreEntities] }),
  query(getAttendanceAudit, { entities: [...coreEntities] }),
  action(saveAttendancePolicy, { entities: [...coreEntities] }),
  action(saveAttendanceCalendarDay, { entities: [...coreEntities] }),
  action(deleteAttendanceCalendarDay, { entities: [...coreEntities] }),
  action(recordSelfAttendance, { entities: [...coreEntities] }),
  action(submitAttendancePermitRequest, { entities: [...coreEntities] }),
  action(verifyAttendanceRecord, { entities: [...coreEntities] }),
  action(reconcileAttendanceClass, { entities: [...coreEntities] }),
  action(recordDutyAttendanceEvent, { entities: [...coreEntities] }),
  action(createAttendanceActivity, { entities: [...coreEntities] }),
  action(recordAttendanceActivity, { entities: [...coreEntities] }),
  action(closeAttendanceActivity, { entities: [...coreEntities] }),
  api("POST", "/operations/attendance-evidence-upload", attendanceEvidenceUploadApi, { auth: true }),
  api("GET", "/operations/attendance-evidence-file/:id", attendanceEvidenceFileApi, { entities: ["StudentAttendanceEvent", "User", "ClassRoom", "AcademicYear", "SchoolStaffAssignment", "WakasekAssignment"], auth: true }),
  route("AttendanceCommandCenterRoute", "/school/attendance/command", page(AttendanceCommandCenterPage, { authRequired: true })),
  route("MyAttendanceRoute", "/school/my-attendance", page(MyAttendancePage, { authRequired: true })),
  route("AttendanceSettingsRoute", "/school/attendance/settings", page(AttendanceSettingsPage, { authRequired: true })),
  route("HabituationAttendanceRoute", "/school/attendance/habituation", page(HabituationAttendancePage, { authRequired: true })),
  route("AttendanceAuditRoute", "/school/attendance/audit", page(AttendanceAuditPage, { authRequired: true })),
];
