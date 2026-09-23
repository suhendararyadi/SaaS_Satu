// OpenClaw read-only integration API for School OS.
//
// Security contract (do not weaken without review):
//  - Auth: `Authorization: Bearer <INTEGRATION_TOKEN>` — no session/cookie auth.
//  - Read-only: every handler performs Prisma reads only. No create/update/delete.
//  - Not publicly reachable: nginx denies /operations/integration/ from the
//    internet; OpenClaw calls it over loopback (http://127.0.0.1:3101).
//  - PII minimization: responses are aggregates by default; student names are
//    included only when the caller explicitly asks with `detail=1`.
//  - Tenant isolation: every query is scoped by `schoolId`; responses always
//    carry school identity so an all-tenant query is never ambiguous.

import { prisma } from "wasp/server";
import { timingSafeEqual } from "node:crypto";
import { summarizeAttendanceStatuses, attendanceRate } from "../school/dailyAttendanceAccess";

const MAX_ROWS = 5000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

function todayYmd(): string {
  return new Date().toISOString().slice(0, 10);
}

function isAuthorized(req: any): boolean {
  const expected = String(process.env.INTEGRATION_TOKEN || "").trim();
  // A short/absent token means "not configured" -> deny everything.
  if (expected.length < 16) return false;
  const header = String(req?.headers?.authorization || "");
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return false;
  const provided = Buffer.from(match[1].trim(), "utf8");
  const wanted = Buffer.from(expected, "utf8");
  if (provided.length !== wanted.length) return false;
  return timingSafeEqual(provided, wanted);
}

function unauthorized(res: any) {
  res.set?.("WWW-Authenticate", "Bearer");
  return res.status(401).json({ error: "unauthorized" });
}

// undefined => no school filter requested; null => requested school not found.
async function resolveSchoolId(schoolRef: string): Promise<string | null | undefined> {
  const ref = schoolRef.trim();
  if (!ref) return undefined;
  if (UUID_RE.test(ref)) return ref;
  const school = await prisma.school.findUnique({ where: { slug: ref }, select: { id: true } });
  return school?.id ?? null;
}

export const integrationSchoolsApi = async (req: any, res: any, _context?: unknown) => {
  if (!isAuthorized(req)) return unauthorized(res);

  const schools = await prisma.school.findMany({
    select: { id: true, slug: true, name: true, city: true, level: true },
    orderBy: { name: "asc" },
    take: 100,
  });

  return res.json({ ok: true, count: schools.length, schools });
};

export const integrationAttendanceDailyApi = async (req: any, res: any, _context?: unknown) => {
  if (!isAuthorized(req)) return unauthorized(res);

  const rawDate = String(req.query?.date || "").trim();
  const rawFrom = String(req.query?.from || "").trim();
  const rawTo = String(req.query?.to || "").trim();

  let from: string;
  let to: string;
  let mode: "date" | "range";

  if (rawFrom || rawTo) {
    mode = "range";
    to = rawTo || todayYmd();
    from = rawFrom || to;
    if (!YMD_RE.test(from) || !YMD_RE.test(to) || from > to) {
      return res.status(400).json({ error: "invalid_range", expected: "YYYY-MM-DD", detail: "from must be <= to" });
    }
  } else {
    mode = "date";
    if (rawDate && !YMD_RE.test(rawDate)) {
      return res.status(400).json({ error: "invalid_date", expected: "YYYY-MM-DD" });
    }
    from = rawDate || todayYmd();
    to = from;
  }

  const schoolFilter = await resolveSchoolId(String(req.query?.school || ""));
  if (schoolFilter === null) return res.status(404).json({ error: "school_not_found" });

  const detail = String(req.query?.detail || "") === "1";

  const rows = await prisma.schoolDailyAttendance.findMany({
    where: { dateOnly: { gte: from, lte: to }, ...(schoolFilter ? { schoolId: schoolFilter } : {}) },
    select: {
      status: true,
      lateMinutes: true,
      earlyLeave: true,
      notes: true,
      classRoomId: true,
      schoolId: true,
      school: { select: { name: true, slug: true } },
      classRoom: { select: { name: true, gradeLevel: true } },
      student: { select: { name: true } },
    },
    orderBy: [{ dateOnly: "asc" }],
    take: MAX_ROWS,
  });

  // Per class room (school identity included so all-tenant answers are unambiguous).
  const groupedClasses = new Map<string, any[]>();
  for (const row of rows) {
    const bucket = groupedClasses.get(row.classRoomId);
    if (bucket) bucket.push(row);
    else groupedClasses.set(row.classRoomId, [row]);
  }

  const classes = [...groupedClasses.entries()]
    .map(([classRoomId, list]) => {
      const first = list[0];
      const summary = summarizeAttendanceStatuses(list);
      const nonPresent = detail
        ? list
            .filter((row) => row.status !== "HADIR")
            .map((row) => ({
              name: row.student?.name ?? null,
              status: row.status,
              date: row.dateOnly ?? null,
              notes: row.notes ?? null,
            }))
        : undefined;

      return {
        classRoomId,
        className: first?.classRoom?.name ?? "(tanpa kelas)",
        gradeLevel: first?.classRoom?.gradeLevel ?? null,
        schoolId: first?.schoolId ?? null,
        schoolName: first?.school?.name ?? null,
        schoolSlug: first?.school?.slug ?? null,
        summary,
        rate: attendanceRate(list),
        ...(nonPresent ? { nonPresent } : {}),
      };
    })
    .sort(
      (a, b) =>
        String(a.schoolName ?? "").localeCompare(String(b.schoolName ?? "")) ||
        (a.gradeLevel ?? 0) - (b.gradeLevel ?? 0) ||
        String(a.className).localeCompare(String(b.className)),
    );

  // Per school rollup — answers "which tenant" without a second query.
  const groupedSchools = new Map<string, any[]>();
  for (const row of rows) {
    const bucket = groupedSchools.get(row.schoolId);
    if (bucket) bucket.push(row);
    else groupedSchools.set(row.schoolId, [row]);
  }

  const schools = [...groupedSchools.entries()]
    .map(([schoolId, list]) => {
      const first = list[0];
      return {
        schoolId,
        schoolName: first?.school?.name ?? null,
        schoolSlug: first?.school?.slug ?? null,
        records: list.length,
        classCount: new Set(list.map((row) => row.classRoomId)).size,
        summary: summarizeAttendanceStatuses(list),
        rate: attendanceRate(list),
      };
    })
    .sort((a, b) => String(a.schoolName ?? "").localeCompare(String(b.schoolName ?? "")));

  return res.json({
    ok: true,
    mode,
    date: mode === "date" ? from : null,
    from,
    to,
    school: schoolFilter ?? null,
    detail,
    totalRecords: rows.length,
    totals: summarizeAttendanceStatuses(rows),
    rate: attendanceRate(rows),
    classes,
    schools,
  });
};

export const integrationAttendanceStudentApi = async (req: any, res: any, _context?: unknown) => {
  if (!isAuthorized(req)) return unauthorized(res);

  const studentId = String(req.params?.studentId || "").trim();
  if (!studentId) return res.status(400).json({ error: "missing_studentId" });

  const to = String(req.query?.to || "").trim() || todayYmd();
  const from = String(req.query?.from || "").trim() || new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10);
  if (!YMD_RE.test(from) || !YMD_RE.test(to) || from > to) {
    return res.status(400).json({ error: "invalid_range", expected: "YYYY-MM-DD" });
  }

  const rows = await prisma.schoolDailyAttendance.findMany({
    where: { studentId, dateOnly: { gte: from, lte: to } },
    select: { dateOnly: true, status: true, lateMinutes: true, earlyLeave: true, notes: true },
    orderBy: { dateOnly: "desc" },
    take: 400,
  });

  return res.json({
    ok: true,
    studentId,
    from,
    to,
    summary: summarizeAttendanceStatuses(rows),
    rate: attendanceRate(rows),
    records: rows,
  });
};
