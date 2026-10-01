import React from "react";
import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const rec: any = { aria: [] as string[][], map: null, tile: null, circles: [], markers: [], icons: [], fit: null, setView: [], removed: 0, panTo: [] };
vi.mock("leaflet", () => {
  const group = () => ({ layers: [] as any[], clearLayers() { this.layers = []; }, addTo() { return this; } });
  const add = (o: any) => ({ ...o, handlers: {} as any, on(ev: string, fn: any) { this.handlers[ev] = fn; return this; }, addTo(g: any) { g.layers.push(this); return this; }, getElement() { return { setAttribute: (k: string, v: string) => rec.aria.push([k, v]) }; } });
  return {
    map: (el: any) => { rec.map = { el, setView: (...a: any[]) => { rec.setView.push(a); return rec.map; }, fitBounds: (...a: any[]) => { rec.fit = a; }, panTo: (...a: any[]) => rec.panTo.push(a), remove: () => { rec.removed++; } }; return rec.map; },
    tileLayer: (url: string, opts: any) => { rec.tile = { url, opts }; return { addTo: () => ({}) }; },
    layerGroup: () => group(),
    circle: (ll: any, opts: any) => { const c = add({ kind: "circle", ll, opts }); rec.circles.push(c); return c; },
    divIcon: (opts: any) => { rec.icons.push(opts); return opts; },
    marker: (ll: any, opts: any) => { const m = add({ kind: "marker", ll, opts }); rec.markers.push(m); return m; },
    latLngBounds: (c: any) => c,
  };
});

import { TeachingMap } from "./TeachingMap";

const school = { latitude: -7.2, longitude: 107.9, radiusMeters: 100 };
const points = [
  { id: "a:CHECK_IN", sessionId: "a", kind: "CHECK_IN" as const, latitude: -7.2001, longitude: 107.9002, accuracyM: 12, label: "Check-in · Guru A" },
  { id: "a:CHECK_OUT", sessionId: "a", kind: "CHECK_OUT" as const, latitude: -7.2003, longitude: 107.9004, accuracyM: null, label: "Check-out · Guru A" },
];

beforeEach(() => {
  Object.assign(rec, { aria: [], map: null, tile: null, circles: [], markers: [], icons: [], fit: null, setView: [], removed: 0, panTo: [] });
});

describe("TeachingMap", () => {
  it("uses OpenStreetMap tiles with the required attribution", async () => {
    render(<TeachingMap school={school} points={points} selectedId={null} onSelect={() => {}} />);
    await waitFor(() => expect(rec.tile).not.toBeNull());
    expect(rec.tile.url).toBe("https://tile.openstreetmap.org/{z}/{x}/{y}.png");
    expect(rec.tile.opts.attribution).toContain("openstreetmap.org/copyright");
    expect(rec.tile.opts.attribution).toContain("OpenStreetMap");
  });

  it("draws the school marker and radius, and a titled marker per point with an accuracy circle", async () => {
    render(<TeachingMap school={school} points={points} selectedId={null} onSelect={() => {}} />);
    await waitFor(() => expect(rec.markers.length).toBe(3));
    expect(rec.markers.map((m: any) => m.opts.title)).toEqual(["Titik sekolah", "Check-in · Guru A", "Check-out · Guru A"]);
    const radius = rec.circles.find((c: any) => c.opts.radius === 100);
    expect(radius.opts.dashArray).toBeTruthy();
    expect(rec.circles.some((c: any) => c.opts.radius === 12)).toBe(true);
    expect(rec.circles.some((c: any) => c.opts.radius === 0)).toBe(false);
  });

  it("marks points with letters and shapes, not colour alone, and ring the selected one", async () => {
    render(<TeachingMap school={school} points={points} selectedId="a:CHECK_OUT" onSelect={() => {}} />);
    await waitFor(() => expect(rec.markers.length).toBe(3));
    const html: string[] = rec.icons.map((i: any) => i.html as string);
    expect(html.some((h: string) => h.includes(">M<") && h.includes("border-radius:50%"))).toBe(true);
    expect(html.some((h: string) => h.includes(">P<") && h.includes("border-radius:6px") && h.includes("outline:3px solid #FF9F0A"))).toBe(true);
    expect(html.some((h: string) => h.includes(">S<"))).toBe(true);
    expect(html.filter((h: string) => h.includes("outline:3px solid #FF9F0A")).length).toBe(1);
  });

  it("gives each point marker a full accessible name, not just the letter inside the icon", async () => {
    render(<TeachingMap school={school} points={points} selectedId={null} onSelect={() => {}} />);
    await waitFor(() => expect(rec.markers.length).toBe(3));
    expect(rec.aria.filter(([k]: string[]) => k === "aria-label").map(([, v]: string[]) => v)).toEqual(expect.arrayContaining(["Check-in · Guru A", "Check-out · Guru A"]));
  });

  it("calls onSelect with the point id when a marker is clicked", async () => {
    const onSelect = vi.fn();
    render(<TeachingMap school={school} points={points} selectedId={null} onSelect={onSelect} />);
    await waitFor(() => expect(rec.markers.length).toBe(3));
    rec.markers[1].handlers.click();
    expect(onSelect).toHaveBeenCalledWith("a:CHECK_IN");
  });

  it("fits the view to the points and the school, or centres on a lone school point", async () => {
    const { unmount } = render(<TeachingMap school={school} points={points} selectedId={null} onSelect={() => {}} />);
    await waitFor(() => expect(rec.fit).not.toBeNull());
    expect(rec.fit[0]).toHaveLength(3);
    unmount();
    Object.assign(rec, { fit: null, setView: [] });
    render(<TeachingMap school={school} points={[]} selectedId={null} onSelect={() => {}} />);
    await waitFor(() => expect(rec.setView.some((a: any) => a[1] === 17)).toBe(true));
  });

  it("removes the map when unmounted", async () => {
    const { unmount } = render(<TeachingMap school={school} points={points} selectedId={null} onSelect={() => {}} />);
    await waitFor(() => expect(rec.map).not.toBeNull());
    unmount();
    expect(rec.removed).toBe(1);
  });

  it("exposes an accessible name that points to the text alternative", () => {
    const { container } = render(<TeachingMap school={school} points={points} selectedId={null} onSelect={() => {}} />);
    const el = container.querySelector('[role="application"]')!;
    expect(el.getAttribute("aria-label")).toMatch(/Daftar sesi/);
  });
});
