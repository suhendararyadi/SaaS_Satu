import { useMemo, useState } from "react";
import { type AuthUser } from "wasp/auth";
import { useNavigate } from "react-router";
import {
  getNotificationCenterData,
  markAllNotificationsRead,
  markNotificationRead,
  useQuery,
} from "wasp/client/operations";
import { SchoolLayout } from "../components/SchoolLayout";
import {
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_CATEGORY_META,
  type NotificationCategoryCode,
  type NotificationSeverityCode,
} from "../notificationCenter";
import {
  M3Badge,
  M3Banner,
  M3Button,
  M3Card,
  M3CircularProgress,
  M3EmptyState,
  M3Icon,
  M3Select,
  M3StatCard,
  M3TextField,
  M3Tabs,
} from "../../client/components/m3";

function severityVariant(severity: NotificationSeverityCode) {
  if (severity === "CRITICAL") return "error" as const;
  if (severity === "WARNING") return "warning" as const;
  if (severity === "SUCCESS") return "success" as const;
  return "outline" as const;
}

function severityLabel(severity: NotificationSeverityCode) {
  if (severity === "CRITICAL") return "Kritis";
  if (severity === "WARNING") return "Perhatian";
  if (severity === "SUCCESS") return "Selesai";
  return "Informasi";
}

function formatDateTime(value: string | Date) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function NotificationCenterPage({ user }: { user: AuthUser }) {
  const navigate = useNavigate();
  const [view, setView] = useState<"ALL" | "UNREAD">("ALL");
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const query = useQuery(
    getNotificationCenterData,
    {
      category: category || undefined,
      unreadOnly: view === "UNREAD",
      limit: 100,
    },
    { refetchInterval: 60_000, refetchOnWindowFocus: true },
  );
  const data = query.data as any;

  const items = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return data?.items || [];
    return (data?.items || []).filter((item: any) =>
      [item.title, item.message, item.categoryLabel]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    );
  }, [data?.items, search]);

  const openItem = async (item: any) => {
    if (item.unread) {
      try {
        await markNotificationRead({ key: item.key });
      } catch {
        // It may have resolved after this list was loaded.
      }
    }
    navigate(item.href);
  };

  const markOne = async (key: string) => {
    setBusy(true);
    setFeedback(null);
    try {
      await markNotificationRead({ key });
      await query.refetch();
    } catch (error: any) {
      setFeedback(error?.message || "Notifikasi tidak dapat diperbarui.");
    } finally {
      setBusy(false);
    }
  };

  const markAll = async () => {
    setBusy(true);
    setFeedback(null);
    try {
      const result = await markAllNotificationsRead({});
      await query.refetch();
      setFeedback(`${result.count} notifikasi aktif ditandai sudah dibaca.`);
    } catch (error: any) {
      setFeedback(error?.message || "Status notifikasi belum berhasil diperbarui.");
    } finally {
      setBusy(false);
    }
  };

  if (query.isLoading && !data) {
    return (
      <SchoolLayout user={user}>
        <div className="flex min-h-[420px] items-center justify-center">
          <M3CircularProgress size={40} />
        </div>
      </SchoolLayout>
    );
  }

  return (
    <SchoolLayout user={user}>
      <div className="space-y-5">
        <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="v2-eyebrow">PUSAT PERHATIAN</p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-[-0.025em] text-md-on-surface">
              Notification Center
            </h1>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-md-on-surface-variant">
              Satu tempat untuk hal yang membutuhkan perhatian Anda. Daftar mengikuti penugasan,
              lingkup akses, dan kondisi operasional sekolah secara otomatis.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <M3Button
              variant="outlined"
              size="sm"
              icon="refresh"
              onClick={() => query.refetch()}
            >
              Segarkan
            </M3Button>
            <M3Button
              variant="tonal"
              size="sm"
              icon="done_all"
              onClick={markAll}
              isLoading={busy}
              disabled={!data?.summary?.unread}
            >
              Tandai Semua Dibaca
            </M3Button>
          </div>
        </header>

        {feedback && (
          <M3Banner
            variant="standard"
            headline="Status notifikasi diperbarui"
            supportingText={feedback}
            dismissible
            onDismiss={() => setFeedback(null)}
          />
        )}

        {query.error && (
          <M3Banner
            variant="error"
            headline="Pusat Notifikasi belum dapat dimuat"
            supportingText={(query.error as any)?.message || "Coba segarkan kembali."}
            actionLabel="Coba Lagi"
            onAction={() => query.refetch()}
          />
        )}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <M3StatCard label="Aktif" value={data?.summary?.total || 0} tone="blue" />
          <M3StatCard
            label="Belum dibaca"
            value={data?.summary?.unread || 0}
            tone={data?.summary?.unread ? "orange" : "green"}
          />
          <M3StatCard
            label="Kritis"
            value={data?.summary?.critical || 0}
            tone={data?.summary?.critical ? "orange" : "green"}
          />
          <M3StatCard
            label="Perlu perhatian"
            value={data?.summary?.warning || 0}
            tone={data?.summary?.warning ? "orange" : "green"}
          />
        </div>

        <M3Card variant="outlined" className="p-3">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <M3Tabs
              tabs={[
                { id: "ALL", label: "Semua", icon: "notifications", badge: data?.summary?.total || undefined },
                { id: "UNREAD", label: "Belum Dibaca", icon: "mark_email_unread", badge: data?.summary?.unread || undefined },
              ]}
              activeTab={view}
              onChange={(value) => setView(value as "ALL" | "UNREAD")}
            />
            <div className="grid w-full gap-2 sm:grid-cols-[minmax(240px,1fr)_220px] xl:max-w-2xl">
              <M3TextField
                size="sm"
                leadingIcon="search"
                placeholder="Cari notifikasi..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <M3Select
                size="sm"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                options={[
                  { value: "", label: "Semua kategori" },
                  ...NOTIFICATION_CATEGORIES.map((code) => ({
                    value: code,
                    label: NOTIFICATION_CATEGORY_META[code].label,
                  })),
                ]}
              />
            </div>
          </div>
        </M3Card>

        {!items.length ? (
          <M3Card variant="outlined">
            <M3EmptyState
              icon={view === "UNREAD" ? "done_all" : "notifications_none"}
              title={view === "UNREAD" ? "Tidak ada notifikasi yang belum dibaca" : "Tidak ada notifikasi aktif"}
              description={
                view === "UNREAD"
                  ? "Semua kondisi aktif yang relevan sudah Anda baca."
                  : "School OS akan menampilkan notifikasi saat ada hal yang sesuai dengan tanggung jawab dan lingkup akses Anda."
              }
            />
          </M3Card>
        ) : (
          <div className="space-y-2">
            {items.map((item: any) => {
              const meta =
                NOTIFICATION_CATEGORY_META[item.category as NotificationCategoryCode];
              return (
                <M3Card
                  key={item.key}
                  variant="outlined"
                  className={`overflow-hidden p-0 transition-shadow hover:shadow-sm ${item.unread ? "border-md-primary/35 bg-md-primary-container/10" : ""}`}
                >
                  <div className="flex items-start gap-3 p-4">
                    <button
                      type="button"
                      onClick={() => void openItem(item)}
                      className="flex min-w-0 flex-1 items-start gap-3 text-left"
                    >
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-md-surface-container-high text-md-on-surface-variant">
                        <M3Icon name={item.icon || meta.icon} size={20} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[13.5px] font-semibold tracking-[-.01em] text-md-on-surface">
                            {item.title}
                          </span>
                          {item.unread && (
                            <span className="size-2 rounded-full bg-md-primary" aria-label="Belum dibaca" />
                          )}
                        </span>
                        <span className="mt-1 block max-w-4xl text-[12px] leading-5 text-md-on-surface-variant">
                          {item.message}
                        </span>
                        <span className="mt-2 flex flex-wrap items-center gap-1.5">
                          <M3Badge variant="outline" size="sm">
                            {meta.label}
                          </M3Badge>
                          <M3Badge variant={severityVariant(item.severity)} size="sm">
                            {severityLabel(item.severity)}
                          </M3Badge>
                          <span className="text-[10px] text-md-on-surface-variant">
                            {formatDateTime(item.updatedAt)}
                          </span>
                        </span>
                      </span>
                    </button>
                    <div className="flex shrink-0 items-center gap-1">
                      {item.unread && (
                        <M3Button
                          variant="icon"
                          size="icon-sm"
                          icon="done"
                          aria-label="Tandai sudah dibaca"
                          title="Tandai sudah dibaca"
                          disabled={busy}
                          onClick={() => void markOne(item.key)}
                        />
                      )}
                      <M3Button
                        variant="icon"
                        size="icon-sm"
                        icon="chevron_right"
                        aria-label={item.actionLabel || "Buka"}
                        title={item.actionLabel || "Buka"}
                        onClick={() => void openItem(item)}
                      />
                    </div>
                  </div>
                </M3Card>
              );
            })}
          </div>
        )}
      </div>
    </SchoolLayout>
  );
}
