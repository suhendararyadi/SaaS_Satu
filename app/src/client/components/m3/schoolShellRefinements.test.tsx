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
