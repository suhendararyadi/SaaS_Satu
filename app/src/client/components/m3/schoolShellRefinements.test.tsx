import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router";
import { M3AccountMenu } from "./M3AccountMenu";
import { M3NavigationDrawer } from "./M3NavigationDrawer";

const schoolSections = [
  {
    title: "AKADEMIK",
    items: [
      { label: "Data Siswa", href: "/school/students", icon: "groups" },
      { label: "Guru & Tendik", href: "/school/teachers", icon: "badge" },
    ],
  },
  {
    title: "PKL",
    items: [
      { label: "Monitoring PKL", href: "/school/pkl/monitoring", icon: "monitor_heart" },
    ],
  },
];

describe("School shell refinements", () => {
  it("filters existing school navigation and hides the duplicate account footer", () => {
    render(
      <MemoryRouter initialEntries={["/school"]}>
        <M3NavigationDrawer
          sections={schoolSections}
          footer={<div data-testid="school-account-footer">Akun Sidebar</div>}
          isOpen={false}
        />
      </MemoryRouter>,
    );

    expect(screen.queryByTestId("school-account-footer")).not.toBeInTheDocument();

    const search = screen.getByRole("searchbox", { name: "Cari menu sidebar" });
    fireEvent.change(search, { target: { value: "siswa" } });

    expect(screen.getByText("Data Siswa")).toBeInTheDocument();
    expect(screen.queryByText("Guru & Tendik")).not.toBeInTheDocument();
    expect(screen.queryByText("Monitoring PKL")).not.toBeInTheDocument();

    fireEvent.change(search, { target: { value: "tidak-ada" } });
    expect(screen.getByRole("status")).toHaveTextContent("Menu tidak ditemukan.");
  });

  it("keeps the account trigger compact and avatar-only", () => {
    render(
      <MemoryRouter>
        <M3AccountMenu
          user={{
            id: "admin-test",
            name: "Admin Test",
            email: "admin@example.invalid",
            username: "admin-test",
            isAdmin: true,
            role: "SUPERADMIN",
          } as any}
        />
      </MemoryRouter>,
    );

    const trigger = screen.getByRole("button", { name: "Buka menu akun Admin Test" });
    expect(trigger).toHaveTextContent("A");
    expect(trigger).not.toHaveTextContent("Admin Test");
    expect(trigger).not.toHaveTextContent("expand_more");
  });
});

describe("School account routing", () => {
  it("shows School Profile but hides SaaS account for teachers", async () => {
    render(
      <MemoryRouter>
        <M3AccountMenu
          user={{
            id: "teacher-test",
            name: "Guru Test",
            email: "guru@example.invalid",
            username: "guru-test",
            schoolId: "school-a",
            isAdmin: false,
            role: "TEACHER",
          } as any}
        />
      </MemoryRouter>,
    );

    fireEvent.pointerDown(screen.getByRole("button", { name: "Buka menu akun Guru Test" }), { button: 0, ctrlKey: false });
    const profile = await screen.findByRole("menuitem", { name: /Profil Saya/i });
    expect(profile.querySelector("a")?.getAttribute("href") || profile.getAttribute("href")).toContain("/school/profile");
    expect(screen.queryByText("Akun & Langganan")).not.toBeInTheDocument();
  });

  it("keeps both School Profile and SaaS account for school admins", async () => {
    render(
      <MemoryRouter>
        <M3AccountMenu
          user={{
            id: "school-admin-test",
            name: "Admin Sekolah",
            email: "admin@example.invalid",
            username: "admin-school",
            schoolId: "school-a",
            isAdmin: false,
            role: "SCHOOL_ADMIN",
          } as any}
        />
      </MemoryRouter>,
    );

    fireEvent.pointerDown(screen.getByRole("button", { name: "Buka menu akun Admin Sekolah" }), { button: 0, ctrlKey: false });
    expect(await screen.findByText("Profil Saya")).toBeInTheDocument();
    expect(screen.getByText("Akun & Langganan")).toBeInTheDocument();
  });
});
