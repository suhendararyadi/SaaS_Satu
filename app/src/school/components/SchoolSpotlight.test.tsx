import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, useLocation } from "react-router";

const { useQueryMock } = vi.hoisted(() => ({
  useQueryMock: vi.fn(),
}));

vi.mock("wasp/client/operations", async (importOriginal) => {
  const actual = await importOriginal<typeof import("wasp/client/operations")>();
  return {
    ...actual,
    useQuery: (...args: any[]) => useQueryMock(...args),
  };
});

import { SchoolSpotlight } from "./SchoolSpotlight";

const menuItems = [
  {
    label: "Beranda",
    section: "UTAMA",
    href: "/school",
    icon: "home",
  },
  {
    label: "Data Siswa",
    section: "AKADEMIK",
    href: "/school/students",
    icon: "groups",
  },
  {
    label: "Website Sekolah",
    section: "PUBLIKASI",
    href: "/school/website",
    icon: "language",
  },
];

function LocationProbe() {
  const location = useLocation();
  return (
    <output data-testid="location">
      {location.pathname}
      {location.search}
    </output>
  );
}

describe("SchoolSpotlight", () => {
  beforeEach(() => {
    localStorage.removeItem("school_spotlight_recent_v1");
    useQueryMock.mockReset();
    useQueryMock.mockImplementation((_operation, _args, options) => ({
      data: options?.enabled
        ? {
            items: [
              {
                id: "class-1",
                kind: "CLASS",
                group: "Rombel",
                title: "XI RPL 1",
                subtitle: "RPL · 32 siswa",
                href: "/school/classes?spotlight=XI%20RPL%201",
                icon: "meeting_room",
              },
            ],
          }
        : undefined,
      isLoading: false,
      isFetching: false,
      error: null,
    }));
  });

  it("opens as an accessible search dialog and filters authorized menu candidates", () => {
    render(
      <MemoryRouter>
        <SchoolSpotlight isOpen onClose={vi.fn()} menuItems={menuItems} />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("dialog", { name: "Spotlight Search School OS" }),
    ).toBeInTheDocument();

    const input = screen.getByRole("searchbox", { name: "Cari di School OS" });
    fireEvent.change(input, { target: { value: "website" } });

    expect(screen.getByText("Website Sekolah")).toBeInTheDocument();
    expect(screen.queryByText("Data Siswa")).not.toBeInTheDocument();
  });

  it("renders server data after two characters and navigates to its deep link", async () => {
    render(
      <MemoryRouter initialEntries={["/school"]}>
        <SchoolSpotlight isOpen onClose={vi.fn()} menuItems={menuItems} />
        <LocationProbe />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "rpl" },
    });

    await waitFor(() => {
      expect(screen.getByText("XI RPL 1")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("XI RPL 1"));
    expect(screen.getByTestId("location")).toHaveTextContent(
      "/school/classes?spotlight=XI%20RPL%201",
    );
  });

  it("supports Escape to close the palette", () => {
    const onClose = vi.fn();
    render(
      <MemoryRouter>
        <SchoolSpotlight isOpen onClose={onClose} menuItems={menuItems} />
      </MemoryRouter>,
    );

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
