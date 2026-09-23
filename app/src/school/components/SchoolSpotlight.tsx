import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import { ArrowDown, ArrowUp, CornerDownLeft, Search, X } from "lucide-react";
import { useNavigate } from "react-router";
import { getSchoolSpotlightSearch, useQuery } from "wasp/client/operations";
import { M3Icon } from "../../client/components/m3";
import {
  canRunSpotlightDataSearch,
  filterSpotlightMenuItems,
  normalizeSpotlightQuery,
  type SpotlightMenuCandidate,
} from "../spotlightPolicy";

type MenuItem = SpotlightMenuCandidate & {
  icon?: string;
};

type DataItem = {
  id: string;
  kind: string;
  group: string;
  title: string;
  subtitle?: string | null;
  href: string;
  icon: string;
};

type DisplayItem = {
  key: string;
  title: string;
  subtitle?: string | null;
  href: string;
  icon?: string;
  group: string;
  source: "menu" | "data" | "recent";
};

interface SchoolSpotlightProps {
  isOpen: boolean;
  onClose: () => void;
  menuItems: MenuItem[];
}

const RECENT_KEY = "school_spotlight_recent_v1";

function readRecent(): DisplayItem[] {
  if (typeof window === "undefined") return [];
  try {
    const value = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
    if (!Array.isArray(value)) return [];
    return value
      .filter(
        (item) =>
          item &&
          typeof item.title === "string" &&
          typeof item.href === "string",
      )
      .slice(0, 5)
      .map((item, index) => ({
        key: `recent-${item.href}-${index}`,
        title: item.title,
        subtitle: item.subtitle || "Terakhir dibuka",
        href: item.href,
        icon: item.icon || "history",
        group: "Terakhir dibuka",
        source: "recent" as const,
      }));
  } catch {
    return [];
  }
}

function saveRecent(item: DisplayItem) {
  if (typeof window === "undefined") return;
  try {
    const current = readRecent().map((recent) => ({
      title: recent.title,
      subtitle: recent.subtitle,
      href: recent.href,
      icon: recent.icon,
    }));
    const next = [
      {
        title: item.title,
        subtitle: item.subtitle,
        href: item.href,
        icon: item.icon,
      },
      ...current.filter((entry) => entry.href !== item.href),
    ].slice(0, 5);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {}
}

function groupItems(items: DisplayItem[]) {
  const groups: Array<{ label: string; items: DisplayItem[] }> = [];
  for (const item of items) {
    const existing = groups.find((group) => group.label === item.group);
    if (existing) existing.items.push(item);
    else groups.push({ label: item.group, items: [item] });
  }
  return groups;
}

export function SchoolSpotlight({
  isOpen,
  onClose,
  menuItems,
}: SchoolSpotlightProps) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [recentItems, setRecentItems] = useState<DisplayItem[]>([]);

  const normalizedQuery = normalizeSpotlightQuery(query);

  useEffect(() => {
    if (!isOpen) return;
    setQuery("");
    setDebouncedQuery("");
    setActiveIndex(0);
    setRecentItems(readRecent());
    const id = window.setTimeout(() => inputRef.current?.focus(), 30);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.clearTimeout(id);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(normalizeSpotlightQuery(query));
    }, 160);
    return () => window.clearTimeout(timer);
  }, [query]);

  const menuMatches = useMemo(
    () => filterSpotlightMenuItems(menuItems, normalizedQuery),
    [menuItems, normalizedQuery],
  );

  const dataQuery = useQuery(
    getSchoolSpotlightSearch,
    {
      query: debouncedQuery,
      limit: 5,
    },
    {
      enabled: isOpen && canRunSpotlightDataSearch(debouncedQuery),
      retry: false,
    },
  );

  const dataItems = useMemo<DisplayItem[]>(
    () =>
      ((dataQuery.data?.items || []) as DataItem[]).map((item) => ({
        key: `data-${item.kind}-${item.id}`,
        title: item.title,
        subtitle: item.subtitle,
        href: item.href,
        icon: item.icon,
        group: item.group,
        source: "data",
      })),
    [dataQuery.data],
  );

  const visibleItems = useMemo<DisplayItem[]>(() => {
    if (!normalizedQuery) {
      if (recentItems.length) return recentItems;
      return menuItems.slice(0, 7).map((item, index) => ({
        key: `menu-default-${item.href}-${index}`,
        title: item.label,
        subtitle: item.section,
        href: item.href,
        icon: item.icon,
        group: "Akses cepat",
        source: "menu",
      }));
    }

    const menu = menuMatches.map((item, index) => ({
      key: `menu-${item.href}-${index}`,
      title: item.label,
      subtitle: item.section,
      href: item.href,
      icon: item.icon,
      group: "Menu",
      source: "menu" as const,
    }));

    return [...menu, ...dataItems];
  }, [dataItems, menuItems, menuMatches, normalizedQuery, recentItems]);

  useEffect(() => {
    setActiveIndex((current) =>
      visibleItems.length ? Math.min(current, visibleItems.length - 1) : 0,
    );
  }, [visibleItems.length]);

  const choose = (item: DisplayItem) => {
    saveRecent(item);
    onClose();
    navigate(item.href);
  };

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        if (visibleItems.length) {
          setActiveIndex((current) => (current + 1) % visibleItems.length);
        }
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        if (visibleItems.length) {
          setActiveIndex(
            (current) => (current - 1 + visibleItems.length) % visibleItems.length,
          );
        }
        return;
      }
      if (event.key === "Enter" && visibleItems[activeIndex]) {
        event.preventDefault();
        choose(visibleItems[activeIndex]);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeIndex, isOpen, onClose, visibleItems]);

  if (!isOpen) return null;

  const groups = groupItems(visibleItems);
  let globalIndex = -1;
  const searchingData = canRunSpotlightDataSearch(normalizedQuery);
  const dataLoading =
    searchingData &&
    (debouncedQuery !== normalizedQuery || dataQuery.isLoading || dataQuery.isFetching);
  const noResults =
    !!normalizedQuery && !dataLoading && visibleItems.length === 0;

  const handleBackdrop = (event: MouseEvent<HTMLDivElement>) => {
    if (event.currentTarget === event.target) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/25 px-3 pt-[max(4vh,18px)] backdrop-blur-[3px] sm:px-5 sm:pt-[10vh] dark:bg-black/45"
      role="presentation"
      onMouseDown={handleBackdrop}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Spotlight Search School OS"
        className="flex max-h-[min(720px,88vh)] w-full max-w-[720px] flex-col overflow-hidden rounded-[22px] border border-black/[.10] bg-white/95 shadow-[0_28px_90px_rgba(0,0,0,.25),0_2px_10px_rgba(0,0,0,.10)] backdrop-blur-3xl dark:border-white/[.12] dark:bg-[#1C1C1E]/96 dark:shadow-[0_30px_100px_rgba(0,0,0,.58)]"
      >
        <div className="flex min-h-[58px] items-center border-b border-black/[.07] px-3 py-2.5 sm:min-h-[56px] sm:px-4 sm:py-2 dark:border-white/[.08]">
          <div className="flex h-10 min-w-0 flex-1 items-center gap-2 overflow-hidden rounded-[10px] bg-[rgba(118,118,128,.12)] px-2.5 shadow-[inset_0_0_0_1px_rgba(0,0,0,.025)] transition-[background-color,box-shadow] duration-150 focus-within:bg-[rgba(118,118,128,.16)] focus-within:shadow-[inset_0_0_0_1px_rgba(0,122,255,.22),0_0_0_2px_rgba(0,122,255,.10)] sm:h-9 dark:bg-[rgba(118,118,128,.24)] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,.035)] dark:focus-within:bg-[rgba(118,118,128,.28)] dark:focus-within:shadow-[inset_0_0_0_1px_rgba(10,132,255,.30),0_0_0_2px_rgba(10,132,255,.12)]">
            <Search
              size={16}
              strokeWidth={1.9}
              className="shrink-0 text-[#8E8E93] dark:text-[#98989D]"
              aria-hidden="true"
            />
            <input
              ref={inputRef}
              type="search"
              role="searchbox"
              aria-label="Cari di School OS"
              aria-keyshortcuts="Meta+K Control+K"
              placeholder="Cari di School OS"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActiveIndex(0);
              }}
              className="spotlight-search-input min-w-0 flex-1 appearance-none rounded-none border-0 bg-transparent px-0 py-1.5 text-[15px] font-normal tracking-[-.01em] text-[#1D1D1F] shadow-none outline-none ring-0 focus:border-0 focus:shadow-none focus:outline-none focus:ring-0 focus-visible:border-0 focus-visible:shadow-none focus-visible:outline-none focus-visible:ring-0 placeholder:text-[#8E8E93] dark:text-[#F5F5F7] dark:placeholder:text-[#98989D]"
              autoComplete="off"
              spellCheck={false}
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setDebouncedQuery("");
                  setActiveIndex(0);
                  inputRef.current?.focus();
                }}
                aria-label="Hapus pencarian"
                className="flex size-[18px] shrink-0 items-center justify-center rounded-full bg-[#8E8E93]/75 text-white transition-opacity hover:bg-[#7D7D82] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007AFF]/25 dark:bg-[#98989D]/75 dark:hover:bg-[#A5A5AA] dark:focus-visible:ring-[#0A84FF]/30"
              >
                <X size={10.5} strokeWidth={2.4} />
              </button>
            )}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2.5 sm:px-3">
          {!normalizedQuery && (
            <p className="px-3 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-[.10em] text-[#8A8A90]">
              {recentItems.length ? "Terakhir dibuka" : "Akses cepat"}
            </p>
          )}

          {groups.map((group, groupIndex) => (
            <div key={group.label} className={groupIndex ? "mt-2" : ""}>
              {normalizedQuery && (
                <p className="px-3 pb-1.5 pt-2 text-[10.5px] font-semibold uppercase tracking-[.11em] text-[#8A8A90]">
                  {group.label}
                </p>
              )}
              <div>
                {group.items.map((item) => {
                  globalIndex += 1;
                  const index = globalIndex;
                  const active = index === activeIndex;
                  return (
                    <button
                      type="button"
                      key={item.key}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => choose(item)}
                      className={`flex min-h-[52px] w-full items-center gap-2.5 rounded-[10px] px-3 py-2 text-left transition-[background-color,color] duration-100 ${
                        active
                          ? "bg-[#007AFF] text-white dark:bg-[#0A84FF]"
                          : "text-[#1D1D1F] hover:bg-black/[.045] dark:text-[#F5F5F7] dark:hover:bg-white/[.07]"
                      }`}
                    >
                      <span
                        className={`flex size-8 shrink-0 items-center justify-center rounded-[9px] ${
                          active
                            ? "bg-white/15 text-white"
                            : "bg-[#EEF1F5] text-[#4E5968] dark:bg-white/[.08] dark:text-[#D3D3D8]"
                        }`}
                      >
                        <M3Icon
                          name={item.icon || (item.source === "recent" ? "history" : "search")}
                          size={17}
                          weight={300}
                        />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13.5px] font-semibold tracking-[-.01em]">
                          {item.title}
                        </span>
                        {item.subtitle && (
                          <span
                            className={`mt-0.5 block truncate text-[11.5px] ${
                              active
                                ? "text-white/72"
                                : "text-[#77777C] dark:text-[#A1A1A7]"
                            }`}
                          >
                            {item.subtitle}
                          </span>
                        )}
                      </span>
                      {active && (
                        <CornerDownLeft
                          size={15}
                          strokeWidth={1.8}
                          className="shrink-0 text-white/78"
                          aria-hidden="true"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {dataLoading && (
            <div
              className="flex items-center gap-3 px-3 py-4 text-[12px] text-[#7A7A80] dark:text-[#A2A2A7]"
              aria-live="polite"
            >
              <span className="size-3.5 animate-spin rounded-full border-2 border-current border-r-transparent" />
              Mencari data sekolah...
            </div>
          )}

          {normalizedQuery.length === 1 && (
            <div className="px-3 py-4 text-[12px] leading-5 text-[#7A7A80] dark:text-[#A2A2A7]">
              Menu sudah dapat dicari. Ketik minimal 2 karakter untuk mencari data sekolah.
            </div>
          )}

          {noResults && (
            <div className="px-3 py-10 text-center">
              <div className="mx-auto flex size-10 items-center justify-center rounded-[12px] bg-black/[.045] text-[#7A7A80] dark:bg-white/[.07] dark:text-[#B0B0B5]">
                <Search size={19} strokeWidth={1.7} />
              </div>
              <p className="mt-3 text-[13px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                Tidak ada hasil
              </p>
              <p className="mt-1 text-[11.5px] text-[#7A7A80] dark:text-[#9A9AA0]">
                Coba nama, rombel, mata pelajaran, DUDI, atau menu lain.
              </p>
            </div>
          )}

          {dataQuery.error && searchingData && (
            <div className="mx-2 my-2 rounded-[12px] bg-[#FFF2F2] px-3 py-2.5 text-[11.5px] text-[#A12828] dark:bg-[#4A1E1E] dark:text-[#FFB3B3]">
              Pencarian data belum dapat dimuat. Menu School OS tetap bisa digunakan.
            </div>
          )}
        </div>

        <footer className="hidden min-h-[40px] items-center justify-between border-t border-black/[.07] px-4 text-[10.5px] text-[#8A8A90] sm:flex dark:border-white/[.08] dark:text-[#929298]">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <kbd className="rounded border border-black/[.08] px-1.5 py-0.5 dark:border-white/[.10]">
                esc
              </kbd>
              Tutup
            </span>
            <span className="inline-flex items-center gap-1">
              <kbd className="inline-flex rounded border border-black/[.08] p-0.5 dark:border-white/[.10]">
                <ArrowUp size={10} />
              </kbd>
              <kbd className="inline-flex rounded border border-black/[.08] p-0.5 dark:border-white/[.10]">
                <ArrowDown size={10} />
              </kbd>
              Pilih
            </span>
          </div>
          <span>School OS Spotlight</span>
        </footer>
      </section>
    </div>
  );
}
