import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router";

const loginMock = vi.fn();
vi.mock("wasp/client/auth", () => ({
  login: (...args: unknown[]) => loginMock(...args),
  useAuth: () => ({ data: null }),
  logout: vi.fn(),
}));
vi.mock("wasp/client/router", () => ({
  Link: ({ to, children, ...rest }: { to: string; children: React.ReactNode }) => <a href={to} {...rest}>{children}</a>,
  routes: { RequestPasswordResetRoute: { to: "/request-password-reset" }, SignupRoute: { to: "/signup" } },
}));

import { LoginPage } from "./LoginPage";

function renderPage() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
  );
}

describe("LoginPage", () => {
  beforeEach(() => {
    loginMock.mockReset();
    window.localStorage.clear();
  });

  it("shows the email form by default, in Indonesian, with sign-up and reset links", () => {
    renderPage();
    expect(screen.getByRole("form", { name: "Masuk dengan email" })).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveAttribute("type", "email");
    expect(screen.getByLabelText("Kata sandi")).toHaveAttribute("type", "password");
    expect(screen.getByRole("button", { name: "Masuk" })).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/Log in|Password|E-mail/);
    expect(screen.getByRole("tab", { name: "Email" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("link", { name: "Atur ulang" })).toHaveAttribute("href", "/request-password-reset");
    expect(screen.getByRole("link", { name: "Daftar akun" })).toHaveAttribute("href", "/signup");
  });

  it("switches to the NISN form without sign-up or reset links, and never reveals the password convention", () => {
    renderPage();
    fireEvent.click(screen.getByRole("tab", { name: "NISN (siswa)" }));
    expect(screen.queryByRole("form", { name: "Masuk dengan email" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("NISN")).toBeInTheDocument();
    expect(screen.getByLabelText("Kata sandi")).toHaveAttribute("type", "password");
    expect(screen.queryByRole("link", { name: "Daftar akun" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Atur ulang" })).not.toBeInTheDocument();
    expect(screen.getByText(/Hubungi wali kelas atau admin sekolah/)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/awal|sama dengan NISN|students\.schoolos/i);
  });

  it("remembers the last chosen tab", () => {
    const first = renderPage();
    fireEvent.click(screen.getByRole("tab", { name: "NISN (siswa)" }));
    first.unmount();
    renderPage();
    expect(screen.getByRole("tab", { name: "NISN (siswa)" })).toHaveAttribute("aria-selected", "true");
  });
});

describe("StudentNisnLoginForm", () => {
  beforeEach(() => {
    loginMock.mockReset();
    window.localStorage.clear();
  });

  function openForm() {
    renderPage();
    fireEvent.click(screen.getByRole("tab", { name: "NISN (siswa)" }));
  }
  const fill = (nisn: string, password: string) => {
    fireEvent.change(screen.getByLabelText("NISN"), { target: { value: nisn } });
    fireEvent.change(screen.getByLabelText("Kata sandi"), { target: { value: password } });
  };

  it("logs in with the internal email built from the NISN", async () => {
    loginMock.mockResolvedValue(undefined);
    openForm();
    fill("0071001891", "rahasia-123");
    fireEvent.click(screen.getByRole("button", { name: "Masuk" }));
    await waitFor(() => expect(loginMock).toHaveBeenCalledTimes(1));
    expect(loginMock).toHaveBeenCalledWith({ email: "0071001891@students.schoolos.invalid", password: "rahasia-123" });
  });

  it("keeps digits only, at most ten, and trims pasted spaces", () => {
    openForm();
    fireEvent.change(screen.getByLabelText("NISN"), { target: { value: " 0071 0018-91999 " } });
    expect(screen.getByLabelText("NISN")).toHaveValue("0071001891");
  });

  it("rejects an incomplete NISN or an empty password before calling the server", () => {
    openForm();
    fill("12345", "x");
    fireEvent.click(screen.getByRole("button", { name: "Masuk" }));
    expect(screen.getByRole("alert")).toHaveTextContent("NISN terdiri dari 10 angka.");
    fill("0071001891", "");
    fireEvent.click(screen.getByRole("button", { name: "Masuk" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Kata sandi belum diisi.");
    expect(loginMock).not.toHaveBeenCalled();
  });

  it("shows one generic message for wrong credentials, without saying which part was wrong", async () => {
    loginMock.mockRejectedValue(Object.assign(new Error("Invalid credentials"), { statusCode: 401 }));
    openForm();
    fill("0071001891", "salah");
    fireEvent.click(screen.getByRole("button", { name: "Masuk" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("NISN atau kata sandi tidak sesuai.");
  });

  it("shows a connection message for other failures and re-enables the button", async () => {
    loginMock.mockRejectedValue(new Error("Failed to fetch"));
    openForm();
    fill("0071001891", "apa-saja");
    fireEvent.click(screen.getByRole("button", { name: "Masuk" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Periksa koneksi internet");
    await waitFor(() => expect(screen.getByRole("button", { name: "Masuk" })).not.toBeDisabled());
  });

  it("does not submit twice while a login is in flight", async () => {
    let resolve!: () => void;
    loginMock.mockReturnValue(new Promise<void>((r) => { resolve = r; }));
    openForm();
    fill("0071001891", "apa-saja");
    const form = screen.getByRole("form", { name: "Masuk dengan NISN" });
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(loginMock).toHaveBeenCalledTimes(1);
    resolve();
    await waitFor(() => expect(screen.getByRole("button", { name: "Masuk" })).not.toBeDisabled());
  });

  it("can reveal the password on request", () => {
    openForm();
    expect(screen.getByLabelText("Kata sandi")).toHaveAttribute("type", "password");
    fireEvent.click(screen.getByRole("button", { name: "Tampilkan kata sandi" }));
    expect(screen.getByLabelText("Kata sandi")).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: "Sembunyikan kata sandi" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Sembunyikan kata sandi" }));
    expect(screen.getByLabelText("Kata sandi")).toHaveAttribute("type", "password");
  });
});

describe("EmailLoginForm", () => {
  beforeEach(() => {
    loginMock.mockReset();
    window.localStorage.clear();
  });
  const fill = (email: string, password: string) => {
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: email } });
    fireEvent.change(screen.getByLabelText("Kata sandi"), { target: { value: password } });
  };

  it("logs in with the trimmed email", async () => {
    loginMock.mockResolvedValue(undefined);
    renderPage();
    fill("  guru@sekolah.sch.id ", "rahasia-123");
    fireEvent.click(screen.getByRole("button", { name: "Masuk" }));
    await waitFor(() => expect(loginMock).toHaveBeenCalledTimes(1));
    expect(loginMock).toHaveBeenCalledWith({ email: "guru@sekolah.sch.id", password: "rahasia-123" });
  });

  it("rejects an invalid email or empty password before calling the server", () => {
    renderPage();
    fill("bukan-email", "x");
    fireEvent.click(screen.getByRole("button", { name: "Masuk" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Masukkan alamat email yang valid.");
    fill("guru@sekolah.sch.id", "");
    fireEvent.click(screen.getByRole("button", { name: "Masuk" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Kata sandi belum diisi.");
    expect(loginMock).not.toHaveBeenCalled();
  });

  it("points a student who typed a NISN to the NISN tab", () => {
    renderPage();
    fill("0071001891", "x");
    fireEvent.click(screen.getByRole("button", { name: "Masuk" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Siswa masuk lewat tab NISN (siswa).");
    expect(loginMock).not.toHaveBeenCalled();
  });

  it("shows one generic message for wrong credentials and a connection message otherwise", async () => {
    loginMock.mockRejectedValueOnce(Object.assign(new Error("Invalid credentials"), { statusCode: 401 }));
    renderPage();
    fill("guru@sekolah.sch.id", "salah");
    fireEvent.click(screen.getByRole("button", { name: "Masuk" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Email atau kata sandi tidak sesuai.");
    loginMock.mockRejectedValueOnce(new Error("Failed to fetch"));
    fireEvent.click(screen.getByRole("button", { name: "Masuk" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Periksa koneksi internet"));
  });
});
