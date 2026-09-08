import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router";
import {
  M3Button,
  M3Card,
  M3CardHeader,
  M3CardTitle,
  M3CardSubtitle,
  M3CardContent,
  M3CardActions,
  M3Badge,
  M3Chip,
  M3Dialog,
  M3Divider,
  M3Icon,
  M3LinearProgress,
  M3CircularProgress,
  M3Select,
  M3Switch,
  M3Table,
  M3TableHeader,
  M3TableBody,
  M3TableRow,
  M3TableHead,
  M3TableCell,
  M3Tabs,
  M3TextField,
  M3Text,
  M3Banner,
  M3NavigationDrawer,
} from "./index";

describe("Google Material 3 (M3) Components", () => {
  describe("M3Button", () => {
    it("renders filled button with text and handles clicks", () => {
      const handleClick = vi.fn();
      render(<M3Button onClick={handleClick}>Simpan</M3Button>);
      const btn = screen.getByRole("button", { name: /simpan/i });
      expect(btn).toBeInTheDocument();
      expect(btn.className).toContain("bg-md-primary");
      fireEvent.click(btn);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it("renders tonal and danger variants", () => {
      const { rerender } = render(<M3Button variant="tonal">Batal</M3Button>);
      expect(screen.getByRole("button").className).toContain("bg-md-primary-container");
      expect(screen.getByRole("button").className).toContain("text-md-on-primary-container");

      rerender(<M3Button variant="danger">Hapus</M3Button>);
      expect(screen.getByRole("button").className).toContain("bg-md-error");
    });

    it("handles isLoading and loading aliases", () => {
      const { rerender } = render(<M3Button isLoading>Loading 1</M3Button>);
      const btn1 = screen.getByRole("button");
      expect(btn1).toBeDisabled();
      expect(btn1.querySelector(".animate-spin")).toBeInTheDocument();

      rerender(<M3Button loading>Loading 2</M3Button>);
      const btn2 = screen.getByRole("button");
      expect(btn2).toBeDisabled();
      expect(btn2.querySelector(".animate-spin")).toBeInTheDocument();
    });

    it("renders internal router link when href is provided", () => {
      render(
        <BrowserRouter>
          <M3Button href="/school">Navigasi</M3Button>
        </BrowserRouter>
      );
      const link = screen.getByRole("link", { name: /navigasi/i });
      expect(link).toBeInTheDocument();
      expect(link.getAttribute("href")).toBe("/school");
    });
  });

  describe("M3Card", () => {
    it("renders card with elevated, outlined, and tonal variants", () => {
      const { rerender, container } = render(
        <M3Card variant="elevated">
          <M3CardHeader>
            <M3CardTitle>Judul Kartu</M3CardTitle>
            <M3CardSubtitle>Subjudul Kartu</M3CardSubtitle>
          </M3CardHeader>
          <M3CardContent>Isi konten kartu</M3CardContent>
          <M3CardActions>
            <M3Button size="sm">Aksi</M3Button>
          </M3CardActions>
        </M3Card>
      );
      expect(container.firstChild).toHaveClass("bg-md-surface");
      expect(container.firstChild).toHaveClass("border-md-outline-variant/45");

      rerender(<M3Card variant="tonal">Tonal Card</M3Card>);
      expect(container.firstChild).toHaveClass("bg-md-primary-container/42");
      expect(container.firstChild).toHaveClass("border-md-primary/10");

      rerender(<M3Card variant="outlined">Outlined Card</M3Card>);
      expect(container.firstChild).toHaveClass("border-md-outline-variant/70");
    });
  });

  describe("M3Badge", () => {
    it("renders badges with semantic color roles", () => {
      const { rerender } = render(<M3Badge variant="primary">Aktif</M3Badge>);
      expect(screen.getByText("Aktif")).toHaveClass("bg-md-primary-container");
      expect(screen.getByText("Aktif")).toHaveClass("text-md-on-primary-container");

      rerender(<M3Badge variant="error">Bahaya</M3Badge>);
      expect(screen.getByText("Bahaya")).toHaveClass("bg-md-error");

      rerender(<M3Badge variant="success">Berhasil</M3Badge>);
      expect(screen.getByText("Berhasil")).toHaveClass("text-emerald-900");
    });
  });

  describe("M3Chip", () => {
    it("renders assist and filter chips with selection states", () => {
      const handleRemove = vi.fn();
      render(
        <M3Chip variant="filter" selected onRemove={handleRemove}>
          Filter Terpilih
        </M3Chip>
      );
      expect(screen.getByText("Filter Terpilih")).toBeInTheDocument();
      const removeBtn = screen.getByRole("button");
      fireEvent.click(removeBtn);
      expect(handleRemove).toHaveBeenCalledTimes(1);
    });
  });

  describe("M3Dialog", () => {
    it("renders dialog with title, description, and actions when open", () => {
      const handleClose = vi.fn();
      render(
        <M3Dialog
          isOpen={true}
          onClose={handleClose}
          title="Konfirmasi Tindakan"
          description="Apakah Anda yakin ingin melanjutkan?"
          actions={<M3Button onClick={handleClose}>OK</M3Button>}
        >
          <div>Konten Tambahan Dialog</div>
        </M3Dialog>
      );

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText("Konfirmasi Tindakan")).toBeInTheDocument();
      expect(screen.getByText("Apakah Anda yakin ingin melanjutkan?")).toBeInTheDocument();
      expect(screen.getByText("Konten Tambahan Dialog")).toBeInTheDocument();

      fireEvent.keyDown(window, { key: "Escape" });
      expect(handleClose).toHaveBeenCalled();
    });

    it("does not render when isOpen is false", () => {
      render(
        <M3Dialog isOpen={false} onClose={vi.fn()} title="Tertutup">
          Isi
        </M3Dialog>
      );
      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });

  describe("M3LinearProgress and M3CircularProgress", () => {
    it("renders determinate progress with max calculation", () => {
      render(<M3LinearProgress value={50} max={200} />);
      const bar = screen.getByRole("progressbar");
      expect(bar).toBeInTheDocument();
      const fill = bar.querySelector("div");
      // 50 / 200 = 25%
      expect(fill?.getAttribute("style")).toContain("width: 25%");
    });

    it("renders circular progress with indeterminate animation", () => {
      render(<M3CircularProgress indeterminate size={40} />);
      const progress = screen.getByRole("progressbar");
      expect(progress.querySelector(".animate-spin")).toBeInTheDocument();
    });
  });

  describe("M3Select", () => {
    it("renders dropdown with options and supporting text", () => {
      const options = [
        { label: "Opsi 1", value: "1" },
        { label: "Opsi 2", value: "2" },
      ];
      render(
        <M3Select
          label="Pilih Sesi"
          options={options}
          supportingText="Pilih salah satu sesi"
        />
      );
      expect(screen.getByLabelText("Pilih Sesi")).toBeInTheDocument();
      expect(screen.getByText("Opsi 1")).toBeInTheDocument();
      expect(screen.getByText("Pilih salah satu sesi")).toBeInTheDocument();
    });
  });

  describe("M3Switch", () => {
    it("handles switch toggle", () => {
      const handleChange = vi.fn();
      render(<M3Switch checked={false} onChange={handleChange} label="Aktifkan Notifikasi" />);
      const toggle = screen.getByRole("switch");
      expect(toggle.getAttribute("aria-checked")).toBe("false");
      fireEvent.click(toggle);
      expect(handleChange).toHaveBeenCalledWith(true);
    });
  });

  describe("M3Table", () => {
    it("renders table with header and rows", () => {
      render(
        <M3Table>
          <M3TableHeader>
            <M3TableRow>
              <M3TableHead>Nama</M3TableHead>
              <M3TableHead>Role</M3TableHead>
            </M3TableRow>
          </M3TableHeader>
          <M3TableBody>
            <M3TableRow>
              <M3TableCell>Budi</M3TableCell>
              <M3TableCell>Guru</M3TableCell>
            </M3TableRow>
          </M3TableBody>
        </M3Table>
      );
      expect(screen.getByText("Nama")).toBeInTheDocument();
      expect(screen.getByText("Budi")).toBeInTheDocument();
      expect(screen.getByText("Guru")).toBeInTheDocument();
    });
  });

  describe("M3Tabs", () => {
    it("renders tabs and triggers onChange", () => {
      const handleChange = vi.fn();
      const tabs = [
        { id: "tab1", label: "Tab 1", badge: 5 },
        { id: "tab2", label: "Tab 2" },
      ];
      render(<M3Tabs tabs={tabs} activeTab="tab1" onChange={handleChange} />);
      expect(screen.getByText("Tab 1")).toBeInTheDocument();
      expect(screen.getByText("5")).toBeInTheDocument();
      fireEvent.click(screen.getByText("Tab 2"));
      expect(handleChange).toHaveBeenCalledWith("tab2");
    });
  });

  describe("M3TextField", () => {
    it("renders text field with label, error, and inputs", () => {
      const handleChange = vi.fn();
      render(
        <M3TextField
          label="Nama Lengkap"
          error="Nama wajib diisi"
          onChange={handleChange}
        />
      );
      expect(screen.getByLabelText("Nama Lengkap")).toBeInTheDocument();
      expect(screen.getByText("Nama wajib diisi")).toBeInTheDocument();
    });
  });

  describe("M3Icon", () => {
    it("renders Google Material Symbol with correct font variation settings and classes", () => {
      render(
        <M3Icon
          name="school"
          size={24}
          weight={500}
          fill={1}
          grade={0}
          opsz={24}
          variant="rounded"
        />
      );
      const icon = screen.getByText("school");
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveClass("material-symbols-rounded");
      expect(icon.style.fontVariationSettings).toBe(
        "'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 24"
      );
      expect(icon.style.fontSize).toBe("24px");
    });

    it("renders Material Symbols Outlined variant and handles filled boolean", () => {
      render(
        <M3Icon
          name="warning"
          variant="outlined"
          filled
          size={20}
        />
      );
      const icon = screen.getByText("warning");
      expect(icon).toHaveClass("material-symbols-outlined");
      expect(icon.style.fontVariationSettings).toContain("'FILL' 1");
      expect(icon.style.fontVariationSettings).toContain("'opsz' 20");
    });

    it("renders custom ReactNode icon fallback with standard sizing", () => {
      render(
        <M3Icon
          icon={<span data-testid="custom-svg">SVG</span>}
          size={40}
        />
      );
      const custom = screen.getByTestId("custom-svg");
      expect(custom).toBeInTheDocument();
      const parent = custom.parentElement;
      expect(parent?.style.width).toBe("40px");
      expect(parent?.style.height).toBe("40px");
    });

    it("supports accessible ariaLabel and decorative ariaHidden", () => {
      render(
        <M3Icon
          name="info"
          ariaLabel="Informasi Penting"
        />
      );
      const icon = screen.getByLabelText("Informasi Penting");
      expect(icon).toBeInTheDocument();
      expect(icon.getAttribute("aria-hidden")).toBe("false");
      expect(icon.getAttribute("role")).toBe("img");
    });
  });

  describe("M3Text", () => {
    it("renders official M3 typography variants with semantic default tags", () => {
      const { rerender } = render(
        <M3Text variant="headline-medium">Judul Headline</M3Text>
      );
      const h2 = screen.getByRole("heading", { level: 2 });
      expect(h2).toHaveTextContent("Judul Headline");
      expect(h2.className).toContain("m3-headline-medium");

      rerender(<M3Text variant="title-medium">Judul Title</M3Text>);
      const h5 = screen.getByRole("heading", { level: 5 });
      expect(h5).toHaveTextContent("Judul Title");
      expect(h5.className).toContain("m3-title-medium");

      rerender(<M3Text variant="body-medium">Teks Body</M3Text>);
      const p = screen.getByText("Teks Body");
      expect(p.tagName.toLowerCase()).toBe("p");
      expect(p.className).toContain("m3-body-medium");
    });

    it("supports custom semantic HTML tag override and color tokens", () => {
      render(
        <M3Text as="h1" variant="title-large" color="primary" weight="bold">
          Judul H1 Title
        </M3Text>
      );
      const el = screen.getByRole("heading", { level: 1 });
      expect(el).toBeInTheDocument();
      expect(el.className).toContain("m3-title-large");
      expect(el.className).toContain("text-md-primary");
      expect(el.className).toContain("font-bold");
    });

    it("supports truncate and alignment", () => {
      render(
        <M3Text variant="body-small" color="on-surface-variant" align="center" truncate>
          Teks Rata Tengah Truncate
        </M3Text>
      );
      const el = screen.getByText("Teks Rata Tengah Truncate");
      expect(el.className).toContain("truncate");
      expect(el.className).toContain("text-center");
      expect(el.className).toContain("text-md-on-surface-variant");
    });
  });

  describe("M3Banner", () => {
    it("renders standard banner with headline, supporting text, and actions", () => {
      const handleAction = vi.fn();
      render(
        <M3Banner
          variant="standard"
          headline="Pengumuman Penting"
          supportingText="Sistem akan melakukan sinkronisasi Dapodik malam ini."
          actionLabel="Pelajari"
          onAction={handleAction}
        />
      );
      expect(screen.getByText("Pengumuman Penting")).toBeInTheDocument();
      expect(
        screen.getByText("Sistem akan melakukan sinkronisasi Dapodik malam ini.")
      ).toBeInTheDocument();
      const actionBtn = screen.getByRole("button", { name: /pelajari/i });
      expect(actionBtn).toBeInTheDocument();
      fireEvent.click(actionBtn);
      expect(handleAction).toHaveBeenCalledTimes(1);
    });

    it("renders error variant with role='alert' and semantic error styling", () => {
      render(
        <M3Banner
          variant="error"
          title="Koneksi GPS Terputus"
          text="Pastikan izin lokasi pada browser Anda telah diaktifkan."
        />
      );
      const alertEl = screen.getByRole("alert");
      expect(alertEl).toBeInTheDocument();
      expect(alertEl.className).toContain("bg-md-error-container");
      expect(screen.getByText("Koneksi GPS Terputus")).toBeInTheDocument();
    });

    it("renders warning and success variants with proper icons", () => {
      const { rerender } = render(
        <M3Banner
          variant="warning"
          headline="Perhatian Kuota"
          supportingText="Kapasitas kuota siswa hampir mencapai batas."
        />
      );
      expect(screen.getByText("warning")).toBeInTheDocument();
      expect(screen.getByText("Perhatian Kuota")).toBeInTheDocument();

      rerender(
        <M3Banner
          variant="success"
          headline="Sinkronisasi Berhasil"
          supportingText="Seluruh data telah tersimpan di cloud."
        />
      );
      expect(screen.getByText("check_circle")).toBeInTheDocument();
      expect(screen.getByText("Sinkronisasi Berhasil")).toBeInTheDocument();
    });

    it("handles dismissible action and close callback", () => {
      const handleDismiss = vi.fn();
      render(
        <M3Banner
          variant="info"
          title="Info Update"
          dismissible
          onDismiss={handleDismiss}
        />
      );
      const closeBtn = screen.getByLabelText("Tutup banner");
      expect(closeBtn).toBeInTheDocument();
      fireEvent.click(closeBtn);
      expect(handleDismiss).toHaveBeenCalledTimes(1);
    });

    it("renders hero banner variant with custom action buttons and divider", () => {
      render(
        <BrowserRouter>
          <M3Banner
            variant="hero"
            headline="Smart School SaaS M3"
            supportingText="Portal terpadu manajemen e-PKL dan LMS."
            actionLabel="Buka Panduan"
            actionHref="/guide"
            showDivider
          />
        </BrowserRouter>
      );
      expect(screen.getByText("Smart School SaaS M3")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /buka panduan/i })).toBeInTheDocument();
    });
  });

  describe("M3NavigationDrawer", () => {
    const mockSections = [
      {
        title: "Utama",
        items: [
          { label: "Dashboard", href: "/school", icon: "dashboard", badge: 3 },
          { label: "Siswa", href: "/school/students", icon: "badge" },
        ],
      },
    ];

    it("renders expanded navigation drawer with labels, section title, and badges", () => {
      render(
        <BrowserRouter>
          <M3NavigationDrawer
            sections={mockSections}
            header={<div data-testid="drawer-header">Header Sekolah</div>}
            footer={<div data-testid="drawer-footer">Footer User</div>}
            isOpen={false}
            isCollapsed={false}
          />
        </BrowserRouter>
      );

      expect(screen.getByTestId("drawer-header")).toBeInTheDocument();
      expect(screen.getByTestId("drawer-footer")).toBeInTheDocument();
      expect(screen.getByText("Utama")).toBeInTheDocument();
      expect(screen.getByText("Dashboard")).toBeInTheDocument();
      expect(screen.getByText("Siswa")).toBeInTheDocument();
      expect(screen.getByText("3")).toBeInTheDocument();
    });

    it("renders collapsed navigation rail mode (isCollapsed=true) with titles and icons", () => {
      render(
        <BrowserRouter>
          <M3NavigationDrawer
            sections={mockSections}
            header={<div data-testid="drawer-header-rail">Logo</div>}
            isOpen={false}
            isCollapsed={true}
          />
        </BrowserRouter>
      );

      expect(screen.getByTestId("drawer-header-rail")).toBeInTheDocument();
      // In collapsed rail mode, the links should have title attributes for accessibility tooltips
      const dashboardLink = screen.getByTitle("Dashboard");
      const siswaLink = screen.getByTitle("Siswa");
      expect(dashboardLink).toBeInTheDocument();
      expect(siswaLink).toBeInTheDocument();
      expect(dashboardLink.getAttribute("href")).toBe("/school");
    });

    it("handles isHidden prop by applying w-0 and aria-hidden", () => {
      const { container } = render(
        <BrowserRouter>
          <M3NavigationDrawer
            sections={mockSections}
            isOpen={false}
            isHidden={true}
          />
        </BrowserRouter>
      );

      const aside = container.querySelector("aside");
      expect(aside).toHaveAttribute("aria-hidden", "true");
      expect(aside?.className).toContain("w-0");
    });

    it("renders mobile drawer modal when isOpen=true", () => {
      const handleClose = vi.fn();
      render(
        <BrowserRouter>
          <M3NavigationDrawer
            sections={mockSections}
            isOpen={true}
            onClose={handleClose}
          />
        </BrowserRouter>
      );

      const dashboardLinks = screen.getAllByText("Dashboard");
      expect(dashboardLinks.length).toBeGreaterThan(0);
    });
  });
});
