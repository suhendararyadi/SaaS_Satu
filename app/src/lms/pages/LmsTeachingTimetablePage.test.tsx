import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router";

const useQueryMock = vi.fn();
vi.mock("wasp/client/operations", () => ({
  getTeachingTimetable: "getTeachingTimetable",
  useQuery: (...args: unknown[]) => useQueryMock(...args),
}));
vi.mock("wasp/client/auth", () => ({ logout: vi.fn() }));
vi.mock("../../school/components/SchoolLayout", () => ({
  SchoolLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import { LmsTeachingTimetablePage } from "./LmsTeachingTimetablePage";
import { M3NavigationDrawer } from "../../client/components/m3";

const slot = (over: Record<string, unknown>) => ({
  id: "s",
  courseId: "c1",
  dayOfWeek: 3,
  startTime: "08:00",
  endTime: "09:20",
  roomLabel: "K-13",
  subjectName: "Matematika",
  classRoomId: "k1",
  className: "X A_1",
  departmentCode: "ATPH",
  teacherName: "Guru Contoh",
  isMine: true,
  ...over,
});

function data(over: Record<string, unknown> = {}) {
  return {
    academicYear: { id: "ay", yearName: "2026/2027", semester: "GANJIL" },
    mode: "MINE",
    canViewAll: false,
    scopeLabel: "Seluruh sekolah",
    slots: [
      slot({ id: "a", dayOfWeek: 3, startTime: "08:00", endTime: "09:20", subjectName: "Matematika" }),
      slot({ id: "b", dayOfWeek: 3, startTime: "10:00", endTime: "11:00", subjectName: "Informatika", className: "X B_2", classRoomId: "k2" }),
      slot({ id: "c", dayOfWeek: 1, startTime: "07:20", endTime: "08:40", subjectName: "Projek IPAS", className: "XI C_1", classRoomId: "k3", courseId: "c3" }),
    ],
    ...over,
  };
}

function renderPage(payload: unknown) {
  useQueryMock.mockReturnValue({ data: payload, isLoading: false, error: null });
  return render(
    <MemoryRouter>
      <LmsTeachingTimetablePage user={{ id: "u1" } as any} />
    </MemoryRouter>,
  );
}

describe("LmsTeachingTimetablePage", () => {
  beforeEach(() => {
    useQueryMock.mockReset();
    vi.useFakeTimers({ toFake: ["Date", "setInterval", "clearInterval"] });
    vi.setSystemTime(new Date("2026-10-07T01:30:00Z")); // Rabu 08:30 WIB
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("lists every session grouped by day, marking today and the running session", () => {
    renderPage(data());
    expect(screen.getByRole("heading", { level: 1, name: "Jadwal Mengajar" })).toBeInTheDocument();
    expect(screen.getByText(/tahun ajaran 2026\/2027 semester Ganjil/)).toBeInTheDocument();

    const dayHeadings = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(dayHeadings).toEqual(["Senin", "Selasa", "Rabu", "Kamis", "Jumat"]);

    const rabu = screen.getByRole("heading", { level: 2, name: "Rabu" }).closest("div")!.parentElement!.parentElement!;
    expect(within(rabu).getByText("Hari ini")).toBeInTheDocument();
    expect(within(rabu).getByText("Berlangsung")).toBeInTheDocument();
    expect(within(rabu).getByText("08:00–09:20")).toBeInTheDocument();
    expect(within(rabu).getByText("2 sesi · 2 jam 20 menit")).toBeInTheDocument();
    expect(screen.getAllByText("Hari ini")).toHaveLength(1);
    expect(screen.getAllByText("Berlangsung")).toHaveLength(1);
    expect(screen.getAllByText("Tidak ada sesi").length).toBe(3); // Selasa, Kamis, Jumat

    expect(screen.getAllByRole("link", { name: "Detail" })[0]).toHaveAttribute("href", "/school/lms/courses/c3/teaching");
  });

  it("summarises sessions, duration, days and classes", () => {
    renderPage(data());
    const card = (label: string) => screen.getByText(label).closest("div")!.parentElement!;
    expect(card("Sesi per minggu")).toHaveTextContent("3");
    expect(card("Durasi tatap muka")).toHaveTextContent("3 jam 40 menit");
    expect(card("Hari mengajar")).toHaveTextContent("2");
    expect(card("Rombel")).toHaveTextContent("3");
  });

  it("hides the scope tabs and teacher names for a plain teacher", () => {
    renderPage(data());
    expect(screen.queryByRole("tab", { name: "Jadwal saya" })).not.toBeInTheDocument();
    expect(screen.queryByText(/Guru Contoh/)).not.toBeInTheDocument();
  });

  it("lets a scoped viewer switch to all sessions and shows other teachers", () => {
    renderPage(
      data({
        canViewAll: true,
        mode: "ALL",
        slots: [slot({ id: "x", isMine: false, teacherName: "Guru Lain" })],
      }),
    );
    expect(screen.getByRole("tab", { name: "Semua dalam cakupan" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText(/Guru Lain/)).toBeInTheDocument();
    expect(screen.getByText("Cakupan: Seluruh sekolah")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Jadwal saya" }));
    expect(useQueryMock).toHaveBeenLastCalledWith("getTeachingTimetable", { scope: "MINE" });
  });

  it("explains an empty timetable instead of showing blank days", () => {
    renderPage(data({ slots: [] }));
    expect(screen.getByText("Belum ada jadwal mengajar")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 2, name: "Senin" })).not.toBeInTheDocument();
  });

  it("surfaces a load error", () => {
    useQueryMock.mockReturnValue({ data: undefined, isLoading: false, error: new Error("Gagal memuat") });
    render(
      <MemoryRouter>
        <LmsTeachingTimetablePage user={{ id: "u1" } as any} />
      </MemoryRouter>,
    );
    expect(screen.getByText("Gagal memuat")).toBeInTheDocument();
  });
});

describe("teacher sidebar entry", () => {
  it("highlights only Jadwal Mengajar on its own route, not KBM Hari Ini", () => {
    render(
      <MemoryRouter initialEntries={["/school/lms/schedule"]}>
        <M3NavigationDrawer
          isOpen={false}
          sections={[
            {
              title: "MENGAJAR",
              items: [
                { label: "KBM Hari Ini", href: "/school/lms/teaching", icon: "play_circle" },
                { label: "Jadwal Mengajar", href: "/school/lms/schedule", icon: "calendar_month" },
                { label: "Kelas & Mapel", href: "/school/lms/courses", icon: "menu_book" },
              ],
            },
          ]}
        />
      </MemoryRouter>,
    );
    const current = screen.getAllByRole("link").filter((link) => link.getAttribute("aria-current") === "page");
    expect(current.map((link) => link.textContent)).toEqual(["Jadwal Mengajar"]);
  });
});
