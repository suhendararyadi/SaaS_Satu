import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const saveMock = vi.fn();
const refetchMock = vi.fn();
let queryData: any;
vi.mock("wasp/client/operations", () => ({
  getAttendanceSettings: "getAttendanceSettings",
  saveAttendancePolicy: (...args: unknown[]) => saveMock(...args),
  saveAttendanceCalendarDay: vi.fn(),
  deleteAttendanceCalendarDay: vi.fn(),
  useQuery: () => ({ data: queryData, isLoading: false, refetch: refetchMock }),
}));
vi.mock("wasp/client/auth", () => ({ logout: vi.fn() }));
vi.mock("../../school/components/SchoolLayout", () => ({
  SchoolLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import { AttendanceSettingsPage } from "./AttendanceSettingsPage";

const policy = (over: Record<string, unknown> = {}) => ({
  id: "p1", schoolId: "s1", timezone: "Asia/Jakarta",
  latitude: -7.200116595457873, longitude: 107.8887518789388,
  radiusMeters: 100, maxGpsAccuracyMeters: 50,
  checkInOpen: "05:30", lateAfter: "06:30", checkInClose: "09:00", checkOutOpen: "15:00", checkOutClose: "18:00",
  allowStudentCheckIn: true, allowStudentCheckOut: true, requireCheckInSelfie: true, requireCheckOutSelfie: true,
  workingDays: "1,2,3,4,5", isActive: true,
  createdAt: "2026-10-01T20:03:11.934Z", updatedAt: "2026-10-01T20:56:21.196Z",
  ...over,
});

function renderPage() {
  return render(<AttendanceSettingsPage user={{ id: "u1" } as any} />);
}
const lat = () => screen.getByLabelText("Latitude sekolah") as HTMLInputElement;
const lng = () => screen.getByLabelText("Longitude sekolah") as HTMLInputElement;
const clickSave = () => fireEvent.click(screen.getByRole("button", { name: "Simpan Kebijakan" }));
const paste = (el: HTMLElement, text: string) => fireEvent.paste(el, { clipboardData: { getData: () => text } });

describe("AttendanceSettingsPage: lokasi sekolah", () => {
  beforeEach(() => {
    saveMock.mockReset().mockImplementation(async (payload: any) => ({ ...policy(), ...payload }));
    refetchMock.mockReset().mockResolvedValue({});
    queryData = { policy: policy(), calendarDays: [] };
  });

  it("shows the location saved on the server, when it changed, and a map link", () => {
    renderPage();
    const saved = screen.getByTestId("saved-location");
    expect(saved).toHaveTextContent("-7.200116595457873, 107.8887518789388");
    expect(saved).toHaveTextContent(/Terakhir diubah .*WIB/);
    expect(within(saved).getByRole("link", { name: "Lihat di peta" })).toHaveAttribute("href", expect.stringContaining("google.com/maps?q=-7.200116595457873%2C107.8887518789388"));
  });

  it("says so when nothing has been saved yet", () => {
    queryData = { policy: policy({ latitude: null, longitude: null, updatedAt: null }), calendarDays: [] };
    renderPage();
    const saved = screen.getByTestId("saved-location");
    expect(saved).toHaveTextContent("belum diatur");
    expect(saved).toHaveTextContent("Kebijakan belum pernah disimpan");
    expect(within(saved).queryByRole("link")).not.toBeInTheDocument();
  });

  it("splits a pasted \"lat, lng\" pair into both fields, whichever field it lands in", () => {
    renderPage();
    paste(lat(), "-7.2123456, 107.9138509");
    expect(lat()).toHaveValue("-7.2123456");
    expect(lng()).toHaveValue("107.9138509");
    paste(lng(), "-7.3, 107.5");
    expect(lat()).toHaveValue("-7.3");
    expect(lng()).toHaveValue("107.5");
  });

  it("also splits a pair that arrives through typing or autofill", () => {
    renderPage();
    fireEvent.change(lat(), { target: { value: "(-7.25; 107.95)" } });
    expect(lat()).toHaveValue("-7.25");
    expect(lng()).toHaveValue("107.95");
  });

  it("lets a single value be pasted normally", () => {
    renderPage();
    fireEvent.change(lat(), { target: { value: "-7.31" } });
    expect(lat()).toHaveValue("-7.31");
    expect(lng()).toHaveValue("107.8887518789388");
  });

  it("sends numbers and confirms the saved location read back from the server", async () => {
    renderPage();
    paste(lat(), "-7.2123456, 107.9138509");
    clickSave();
    await waitFor(() => expect(saveMock).toHaveBeenCalledTimes(1));
    expect(saveMock.mock.calls[0][0]).toMatchObject({ latitude: -7.2123456, longitude: 107.9138509, radiusMeters: 100 });
    expect(await screen.findByText("Kebijakan kehadiran tersimpan. Lokasi sekolah: -7.2123456, 107.9138509.")).toBeInTheDocument();
    expect(refetchMock).toHaveBeenCalled();
  });

  it("flags it loudly if the server stored something different", async () => {
    saveMock.mockResolvedValue(policy({ latitude: -1, longitude: 100 }));
    renderPage();
    paste(lat(), "-7.2123456, 107.9138509");
    clickSave();
    expect(await screen.findByText(/Server menyimpan lokasi yang berbeda/)).toBeInTheDocument();
    expect(screen.queryByText(/Kebijakan kehadiran tersimpan/)).not.toBeInTheDocument();
  });

  it("blocks and explains an invalid or swapped value instead of rejecting silently", () => {
    renderPage();
    fireEvent.change(lat(), { target: { value: "107.8887" } });
    fireEvent.change(lng(), { target: { value: "-7.2001" } });
    expect(screen.getByText(/Urutannya mungkin tertukar/)).toBeInTheDocument();
    clickSave();
    expect(saveMock).not.toHaveBeenCalled();
    expect(screen.getAllByText(/Urutannya mungkin tertukar/).length).toBeGreaterThan(0);
  });

  it("blocks when only one coordinate is filled", () => {
    renderPage();
    fireEvent.change(lng(), { target: { value: "" } });
    expect(screen.getByText("Longitude belum diisi.")).toBeInTheDocument();
    clickSave();
    expect(saveMock).not.toHaveBeenCalled();
  });

  it("refuses to save an active policy without coordinates, so the location is never cleared by accident", () => {
    renderPage();
    fireEvent.change(lat(), { target: { value: "" } });
    fireEvent.change(lng(), { target: { value: "" } });
    clickSave();
    expect(saveMock).not.toHaveBeenCalled();
    expect(screen.getByText(/Kebijakan aktif membutuhkan koordinat sekolah/)).toBeInTheDocument();
  });

  it("allows empty coordinates once the policy is switched off", async () => {
    queryData = { policy: policy({ isActive: false }), calendarDays: [] };
    renderPage();
    fireEvent.change(lat(), { target: { value: "" } });
    fireEvent.change(lng(), { target: { value: "" } });
    clickSave();
    await waitFor(() => expect(saveMock).toHaveBeenCalledTimes(1));
    expect(saveMock.mock.calls[0][0]).toMatchObject({ latitude: null, longitude: null, isActive: false });
    expect(await screen.findByText(/Koordinat sekolah masih kosong/)).toBeInTheDocument();
  });

  it("shows a server error in the page instead of an alert", async () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    saveMock.mockRejectedValue(new Error("Operation arguments validation failed"));
    renderPage();
    clickSave();
    expect(await screen.findByText("Operation arguments validation failed")).toBeInTheDocument();
    expect(alertSpy).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });
});
