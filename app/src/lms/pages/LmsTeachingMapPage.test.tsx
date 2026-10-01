import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router";

const getMock = vi.fn();
let queryResult: any;
let mapProps: any;
vi.mock("wasp/client/operations", () => ({ getTeachingAudit: "getTeachingAudit", useQuery: () => queryResult }));
vi.mock("wasp/client/api", () => ({ api: { get: (...args: unknown[]) => getMock(...args) } }));
vi.mock("wasp/client/auth", () => ({ logout: vi.fn() }));
vi.mock("../../school/components/SchoolLayout", () => ({
  SchoolLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
// Leaflet membutuhkan layout nyata; peta diganti stub yang memperlihatkan titik dan memicu pemilihan.
vi.mock("../components/TeachingMap", () => ({
  TeachingMap: (props: any) => {
    mapProps = props;
    return (
      <div data-testid="map" data-school={props.school ? "ada" : "tidak"} data-selected={props.selectedId ?? ""}>
        {props.points.map((p: any) => (
          <button key={p.id} type="button" onClick={() => props.onSelect(p.id)}>{p.label}</button>
        ))}
      </div>
    );
  },
}));

import { LmsTeachingMapPage } from "./LmsTeachingMapPage";

const school = { latitude: -7.2, longitude: 107.9, radiusMeters: 100, maxGpsAccuracyMeters: 50 };
const session = (over: Record<string, unknown> = {}) => ({
  id: "s1", dateOnly: "2026-10-05", status: "COMPLETED",
  scheduledStartAt: "2026-10-05T00:00:00.000Z", scheduledEndAt: "2026-10-05T01:20:00.000Z",
  teacherCheckInAt: "2026-10-05T00:02:00.000Z", teacherCheckOutAt: "2026-10-05T01:21:00.000Z",
  checkInLatitude: -7.2001, checkInLongitude: 107.9002, checkInAccuracy: 12, checkInDistanceM: 17, checkInGeofence: "INSIDE", checkInEvidenceKey: "k1",
  checkOutLatitude: -7.2003, checkOutLongitude: 107.9004, checkOutAccuracy: 20, checkOutDistanceM: 40, checkOutGeofence: "INSIDE", checkOutEvidenceKey: "k2",
  course: { id: "c1", subjectName: "Matematika", teacher: { id: "t1", name: "Guru Contoh" }, classRoom: { id: "k1", name: "X A_1" } },
  schedule: { roomLabel: "K-13" }, agenda: null,
  ...over,
});
const other = (id: string, name: string, over: Record<string, unknown> = {}) =>
  session({ id, course: { id: "c" + id, subjectName: "Fisika", teacher: { id: "t" + id, name }, classRoom: { id: "k" + id, name: "XI B_1" } }, ...over });
const dataWith = (sessions: any[], s: any = school) => ({ from: "2026-09-28", to: "2026-10-05", school: s, summary: {}, sessions });

function renderPage(sessions: any[], s: any = school) {
  queryResult = { data: dataWith(sessions, s), isLoading: false, error: null };
  return render(<MemoryRouter><LmsTeachingMapPage user={{ id: "u1" } as any} /></MemoryRouter>);
}

beforeEach(() => {
  getMock.mockReset();
  mapProps = undefined;
  (URL as any).createObjectURL = vi.fn(() => "blob:foto");
  (URL as any).revokeObjectURL = vi.fn();
});

describe("LmsTeachingMapPage", () => {
  it("passes the school point and one marker per stored check-in and check-out to the map", () => {
    renderPage([session()]);
    expect(screen.getByTestId("map")).toHaveAttribute("data-school", "ada");
    expect(mapProps.school).toEqual({ latitude: -7.2, longitude: 107.9, radiusMeters: 100 });
    expect(mapProps.points.map((p: any) => p.id)).toEqual(["s1:CHECK_IN", "s1:CHECK_OUT"]);
    expect(mapProps.points[0].label).toContain("Guru Contoh · Matematika · X A_1");
  });

  it("selecting a marker shows the session with coordinates, accuracy, distance and photo buttons", () => {
    renderPage([session()]);
    fireEvent.click(screen.getByRole("button", { name: /^Check-in · Guru Contoh/ }));
    const detail = screen.getByTestId("selected-session");
    expect(within(detail).getByText("-7.200100, 107.900200")).toBeInTheDocument();
    expect(within(detail).getByText(/±12 m · 17 m dari titik sekolah/)).toBeInTheDocument();
    expect(within(detail).getByText(/Ruang jadwal K-13/)).toBeInTheDocument();
    expect(within(detail).getByRole("button", { name: "Foto masuk" })).toBeInTheDocument();
    expect(screen.getByTestId("map")).toHaveAttribute("data-selected", "s1:CHECK_IN");
  });

  it("selecting a session in the list highlights its check-in marker", () => {
    renderPage([session(), other("s2", "Guru Lain")]);
    fireEvent.click(within(screen.getByRole("list")).getByRole("button", { name: /Guru Lain/ }));
    expect(screen.getByTestId("map")).toHaveAttribute("data-selected", expect.stringMatching(/^s2:/));
  });

  it("filters by teacher, subject or class and by the toggles", () => {
    renderPage([session(), other("s2", "Guru Lain")]);
    fireEvent.change(screen.getByLabelText("Cari guru, mapel, atau rombel"), { target: { value: "fisika" } });
    expect(mapProps.points.every((p: any) => p.sessionId === "s2")).toBe(true);
    fireEvent.change(screen.getByLabelText("Cari guru, mapel, atau rombel"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Check-out" }));
    expect(mapProps.points.every((p: any) => p.kind === "CHECK_IN")).toBe(true);
  });

  it("can show only flagged sessions", () => {
    renderPage([session(), other("s2", "Guru Lain", { teacherCheckInAt: "2026-10-05T00:40:00.000Z" })]);
    fireEvent.click(screen.getByRole("button", { name: "Hanya yang bertanda" }));
    expect(new Set(mapProps.points.map((p: any) => p.sessionId))).toEqual(new Set(["s2"]));
  });

  it("explains an empty result and counts sessions without a stored point", () => {
    renderPage([session({ id: "p", status: "PENDING", teacherCheckInAt: null, teacherCheckOutAt: null, checkInLatitude: null, checkInLongitude: null, checkOutLatitude: null, checkOutLongitude: null })]);
    expect(screen.getByRole("status")).toHaveTextContent("Belum ada titik lokasi");
    expect(screen.getByText(/1 sesi lain tidak punya titik lokasi tercatat/)).toBeInTheDocument();
  });

  it("says so when the school coordinates are not configured", () => {
    renderPage([session()], { latitude: null, longitude: null, radiusMeters: 100, maxGpsAccuracyMeters: 50 });
    expect(screen.getByTestId("map")).toHaveAttribute("data-school", "tidak");
    expect(screen.getByText(/Koordinat sekolah belum diatur/)).toBeInTheDocument();
  });

  it("opens a photo in the app with the session token", async () => {
    getMock.mockReturnValue({ blob: async () => new Blob(["x"], { type: "image/jpeg" }) });
    renderPage([session()]);
    fireEvent.click(screen.getByRole("button", { name: /^Check-in · Guru Contoh/ }));
    fireEvent.click(within(screen.getByTestId("selected-session")).getByRole("button", { name: "Foto masuk" }));
    await waitFor(() => expect(getMock).toHaveBeenCalledWith("/operations/lms-teaching-evidence/s1/CHECK_IN"));
    expect(await screen.findByRole("img", { name: "Foto check-in guru" })).toHaveAttribute("src", "blob:foto");
  });

  it("has a legend that does not rely on colour alone, and a text alternative to the map", () => {
    renderPage([session()]);
    expect(screen.getByTestId("map-legend")).toHaveTextContent(/M.*bulat biru.*P.*kotak hijau.*S.*belah ketupat/);
    expect(screen.getByRole("link", { name: "Daftar audit" })).toHaveAttribute("href", "/school/lms/teaching/audit");
  });

  it("shows a load error", () => {
    queryResult = { data: undefined, isLoading: false, error: new Error("Audit KBM hanya tersedia untuk pengelola pembelajaran.") };
    render(<MemoryRouter><LmsTeachingMapPage user={{ id: "u1" } as any} /></MemoryRouter>);
    expect(screen.getByText("Audit KBM hanya tersedia untuk pengelola pembelajaran.")).toBeInTheDocument();
  });
});
