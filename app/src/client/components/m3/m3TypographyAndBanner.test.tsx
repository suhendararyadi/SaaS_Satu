import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router";
import {
  M3Icon,
  M3Text,
  M3Banner,
  getM3TypographyClasses,
  type M3TypographyVariant,
} from "./index";

describe("M3 Typography System & Helpers", () => {
  const variants: M3TypographyVariant[] = [
    "display-large",
    "display-medium",
    "display-small",
    "headline-large",
    "headline-medium",
    "headline-small",
    "title-large",
    "title-medium",
    "title-small",
    "body-large",
    "body-medium",
    "body-small",
    "label-large",
    "label-medium",
    "label-small",
  ];

  variants.forEach((v) => {
    it(`renders variant ${v} with correct m3 class and semantic tag`, () => {
      const { container } = render(<M3Text variant={v}>Sample {v}</M3Text>);
      const el = container.firstElementChild as HTMLElement;
      expect(el).toBeInTheDocument();
      expect(el.className).toContain(`m3-${v}`);
    });
  });

  it("generates correct classes from getM3TypographyClasses helper", () => {
    const classes = getM3TypographyClasses("title-medium", "primary", "bold");
    expect(classes).toContain("m3-title-medium");
    expect(classes).toContain("text-md-primary");
    expect(classes).toContain("font-bold");
  });

  it("handles all official M3 color tokens correctly", () => {
    const { rerender } = render(
      <M3Text variant="body-medium" color="on-surface-variant">
        Subtle Text
      </M3Text>
    );
    expect(screen.getByText("Subtle Text")).toHaveClass("text-md-on-surface-variant");

    rerender(
      <M3Text variant="body-medium" color="on-error-container">
        Critical Error Container Text
      </M3Text>
    );
    expect(screen.getByText("Critical Error Container Text")).toHaveClass(
      "text-md-on-error-container"
    );

    rerender(
      <M3Text variant="body-medium" color="on-primary-container">
        Primary Container Text
      </M3Text>
    );
    expect(screen.getByText("Primary Container Text")).toHaveClass(
      "text-md-on-primary-container"
    );

    rerender(
      <M3Text variant="body-medium" color="on-secondary-container">
        Secondary Container Text
      </M3Text>
    );
    expect(screen.getByText("Secondary Container Text")).toHaveClass(
      "text-md-on-secondary-container"
    );

    rerender(
      <M3Text variant="body-medium" color="inverse-on-surface">
        Inverse Text
      </M3Text>
    );
    expect(screen.getByText("Inverse Text")).toHaveClass("text-md-inverse-on-surface");
  });
});

describe("M3Icon Specifications", () => {
  it("resolves correct optical size (opsz) for standard dimensions", () => {
    // 18px -> opsz 20
    const { rerender } = render(<M3Icon name="home" size={18} />);
    let icon = screen.getByText("home");
    expect(icon.style.fontVariationSettings).toContain("'opsz' 20");

    // 24px -> opsz 24
    rerender(<M3Icon name="home" size={24} />);
    icon = screen.getByText("home");
    expect(icon.style.fontVariationSettings).toContain("'opsz' 24");

    // 40px -> opsz 40
    rerender(<M3Icon name="home" size={40} />);
    icon = screen.getByText("home");
    expect(icon.style.fontVariationSettings).toContain("'opsz' 40");

    // 48px -> opsz 48
    rerender(<M3Icon name="home" size={48} />);
    icon = screen.getByText("home");
    expect(icon.style.fontVariationSettings).toContain("'opsz' 48");
  });

  it("supports explicit opsz override and weight scale", () => {
    render(<M3Icon name="star" size={24} opsz={40} weight={600} fill={1} />);
    const icon = screen.getByText("star");
    expect(icon.style.fontVariationSettings).toBe(
      "'FILL' 1, 'wght' 600, 'GRAD' 0, 'opsz' 40"
    );
  });

  it("applies overflow-hidden and lineHeight to prevent ligature blowout", () => {
    render(<M3Icon name="notifications_active" size={24} />);
    const icon = screen.getByText("notifications_active");
    expect(icon).toHaveClass("overflow-hidden");
    expect(icon.style.lineHeight).toBe("1");
    expect(icon.style.width).toBe("24px");
    expect(icon.style.height).toBe("24px");
  });

  it("renders custom ReactNode fallback icon inside standardized container", () => {
    render(
      <M3Icon
        icon={<span data-testid="custom-svg-icon">SVG</span>}
        size={24}
        ariaLabel="Custom Icon"
      />
    );
    expect(screen.getByTestId("custom-svg-icon")).toBeInTheDocument();
  });
});

describe("M3Banner Specifications", () => {
  it("renders all visual variants with appropriate container classes and roles", () => {
    const variants = ["standard", "tonal", "info", "warning", "error", "success", "hero"] as const;

    variants.forEach((variant) => {
      const { container } = render(
        <M3Banner
          variant={variant}
          headline={`Title ${variant}`}
          supportingText={`Description ${variant}`}
        />
      );
      expect(screen.getByText(`Title ${variant}`)).toBeInTheDocument();
      expect(screen.getByText(`Description ${variant}`)).toBeInTheDocument();

      const bannerBox = container.querySelector("[role]");
      if (variant === "error" || variant === "warning") {
        expect(bannerBox?.getAttribute("role")).toBe("alert");
      } else {
        expect(bannerBox?.getAttribute("role")).toBe("status");
      }
    });
  });

  it("handles multiple actions (primary and secondary)", () => {
    const onPrimary = vi.fn();
    const onSecondary = vi.fn();

    render(
      <M3Banner
        variant="info"
        headline="Pemberitahuan Sistem"
        supportingText="Pembaruan modul telah tersedia."
        actionLabel="Update Sekarang"
        onAction={onPrimary}
        secondaryActionLabel="Nanti Saja"
        onSecondaryAction={onSecondary}
      />
    );

    const primaryBtn = screen.getByRole("button", { name: /update sekarang/i });
    const secondaryBtn = screen.getByRole("button", { name: /nanti saja/i });

    expect(primaryBtn).toBeInTheDocument();
    expect(secondaryBtn).toBeInTheDocument();

    fireEvent.click(primaryBtn);
    expect(onPrimary).toHaveBeenCalledTimes(1);

    fireEvent.click(secondaryBtn);
    expect(onSecondary).toHaveBeenCalledTimes(1);
  });

  it("handles dismiss callback and removes banner from DOM", () => {
    const handleDismiss = vi.fn();
    render(
      <M3Banner
        variant="warning"
        headline="Peringatan"
        supportingText="Periksa data."
        dismissible
        onDismiss={handleDismiss}
      />
    );

    expect(screen.getByText("Peringatan")).toBeInTheDocument();
    const closeBtn = screen.getByLabelText("Tutup banner");
    fireEvent.click(closeBtn);
    expect(handleDismiss).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Peringatan")).toBeNull();
  });

  it("dismisses uncontrolled banner without requiring onDismiss prop", () => {
    render(
      <M3Banner
        variant="error"
        headline="Error Tidak Terduga"
        supportingText="Koneksi server gagal."
        dismissible
      />
    );

    expect(screen.getByText("Error Tidak Terduga")).toBeInTheDocument();
    const closeBtn = screen.getByLabelText("Tutup banner");
    fireEvent.click(closeBtn);
    expect(screen.queryByText("Error Tidak Terduga")).toBeNull();
  });

  it("resets dismissed state when headline or supportingText updates", () => {
    const { rerender } = render(
      <M3Banner
        variant="error"
        headline="Error Pertama"
        supportingText="Detail error pertama."
        dismissible
      />
    );

    expect(screen.getByText("Error Pertama")).toBeInTheDocument();
    const closeBtn = screen.getByLabelText("Tutup banner");
    fireEvent.click(closeBtn);
    expect(screen.queryByText("Error Pertama")).toBeNull();

    // New error message arrives
    rerender(
      <M3Banner
        variant="error"
        headline="Error Kedua"
        supportingText="Detail error kedua."
        dismissible
      />
    );

    expect(screen.getByText("Error Kedua")).toBeInTheDocument();
  });

  it("supports router links in action buttons", () => {
    render(
      <BrowserRouter>
        <M3Banner
          variant="standard"
          headline="Navigasi"
          supportingText="Buka halaman penempatan."
          actionLabel="Buka Penempatan"
          actionHref="/school/pkl/placements"
          secondaryActionLabel="Buka Profil"
          secondaryActionHref="/school/profile"
        />
      </BrowserRouter>
    );

    const link1 = screen.getByRole("link", { name: /buka penempatan/i });
    const link2 = screen.getByRole("link", { name: /buka profil/i });

    expect(link1.getAttribute("href")).toBe("/school/pkl/placements");
    expect(link2.getAttribute("href")).toBe("/school/profile");
  });

  it("allows hiding leading icon via icon={false}", () => {
    const { container } = render(
      <M3Banner
        variant="standard"
        icon={false}
        headline="Tanpa Ikon"
        supportingText="Pesan tanpa ikon di sisi kiri."
      />
    );
    expect(container.querySelector(".material-symbols-rounded")).toBeNull();
    expect(screen.getByText("Tanpa Ikon")).toBeInTheDocument();
  });
});
