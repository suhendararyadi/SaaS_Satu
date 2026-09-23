import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { useNavigate } from "react-router";
import {
  getNotificationCenterData,
  markAllNotificationsRead,
  markNotificationRead,
  useQuery,
} from "wasp/client/operations";
import { M3Badge, M3Button, M3Icon } from "../../client/components/m3";
import {
  NOTIFICATION_CATEGORY_META,
  type NotificationCategoryCode,
  type NotificationSeverityCode,
} from "../notificationCenter";

function severityVariant(severity: NotificationSeverityCode) {
  if (severity === "CRITICAL") return "error" as const;
  if (severity === "WARNING") return "warning" as const;
  if (severity === "SUCCESS") return "success" as const;
  return "outline" as const;
}

function formatCompactTime(value: string | Date) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  const diffMinutes = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 60000));
  if (diffMinutes < 1) return "baru";
  if (diffMinutes < 60) return `${diffMinutes}m`;
  if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}j`;
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "short",
  }).format(date);
}

export function NotificationBell() {
  const navigate = useNavigate();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const query = useQuery(
    getNotificationCenterData,
    { limit: 8 },
    {
      refetchInterval: 60_000,
      refetchOnWindowFocus: true,
    },
  );
  const data = query.data as any;
  const unread = data?.summary?.unread || 0;

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const openItem = async (item: any) => {
    if (item.unread) {
      try {
        await markNotificationRead({ key: item.key });
      } catch {
        // Source may have resolved between refresh and click. Navigation remains safe.
      }
    }
    setOpen(false);
    navigate(item.href);
    void query.refetch();
  };

  const markAll = async () => {
    setBusy(true);
    try {
      await markAllNotificationsRead({});
      await query.refetch();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        onClick={() => {
          setOpen((value) => !value);
          if (!open) void query.refetch();
        }}
        aria-label={unread ? `Notifikasi, ${unread} belum dibaca` : "Notifikasi"}
        aria-expanded={open}
        title="Notifikasi"
        className="relative inline-flex size-9 items-center justify-center rounded-[10px] text-md-on-surface-variant transition-colors hover:bg-black/[.055] hover:text-md-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-md-primary/35 dark:hover:bg-white/[.075]"
      >
        <Bell size={18} strokeWidth={1.8} aria-hidden="true" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 min-w-[17px] rounded-full bg-md-error px-1 py-[1px] text-center text-[9px] font-bold leading-[15px] text-md-on-error shadow-sm">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <section
          className="absolute right-0 top-[43px] z-50 w-[min(400px,calc(100vw-24px))] overflow-hidden rounded-[18px] border border-md-outline-variant/60 bg-md-surface shadow-[0_18px_48px_rgba(0,0,0,.18),0_2px_8px_rgba(0,0,0,.08)] dark:shadow-[0_18px_48px_rgba(0,0,0,.38)]"
          aria-label="Panel notifikasi"
        >
          <div className="flex items-center justify-between border-b border-md-outline-variant/40 px-4 py-3">
            <div>
              <p className="text-[14px] font-semibold tracking-[-.01em] text-md-on-surface">
                Notifikasi
              </p>
              <p className="mt-0.5 text-[10.5px] text-md-on-surface-variant">
                {unread ? `${unread} belum dibaca` : "Semua sudah dibaca"}
              </p>
            </div>
            {unread > 0 && (
              <M3Button variant="text" size="sm" onClick={markAll} isLoading={busy}>
                Tandai semua
              </M3Button>
            )}
          </div>

          <div className="max-h-[440px] overflow-y-auto p-2">
            {query.isLoading && !data ? (
              <div className="space-y-2 p-2" aria-live="polite">
                {[0, 1, 2].map((item) => (
                  <div key={item} className="h-20 animate-pulse rounded-[13px] bg-md-surface-container-low" />
                ))}
              </div>
            ) : !data?.items?.length ? (
              <div className="px-5 py-10 text-center">
                <span className="mx-auto flex size-10 items-center justify-center rounded-[12px] bg-md-surface-container text-md-on-surface-variant">
                  <M3Icon name="notifications_none" size={21} />
                </span>
                <p className="mt-3 text-[12.5px] font-semibold text-md-on-surface">
                  Tidak ada notifikasi aktif
                </p>
                <p className="mt-1 text-[11px] leading-5 text-md-on-surface-variant">
                  School OS akan menampilkan hal yang membutuhkan perhatian sesuai tanggung jawab Anda.
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {data.items.map((item: any) => {
                  const meta =
                    NOTIFICATION_CATEGORY_META[item.category as NotificationCategoryCode];
                  return (
                    <button
                      type="button"
                      key={item.key}
                      onClick={() => void openItem(item)}
                      className={`group flex w-full items-start gap-3 rounded-[13px] px-3 py-2.5 text-left transition-colors hover:bg-md-surface-container-low ${item.unread ? "bg-md-primary-container/20" : ""}`}
                    >
                      <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-[11px] bg-md-surface-container-high text-md-on-surface-variant">
                        <M3Icon name={item.icon || meta.icon} size={18} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <span className="truncate text-[12.5px] font-semibold text-md-on-surface">
                            {item.title}
                          </span>
                          {item.unread && (
                            <span
                              className="size-1.5 shrink-0 rounded-full bg-md-primary"
                              aria-label="Belum dibaca"
                            />
                          )}
                        </span>
                        <span className="mt-0.5 line-clamp-2 block text-[10.8px] leading-[17px] text-md-on-surface-variant">
                          {item.message}
                        </span>
                        <span className="mt-1 flex items-center gap-1.5">
                          <M3Badge variant={severityVariant(item.severity)} size="sm">
                            {meta.label}
                          </M3Badge>
                          <span className="text-[9.5px] text-md-on-surface-variant">
                            {formatCompactTime(item.updatedAt)}
                          </span>
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="border-t border-md-outline-variant/40 p-2">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                navigate("/school/notifications");
              }}
              className="flex min-h-9 w-full items-center justify-center gap-1.5 rounded-[10px] text-[11.5px] font-semibold text-md-primary transition-colors hover:bg-md-primary-container/30"
            >
              Buka Pusat Notifikasi
              <M3Icon name="chevron_right" size={15} />
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
