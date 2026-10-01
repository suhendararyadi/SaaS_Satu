import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router";

const getMock = vi.fn();
let queryResult: any;
vi.mock("wasp/client/operations", () => ({
  getTeachingAudit: "getTeachingAudit",
  useQuery: () => queryResult,
}));
vi.mock("wasp/client/api", () => ({ api: { get: (...args: unknown[]) => getMock(...args) } }));
vi.mock("wasp/client/auth", () => ({ logout: vi.fn() }));
vi.mock("../../school/components/SchoolLayout", () => ({
  SchoolLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import { LmsTeachingAuditPage } from "./LmsTeachingAuditPage";

const school = { latitude: -7.2, longitude: 107.9, radiusMeters: 100, maxGpsAccuracyMeters: 50 };
const session = (over: Record<string, unknown> = {}) => ({
  id: "s1", dateOnly: "2026-10-05", status: "COMPLETED",
  scheduledStartAt: "2026-10-05T00:00:00.000Z", scheduledEndAt: "2026-10-05T01:20:00.000Z",
  teacherCheckInAt: "2026-10-05T00:02:00.000Z", teacherCheckOutAt: "2026-10-05T01:21:00.000Z",
  checkInLatitude: -7.2001, checkInLongitude: 107.9002, checkInAccuracy: 12, checkInDistanceM: 17, checkInGeofence: "INSIDE", checkInEvidenceKey: "k1",
  checkOutLatitude: -7.2003, checkOutLongitude: 107.9004, checkOutAccuracy: 20, checkOutDistanceM: 40, checkOutGeofence: "INSIDE", checkOutEvidenceKey: "k2",
  course: { id: "c1", subjectName: "Matematika", teacher: { id: "t1", name: "Guru Contoh" }, classRoom: { id: "k1", name: "X A_1" } },
  schedule: { roomLabel: "K-13" }, agenda: null, events: [],
  ...over,
});
const dataWith = (sessions: any[]) => ({
  from: "2026-09-28", to: "2026-10-05", school,
  summary: { totalSessions: sessions.length, completed: 1, delegated: 0, missingCheckout: 0, onTimeRate: 100, completionRate: 100 },
  sessions,
});

function renderPage(sessions: any[]) {
  queryResult = { data: dataWith(sessions), isLoading: false, error: null };
  return render(<MemoryRouter><LmsTeachingAuditPage user={{ id: "u1" } as any} /></MemoryRouter>);
}

beforeEach(() => {
  getMock.mockReset();
  (URL as any).createObjectURL = vi.fn(() => "blob:foto");
  (URL as any).revokeObjectURL = vi.fn();
});

describe("LmsTeachingAuditPage: lokasi check-in/out", () => {
  it("shows coordinates, accuracy, distance and geofence status for check-in and check-out", () => {
    renderPage([session()]);
    expect(screen.getByText("-7.200100, 107.900200")).toBeInTheDocument();
    expect(screen.getByText("-7.200300, 107.900400")).toBeInTheDocument();
    expect(screen.getByText(/±12 m · 17 m dari titik sekolah/)).toBeInTheDocument();
    expect(screen.getByText(/±20 m · 40 m dari titik sekolah/)).toBeInTheDocument();
    expect(screen.getAllByText("Dalam radius sekolah")).toHaveLength(2);
    expect(screen.getByText(/Ruang jadwal K-13/)).toBeInTheDocument();
    expect(screen.getByText(/Selisih titik: \d+ m/)).toBeInTheDocument();
  });

  it("never links straight to the evidence endpoint (a raw link answers 401)", () => {
    renderPage([session()]);
    expect(document.querySelector('a[href*="lms-teaching-evidence"]')).toBeNull();
    expect(screen.getByRole("button", { name: "Foto masuk" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Foto pulang" })).toBeInTheDocument();
  });

  it("opens the photo in the app using the session token", async () => {
    getMock.mockReturnValue({ blob: async () => new Blob(["x"], { type: "image/jpeg" }) });
    renderPage([session()]);
    fireEvent.click(screen.getByRole("button", { name: "Foto masuk" }));
    await waitFor(() => expect(getMock).toHaveBeenCalledWith("/operations/lms-teaching-evidence/s1/CHECK_IN"));
    const img = await screen.findByRole("img", { name: "Foto check-in guru" });
    expect(img).toHaveAttribute("src", "blob:foto");
  });

  it("explains why a photo cannot be opened instead of failing silently", async () => {
    getMock.mockReturnValue({ blob: async () => { throw Object.assign(new Error("nf"), { response: { status: 404 } }); } });
    renderPage([session()]);
    fireEvent.click(screen.getByRole("button", { name: "Foto pulang" }));
    expect(await screen.findByText("Foto belum tersedia atau sudah tidak ada.")).toBeInTheDocument();
  });

  it("flags objective conditions and counts them", () => {
    renderPage([
      session({ id: "ok" }),
      session({ id: "bad", checkInGeofence: "UNCONFIGURED", checkInDistanceM: null, teacherCheckInAt: "2026-10-05T00:30:00.000Z" }),
    ]);
    expect(screen.getByText("Geofence belum diatur saat check-in")).toBeInTheDocument();
    expect(screen.getByText("Check-in terlambat")).toBeInTheDocument();
    const card = screen.getByText("Bertanda").closest("div")!.parentElement!;
    expect(card).toHaveTextContent("1");
  });

  it("can show only flagged sessions", () => {
    renderPage([session({ id: "ok" }), session({ id: "bad", teacherCheckInAt: "2026-10-05T00:30:00.000Z", course: { id: "c2", subjectName: "Fisika", teacher: { id: "t2", name: "Guru Lain" }, classRoom: { id: "k2", name: "XI B_1" } } })]);
    expect(screen.getByText(/Matematika · X A_1/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Hanya yang bertanda" }));
    expect(screen.queryByText(/Matematika · X A_1/)).not.toBeInTheDocument();
    expect(screen.getByText(/Fisika · XI B_1/)).toBeInTheDocument();
  });

  it("handles a session that never started and a session without a stored point", () => {
    renderPage([session({ id: "p", status: "PENDING", teacherCheckInAt: null, teacherCheckOutAt: null, checkInLatitude: null, checkInLongitude: null, checkOutLatitude: null, checkOutLongitude: null, checkInEvidenceKey: null, checkOutEvidenceKey: null })]);
    expect(screen.queryByText("Lokasi check-in")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Foto masuk" })).not.toBeInTheDocument();
  });

  it("says so when no session is flagged and when there are no sessions at all", () => {
    renderPage([session()]);
    fireEvent.click(screen.getByRole("button", { name: "Hanya yang bertanda" }));
    expect(screen.getByText("Tidak ada sesi bertanda pada periode ini.")).toBeInTheDocument();
    queryResult = { data: dataWith([]), isLoading: false, error: null };
  });
});
