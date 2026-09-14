import { useEffect, useMemo, useState } from "react";
import { type AuthUser } from "wasp/auth";
import {
  getSarprasInventoryData,
  moveAssetItem,
  reportAssetMaintenance,
  saveAssetCategory,
  saveAssetItem,
  saveFacilityRoom,
  updateAssetMaintenance,
  useQuery,
} from "wasp/client/operations";
import { SchoolLayout } from "../components/SchoolLayout";
import {
  ASSET_CONDITIONS,
  ASSET_CONDITION_META,
  ASSET_MAINTENANCE_STATUSES,
  ASSET_STATUS_META,
  ASSET_STATUSES,
  MAINTENANCE_STATUS_META,
  nextMaintenanceStatuses,
  type AssetConditionCode,
  type AssetMaintenanceStatusCode,
  type AssetStatusCode,
} from "../sarpras";
import {
  FOLLOW_UP_SEVERITIES,
  FOLLOW_UP_SEVERITY_META,
  type FollowUpSeverityCode,
} from "../followUp";
import {
  M3Badge,
  M3Banner,
  M3Button,
  M3Card,
  M3CircularProgress,
  M3Dialog,
  M3EmptyState,
  M3Icon,
  M3Select,
  M3StatCard,
  M3Table,
  M3TableBody,
  M3TableCell,
  M3TableHead,
  M3TableHeader,
  M3TableRow,
  M3Tabs,
  M3TextField,
} from "../../client/components/m3";

function personName(person: any) {
  return person?.name || person?.username || person?.email || "-";
}

function formatDate(value?: string | Date | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatDateTime(value?: string | Date | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function currency(value?: string | number | null) {
  if (value === null || value === undefined || value === "") return "-";
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "-";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(numeric);
}

function conditionVariant(condition: AssetConditionCode) {
  if (condition === "GOOD") return "success" as const;
  if (condition === "FAIR") return "warning" as const;
  if (condition === "DAMAGED" || condition === "LOST") return "error" as const;
  return "primary" as const;
}

function priorityVariant(priority: FollowUpSeverityCode) {
  if (priority === "CRITICAL") return "error" as const;
  if (priority === "HIGH") return "warning" as const;
  if (priority === "MEDIUM") return "secondary" as const;
  return "outline" as const;
}

function maintenanceVariant(status: AssetMaintenanceStatusCode) {
  if (status === "COMPLETED") return "success" as const;
  if (status === "CANCELED") return "outline" as const;
  if (status === "IN_PROGRESS") return "primary" as const;
  if (status === "PLANNED") return "secondary" as const;
  return "warning" as const;
}

const emptyAsset = {
  id: "",
  code: "",
  name: "",
  categoryId: "",
  roomId: "",
  responsibleUserId: "",
  brand: "",
  model: "",
  serialNumber: "",
  quantity: "1",
  acquisitionDate: "",
  acquisitionSource: "",
  acquisitionValue: "",
  condition: "GOOD" as AssetConditionCode,
  status: "ACTIVE" as AssetStatusCode,
  notes: "",
};

const emptyRoom = {
  id: "",
  code: "",
  name: "",
  type: "",
  building: "",
  floor: "",
  responsibleUserId: "",
  notes: "",
  isActive: true,
};

const emptyCategory = {
  id: "",
  code: "",
  name: "",
  description: "",
};

const emptyMaintenance = {
  assetId: "",
  issue: "",
  priority: "MEDIUM" as FollowUpSeverityCode,
  assignedToId: "",
  observedCondition: "DAMAGED" as AssetConditionCode,
  scheduledAt: "",
  vendor: "",
  estimatedCost: "",
};

export function SarprasInventoryPage({ user }: { user: AuthUser }) {
  const query = useQuery(getSarprasInventoryData, {});
  const data = query.data as any;

  const [tab, setTab] = useState("ASSETS");
  const [search, setSearch] = useState("");
  const [conditionFilter, setConditionFilter] = useState("");
  const [roomFilter, setRoomFilter] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [assetOpen, setAssetOpen] = useState(false);
  const [assetForm, setAssetForm] = useState({ ...emptyAsset });
  const [roomOpen, setRoomOpen] = useState(false);
  const [roomForm, setRoomForm] = useState({ ...emptyRoom });
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [categoryForm, setCategoryForm] = useState({ ...emptyCategory });
  const [maintenanceOpen, setMaintenanceOpen] = useState(false);
  const [maintenanceForm, setMaintenanceForm] = useState({ ...emptyMaintenance });
  const [maintenanceDetail, setMaintenanceDetail] = useState<any>(null);
  const [maintenanceEdit, setMaintenanceEdit] = useState({
    assignedToId: "",
    scheduledAt: "",
    vendor: "",
    estimatedCost: "",
    actualCost: "",
    resolutionNote: "",
    assetCondition: "",
  });
  const [moveOpen, setMoveOpen] = useState(false);
  const [moveAsset, setMoveAsset] = useState<any>(null);
  const [moveForm, setMoveForm] = useState({ toRoomId: "", type: "TRANSFER", note: "" });

  const canManage = !!data?.access?.canManage;

  useEffect(() => {
    if (!data?.maintenance?.length || typeof window === "undefined") return;
    const requested = new URLSearchParams(window.location.search).get("maintenance");
    if (!requested) return;
    const item = data.maintenance.find((entry: any) => entry.id === requested);
    if (item) {
      setTab("MAINTENANCE");
      openMaintenanceDetail(item);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.maintenance]);

  const filteredAssets = useMemo(() => {
    if (!data?.assets) return [];
    const term = search.trim().toLowerCase();
    return data.assets.filter((asset: any) => {
      if (conditionFilter && asset.condition !== conditionFilter) return false;
      if (roomFilter && asset.room?.id !== roomFilter) return false;
      if (!term) return true;
      return [
        asset.code,
        asset.name,
        asset.brand,
        asset.model,
        asset.serialNumber,
        asset.category?.name,
        asset.room?.name,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [data?.assets, search, conditionFilter, roomFilter]);

  const run = async (action: () => Promise<any>, successText: string) => {
    setBusy(true);
    setFeedback(null);
    try {
      const result = await action();
      await query.refetch();
      setFeedback({ type: "success", text: successText });
      return result;
    } catch (error: any) {
      setFeedback({ type: "error", text: error?.message || "Operasi Sarpras belum berhasil." });
      throw error;
    } finally {
      setBusy(false);
    }
  };

  const openAssetCreate = () => {
    setAssetForm({ ...emptyAsset });
    setAssetOpen(true);
  };

  const openAssetEdit = (asset: any) => {
    setAssetForm({
      id: asset.id,
      code: asset.code || "",
      name: asset.name || "",
      categoryId: asset.category?.id || "",
      roomId: asset.room?.id || "",
      responsibleUserId: asset.responsibleUser?.id || "",
      brand: asset.brand || "",
      model: asset.model || "",
      serialNumber: asset.serialNumber || "",
      quantity: String(asset.quantity || 1),
      acquisitionDate: asset.acquisitionDate ? new Date(asset.acquisitionDate).toISOString().slice(0, 10) : "",
      acquisitionSource: asset.acquisitionSource || "",
      acquisitionValue: asset.acquisitionValue || "",
      condition: asset.condition,
      status: asset.status,
      notes: asset.notes || "",
    });
    setAssetOpen(true);
  };

  const submitAsset = async () => {
    try {
      await run(
        () =>
          saveAssetItem({
            id: assetForm.id || undefined,
            code: assetForm.code,
            name: assetForm.name,
            categoryId: assetForm.categoryId || null,
            roomId: assetForm.id ? undefined : assetForm.roomId || null,
            responsibleUserId: assetForm.responsibleUserId || null,
            brand: assetForm.brand || null,
            model: assetForm.model || null,
            serialNumber: assetForm.serialNumber || null,
            quantity: Number(assetForm.quantity || 1),
            acquisitionDate: assetForm.acquisitionDate || null,
            acquisitionSource: assetForm.acquisitionSource || null,
            acquisitionValue: assetForm.acquisitionValue === "" ? null : Number(assetForm.acquisitionValue),
            condition: assetForm.condition,
            status: assetForm.status,
            notes: assetForm.notes || null,
          }),
        assetForm.id ? "Data aset berhasil diperbarui." : "Aset baru berhasil ditambahkan.",
      );
      setAssetOpen(false);
    } catch {}
  };

  const openRoomCreate = () => {
    setRoomForm({ ...emptyRoom });
    setRoomOpen(true);
  };

  const openRoomEdit = (room: any) => {
    setRoomForm({
      id: room.id,
      code: room.code || "",
      name: room.name || "",
      type: room.type || "",
      building: room.building || "",
      floor: room.floor || "",
      responsibleUserId: room.responsibleUser?.id || "",
      notes: room.notes || "",
      isActive: !!room.isActive,
    });
    setRoomOpen(true);
  };

  const submitRoom = async () => {
    try {
      await run(
        () =>
          saveFacilityRoom({
            id: roomForm.id || undefined,
            code: roomForm.code,
            name: roomForm.name,
            type: roomForm.type || null,
            building: roomForm.building || null,
            floor: roomForm.floor || null,
            responsibleUserId: roomForm.responsibleUserId || null,
            notes: roomForm.notes || null,
            isActive: roomForm.isActive,
          }),
        roomForm.id ? "Ruang/fasilitas berhasil diperbarui." : "Ruang/fasilitas berhasil ditambahkan.",
      );
      setRoomOpen(false);
    } catch {}
  };

  const openCategoryCreate = () => {
    setCategoryForm({ ...emptyCategory });
    setCategoryOpen(true);
  };

  const openCategoryEdit = (category: any) => {
    setCategoryForm({
      id: category.id,
      code: category.code || "",
      name: category.name || "",
      description: category.description || "",
    });
    setCategoryOpen(true);
  };

  const submitCategory = async () => {
    try {
      await run(
        () =>
          saveAssetCategory({
            id: categoryForm.id || undefined,
            code: categoryForm.code,
            name: categoryForm.name,
            description: categoryForm.description || null,
          }),
        categoryForm.id ? "Kategori aset berhasil diperbarui." : "Kategori aset berhasil ditambahkan.",
      );
      setCategoryOpen(false);
    } catch {}
  };

  const openReport = (asset?: any) => {
    setMaintenanceForm({
      ...emptyMaintenance,
      assetId: asset?.id || "",
      observedCondition: asset?.condition === "LOST" ? "LOST" : "DAMAGED",
    });
    setMaintenanceOpen(true);
  };

  const submitMaintenance = async () => {
    try {
      await run(
        () =>
          reportAssetMaintenance({
            assetId: maintenanceForm.assetId,
            issue: maintenanceForm.issue,
            priority: maintenanceForm.priority,
            assignedToId: canManage ? maintenanceForm.assignedToId || null : null,
            observedCondition: maintenanceForm.observedCondition,
            scheduledAt: maintenanceForm.scheduledAt || null,
            vendor: maintenanceForm.vendor || null,
            estimatedCost: maintenanceForm.estimatedCost === "" ? null : Number(maintenanceForm.estimatedCost),
          }),
        "Laporan Sarpras dibuat dan masuk ke Tindak Lanjut Terpadu.",
      );
      setMaintenanceOpen(false);
      setTab("MAINTENANCE");
    } catch {}
  };

  function openMaintenanceDetail(item: any) {
    setMaintenanceDetail(item);
    setMaintenanceEdit({
      assignedToId: item.assignedTo?.id || "",
      scheduledAt: item.scheduledAt ? new Date(item.scheduledAt).toISOString().slice(0, 16) : "",
      vendor: item.vendor || "",
      estimatedCost: item.estimatedCost || "",
      actualCost: item.actualCost || "",
      resolutionNote: item.resolutionNote || "",
      assetCondition: "",
    });
  }

  const saveMaintenanceDetails = async (extra: Record<string, unknown> = {}) => {
    if (!maintenanceDetail) return;
    try {
      await run(
        () =>
          updateAssetMaintenance({
            id: maintenanceDetail.id,
            assignedToId: maintenanceEdit.assignedToId || null,
            scheduledAt: maintenanceEdit.scheduledAt || null,
            vendor: maintenanceEdit.vendor || null,
            estimatedCost: maintenanceEdit.estimatedCost === "" ? null : Number(maintenanceEdit.estimatedCost),
            actualCost: maintenanceEdit.actualCost === "" ? null : Number(maintenanceEdit.actualCost),
            resolutionNote: maintenanceEdit.resolutionNote || null,
            assetCondition: maintenanceEdit.assetCondition || undefined,
            ...extra,
          }),
        "Pemeliharaan berhasil diperbarui.",
      );
      setMaintenanceDetail(null);
    } catch {}
  };

  const openMove = (asset: any) => {
    setMoveAsset(asset);
    setMoveForm({
      toRoomId: asset.room?.id || "",
      type: "TRANSFER",
      note: "",
    });
    setMoveOpen(true);
  };

  const submitMove = async () => {
    if (!moveAsset) return;
    try {
      await run(
        () =>
          moveAssetItem({
            assetId: moveAsset.id,
            toRoomId: moveForm.toRoomId || null,
            type: moveForm.type,
            note: moveForm.note || null,
          }),
        "Perpindahan aset berhasil dicatat.",
      );
      setMoveOpen(false);
      setMoveAsset(null);
      setTab("MOVEMENTS");
    } catch {}
  };

  const tabs = [
    { id: "ASSETS", label: "Inventaris", icon: "inventory_2", badge: data?.stats?.assetRecordCount || undefined },
    { id: "ROOMS", label: "Ruang", icon: "meeting_room", badge: data?.stats?.roomCount || undefined },
    { id: "CATEGORIES", label: "Kategori", icon: "category", badge: data?.categories?.length || undefined },
    { id: "MAINTENANCE", label: "Pemeliharaan", icon: "handyman", badge: data?.stats?.openMaintenance || undefined },
    { id: "MOVEMENTS", label: "Riwayat", icon: "swap_horiz" },
  ];

  if (query.isLoading && !data) {
    return (
      <SchoolLayout user={user}>
        <div className="flex min-h-[420px] items-center justify-center">
          <M3CircularProgress size={40} />
        </div>
      </SchoolLayout>
    );
  }

  if (query.error || !data) {
    return (
      <SchoolLayout user={user}>
        <M3Banner
          variant="error"
          headline="Data Sarpras belum dapat dimuat"
          supportingText={(query.error as any)?.message || "Periksa akses atau coba muat ulang."}
          actionLabel="Coba Lagi"
          onAction={() => query.refetch()}
        />
      </SchoolLayout>
    );
  }

  return (
    <SchoolLayout user={user}>
      <div className="space-y-5">
        <header className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="v2-eyebrow">SARANA & PRASARANA</p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-[-0.025em] text-md-on-surface">
              Inventaris & Pemeliharaan
            </h1>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-md-on-surface-variant">
              Kelola ruang, aset fisik, kondisi, perpindahan, dan pemeliharaan. Laporan kerusakan otomatis terhubung ke Tindak Lanjut Terpadu.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <M3Button variant="outlined" size="sm" icon="report_problem" onClick={() => openReport()}>
              Lapor Kerusakan
            </M3Button>
            {canManage && (
              <M3Button variant="filled" size="sm" icon="add" onClick={openAssetCreate}>
                Tambah Aset
              </M3Button>
            )}
          </div>
        </header>

        {feedback && (
          <M3Banner
            variant={feedback.type === "success" ? "success" : "error"}
            headline={feedback.type === "success" ? "Berhasil" : "Perlu diperiksa"}
            supportingText={feedback.text}
            dismissible
            onDismiss={() => setFeedback(null)}
          />
        )}

        {!canManage && (
          <M3Banner
            variant="standard"
            headline="Akses laporan Sarpras"
            supportingText="Anda dapat melihat inventaris dan melaporkan kerusakan. Perubahan data master dan penyelesaian maintenance dikelola Admin, Kepala Sekolah, atau Waka Sarpras."
            icon="info"
          />
        )}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <M3StatCard label="Unit inventaris" value={data.stats.totalUnits} tone="blue" helper={String(data.stats.assetRecordCount) + " record aset"} />
          <M3StatCard label="Kondisi baik" value={data.stats.goodUnits} tone="green" />
          <M3StatCard label="Perlu perhatian" value={data.stats.attentionUnits} tone={data.stats.attentionUnits ? "orange" : "green"} />
          <M3StatCard label="Maintenance aktif" value={data.stats.openMaintenance} tone={data.stats.openMaintenance ? "orange" : "green"} />
          <M3StatCard label="Ruang aktif" value={data.stats.roomCount} tone="teal" />
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <M3Tabs tabs={tabs} activeTab={tab} onChange={setTab} />
          {tab === "ASSETS" && (
            <div className="grid w-full gap-2 sm:grid-cols-[1fr_170px_180px] lg:max-w-3xl">
              <M3TextField
                size="sm"
                leadingIcon="search"
                placeholder="Cari kode, nama, merek, serial..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <M3Select
                size="sm"
                value={conditionFilter}
                onChange={(event) => setConditionFilter(event.target.value)}
                options={[
                  { value: "", label: "Semua kondisi" },
                  ...ASSET_CONDITIONS.map((condition) => ({
                    value: condition,
                    label: ASSET_CONDITION_META[condition].label,
                  })),
                ]}
              />
              <M3Select
                size="sm"
                value={roomFilter}
                onChange={(event) => setRoomFilter(event.target.value)}
                options={[
                  { value: "", label: "Semua ruang" },
                  ...data.rooms.map((room: any) => ({
                    value: room.id,
                    label: room.code + " · " + room.name,
                  })),
                ]}
              />
            </div>
          )}
        </div>

        {tab === "ASSETS" && (
          <div className="space-y-3">
            {!filteredAssets.length ? (
              <M3EmptyState
                icon="inventory_2"
                title="Belum ada aset pada filter ini"
                description="Tambahkan inventaris sekolah atau ubah filter pencarian."
                actionLabel={canManage ? "Tambah Aset" : undefined}
                onAction={canManage ? openAssetCreate : undefined}
              />
            ) : (
              <M3Card variant="outlined" className="overflow-hidden p-0">
                <M3Table>
                  <M3TableHeader>
                    <M3TableRow>
                      <M3TableHead>Kode</M3TableHead>
                      <M3TableHead>Aset</M3TableHead>
                      <M3TableHead>Kategori</M3TableHead>
                      <M3TableHead>Lokasi</M3TableHead>
                      <M3TableHead>Unit</M3TableHead>
                      <M3TableHead>Kondisi</M3TableHead>
                      <M3TableHead>PIC</M3TableHead>
                      <M3TableHead className="text-right">Aksi</M3TableHead>
                    </M3TableRow>
                  </M3TableHeader>
                  <M3TableBody>
                    {filteredAssets.map((asset: any) => (
                      <M3TableRow key={asset.id}>
                        <M3TableCell>
                          <span className="font-mono text-[11.5px] font-semibold text-md-on-surface">{asset.code}</span>
                        </M3TableCell>
                        <M3TableCell>
                          <div>
                            <p className="font-semibold text-md-on-surface">{asset.name}</p>
                            <p className="mt-0.5 text-[11px] text-md-on-surface-variant">
                              {[asset.brand, asset.model, asset.serialNumber].filter(Boolean).join(" · ") || "-"}
                            </p>
                          </div>
                        </M3TableCell>
                        <M3TableCell>{asset.category?.name || "-"}</M3TableCell>
                        <M3TableCell>{asset.room ? asset.room.code + " · " + asset.room.name : "Belum ditempatkan"}</M3TableCell>
                        <M3TableCell>{asset.quantity}</M3TableCell>
                        <M3TableCell>
                          <div className="flex flex-wrap gap-1">
                            <M3Badge variant={conditionVariant(asset.condition)} size="sm">
                              {ASSET_CONDITION_META[asset.condition as AssetConditionCode].label}
                            </M3Badge>
                            {asset.status !== "ACTIVE" && (
                              <M3Badge variant="outline" size="sm">
                                {ASSET_STATUS_META[asset.status as AssetStatusCode].label}
                              </M3Badge>
                            )}
                            {asset._count.maintenances > 0 && (
                              <M3Badge variant="warning" size="sm">
                                {asset._count.maintenances} maintenance
                              </M3Badge>
                            )}
                          </div>
                        </M3TableCell>
                        <M3TableCell>{personName(asset.responsibleUser)}</M3TableCell>
                        <M3TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <M3Button variant="text" size="sm" icon="report_problem" onClick={() => openReport(asset)}>
                              Lapor
                            </M3Button>
                            {canManage && (
                              <>
                                <M3Button variant="text" size="sm" icon="swap_horiz" onClick={() => openMove(asset)}>
                                  Pindah
                                </M3Button>
                                <M3Button variant="text" size="sm" icon="edit" onClick={() => openAssetEdit(asset)}>
                                  Edit
                                </M3Button>
                              </>
                            )}
                          </div>
                        </M3TableCell>
                      </M3TableRow>
                    ))}
                  </M3TableBody>
                </M3Table>
              </M3Card>
            )}
          </div>
        )}

        {tab === "ROOMS" && (
          <div className="space-y-3">
            {canManage && (
              <div className="flex justify-end">
                <M3Button variant="tonal" size="sm" icon="add" onClick={openRoomCreate}>Tambah Ruang</M3Button>
              </div>
            )}
            {!data.rooms.length ? (
              <M3EmptyState
                icon="meeting_room"
                title="Belum ada ruang/fasilitas"
                description="Data ruang menjadi lokasi resmi aset dan jejak perpindahan."
                actionLabel={canManage ? "Tambah Ruang" : undefined}
                onAction={canManage ? openRoomCreate : undefined}
              />
            ) : (
              <M3Card variant="outlined" className="overflow-hidden p-0">
                <M3Table>
                  <M3TableHeader>
                    <M3TableRow>
                      <M3TableHead>Kode</M3TableHead>
                      <M3TableHead>Ruang / Fasilitas</M3TableHead>
                      <M3TableHead>Lokasi</M3TableHead>
                      <M3TableHead>PIC</M3TableHead>
                      <M3TableHead>Aset</M3TableHead>
                      <M3TableHead>Status</M3TableHead>
                      {canManage && <M3TableHead className="text-right">Aksi</M3TableHead>}
                    </M3TableRow>
                  </M3TableHeader>
                  <M3TableBody>
                    {data.rooms.map((room: any) => (
                      <M3TableRow key={room.id}>
                        <M3TableCell><span className="font-mono font-semibold">{room.code}</span></M3TableCell>
                        <M3TableCell>
                          <p className="font-semibold text-md-on-surface">{room.name}</p>
                          <p className="text-[11px] text-md-on-surface-variant">{room.type || "Ruang/Fasilitas"}</p>
                        </M3TableCell>
                        <M3TableCell>{[room.building, room.floor].filter(Boolean).join(" · ") || "-"}</M3TableCell>
                        <M3TableCell>{personName(room.responsibleUser)}</M3TableCell>
                        <M3TableCell>{room._count.assets}</M3TableCell>
                        <M3TableCell>
                          <M3Badge variant={room.isActive ? "success" : "outline"} size="sm">
                            {room.isActive ? "Aktif" : "Nonaktif"}
                          </M3Badge>
                        </M3TableCell>
                        {canManage && (
                          <M3TableCell className="text-right">
                            <M3Button variant="text" size="sm" icon="edit" onClick={() => openRoomEdit(room)}>Edit</M3Button>
                          </M3TableCell>
                        )}
                      </M3TableRow>
                    ))}
                  </M3TableBody>
                </M3Table>
              </M3Card>
            )}
          </div>
        )}

        {tab === "CATEGORIES" && (
          <div className="space-y-3">
            {canManage && (
              <div className="flex justify-end">
                <M3Button variant="tonal" size="sm" icon="add" onClick={openCategoryCreate}>Tambah Kategori</M3Button>
              </div>
            )}
            {!data.categories.length ? (
              <M3EmptyState
                icon="category"
                title="Belum ada kategori aset"
                description="Kategori membantu pengelompokan komputer, meubel, alat praktik, kendaraan, dan aset lainnya."
                actionLabel={canManage ? "Tambah Kategori" : undefined}
                onAction={canManage ? openCategoryCreate : undefined}
              />
            ) : (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {data.categories.map((category: any) => (
                  <M3Card key={category.id} variant="outlined" className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-md-primary-container text-md-primary">
                          <M3Icon name="category" size={20} />
                        </span>
                        <div className="min-w-0">
                          <p className="font-semibold text-md-on-surface">{category.name}</p>
                          <p className="mt-0.5 font-mono text-[11px] text-md-on-surface-variant">{category.code}</p>
                          <p className="mt-2 text-[11.5px] leading-5 text-md-on-surface-variant">
                            {category.description || "Tanpa deskripsi."}
                          </p>
                        </div>
                      </div>
                      <M3Badge variant="outline" size="sm">{category._count.assets} aset</M3Badge>
                    </div>
                    {canManage && (
                      <div className="mt-3 flex justify-end border-t border-md-outline-variant/40 pt-2">
                        <M3Button variant="text" size="sm" icon="edit" onClick={() => openCategoryEdit(category)}>Edit</M3Button>
                      </div>
                    )}
                  </M3Card>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "MAINTENANCE" && (
          <div className="space-y-3">
            <div className="flex justify-end">
              <M3Button variant="tonal" size="sm" icon="report_problem" onClick={() => openReport()}>
                Laporan Baru
              </M3Button>
            </div>
            {!data.maintenance.length ? (
              <M3EmptyState
                icon="handyman"
                title="Belum ada riwayat pemeliharaan"
                description="Laporan kerusakan dan perawatan aset akan muncul di sini dan terhubung dengan tindak lanjut."
              />
            ) : (
              <M3Card variant="outlined" className="overflow-hidden p-0">
                <M3Table>
                  <M3TableHeader>
                    <M3TableRow>
                      <M3TableHead>Aset</M3TableHead>
                      <M3TableHead>Masalah</M3TableHead>
                      <M3TableHead>Prioritas</M3TableHead>
                      <M3TableHead>Status</M3TableHead>
                      <M3TableHead>PIC</M3TableHead>
                      <M3TableHead>Dilaporkan</M3TableHead>
                      <M3TableHead className="text-right">Detail</M3TableHead>
                    </M3TableRow>
                  </M3TableHeader>
                  <M3TableBody>
                    {data.maintenance.map((item: any) => (
                      <M3TableRow key={item.id}>
                        <M3TableCell>
                          <p className="font-semibold text-md-on-surface">{item.asset.name}</p>
                          <p className="font-mono text-[11px] text-md-on-surface-variant">{item.asset.code}</p>
                        </M3TableCell>
                        <M3TableCell><p className="max-w-[340px] line-clamp-2">{item.issue}</p></M3TableCell>
                        <M3TableCell>
                          <M3Badge variant={priorityVariant(item.priority)} size="sm">
                            {FOLLOW_UP_SEVERITY_META[item.priority as FollowUpSeverityCode].label}
                          </M3Badge>
                        </M3TableCell>
                        <M3TableCell>
                          <M3Badge variant={maintenanceVariant(item.status)} size="sm">
                            {MAINTENANCE_STATUS_META[item.status as AssetMaintenanceStatusCode].label}
                          </M3Badge>
                        </M3TableCell>
                        <M3TableCell>{personName(item.assignedTo)}</M3TableCell>
                        <M3TableCell>{formatDate(item.reportedAt)}</M3TableCell>
                        <M3TableCell className="text-right">
                          <M3Button variant="text" size="sm" icon="open_in_new" onClick={() => openMaintenanceDetail(item)}>Buka</M3Button>
                        </M3TableCell>
                      </M3TableRow>
                    ))}
                  </M3TableBody>
                </M3Table>
              </M3Card>
            )}
          </div>
        )}

        {tab === "MOVEMENTS" && (
          <div>
            {!data.movements.length ? (
              <M3EmptyState
                icon="swap_horiz"
                title="Belum ada riwayat pergerakan aset"
                description="Penambahan aset dan perpindahan lokasi akan tersimpan sebagai histori."
              />
            ) : (
              <M3Card variant="outlined" className="overflow-hidden p-0">
                <M3Table>
                  <M3TableHeader>
                    <M3TableRow>
                      <M3TableHead>Waktu</M3TableHead>
                      <M3TableHead>Aset</M3TableHead>
                      <M3TableHead>Jenis</M3TableHead>
                      <M3TableHead>Dari</M3TableHead>
                      <M3TableHead>Ke</M3TableHead>
                      <M3TableHead>Petugas</M3TableHead>
                      <M3TableHead>Catatan</M3TableHead>
                    </M3TableRow>
                  </M3TableHeader>
                  <M3TableBody>
                    {data.movements.map((movement: any) => (
                      <M3TableRow key={movement.id}>
                        <M3TableCell>{formatDateTime(movement.movedAt)}</M3TableCell>
                        <M3TableCell>
                          <p className="font-semibold text-md-on-surface">{movement.asset.name}</p>
                          <p className="font-mono text-[11px] text-md-on-surface-variant">{movement.asset.code}</p>
                        </M3TableCell>
                        <M3TableCell><M3Badge variant="outline" size="sm">{movement.type}</M3Badge></M3TableCell>
                        <M3TableCell>{movement.fromRoom ? movement.fromRoom.code + " · " + movement.fromRoom.name : "-"}</M3TableCell>
                        <M3TableCell>{movement.toRoom ? movement.toRoom.code + " · " + movement.toRoom.name : "-"}</M3TableCell>
                        <M3TableCell>{personName(movement.performedBy)}</M3TableCell>
                        <M3TableCell>{movement.note || "-"}</M3TableCell>
                      </M3TableRow>
                    ))}
                  </M3TableBody>
                </M3Table>
              </M3Card>
            )}
          </div>
        )}

        <M3Dialog
          isOpen={assetOpen}
          onClose={() => !busy && setAssetOpen(false)}
          title={assetForm.id ? "Edit Aset" : "Tambah Aset"}
          subtitle={assetForm.id ? "Lokasi aset dipindahkan melalui aksi Pindah agar histori tetap tercatat." : "Catat aset fisik sekolah beserta lokasi dan nilai perolehan."}
          icon="inventory_2"
          maxWidth="xl"
          actions={
            <>
              <M3Button variant="text" disabled={busy} onClick={() => setAssetOpen(false)}>Batal</M3Button>
              <M3Button variant="filled" loading={busy} onClick={submitAsset}>Simpan</M3Button>
            </>
          }
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <M3TextField label="Kode Inventaris" value={assetForm.code} onChange={(e) => setAssetForm((v) => ({ ...v, code: e.target.value }))} placeholder="INV-0001" />
            <M3TextField label="Nama Aset" value={assetForm.name} onChange={(e) => setAssetForm((v) => ({ ...v, name: e.target.value }))} placeholder="Komputer Lab" />
            <M3Select
              label="Kategori"
              value={assetForm.categoryId}
              onChange={(e) => setAssetForm((v) => ({ ...v, categoryId: e.target.value }))}
              options={[{ value: "", label: "Tanpa kategori" }, ...data.categories.map((c: any) => ({ value: c.id, label: c.code + " · " + c.name }))]}
            />
            <M3Select
              label="Ruang / Lokasi"
              value={assetForm.roomId}
              disabled={!!assetForm.id}
              supportingText={assetForm.id ? "Gunakan aksi Pindah untuk mengubah lokasi." : undefined}
              onChange={(e) => setAssetForm((v) => ({ ...v, roomId: e.target.value }))}
              options={[{ value: "", label: "Belum ditempatkan" }, ...data.rooms.filter((r: any) => r.isActive).map((r: any) => ({ value: r.id, label: r.code + " · " + r.name }))]}
            />
            <M3Select
              label="Penanggung Jawab"
              value={assetForm.responsibleUserId}
              onChange={(e) => setAssetForm((v) => ({ ...v, responsibleUserId: e.target.value }))}
              options={[{ value: "", label: "Belum ditetapkan" }, ...data.assignees.map((p: any) => ({ value: p.id, label: personName(p) }))]}
            />
            <M3TextField label="Jumlah Unit" type="number" min="1" value={assetForm.quantity} onChange={(e) => setAssetForm((v) => ({ ...v, quantity: e.target.value }))} />
            <M3TextField label="Merek" value={assetForm.brand} onChange={(e) => setAssetForm((v) => ({ ...v, brand: e.target.value }))} />
            <M3TextField label="Model / Tipe" value={assetForm.model} onChange={(e) => setAssetForm((v) => ({ ...v, model: e.target.value }))} />
            <M3TextField label="Nomor Serial" value={assetForm.serialNumber} onChange={(e) => setAssetForm((v) => ({ ...v, serialNumber: e.target.value }))} />
            <M3Select
              label="Kondisi"
              value={assetForm.condition}
              onChange={(e) => setAssetForm((v) => ({ ...v, condition: e.target.value as AssetConditionCode }))}
              options={ASSET_CONDITIONS.map((condition) => ({ value: condition, label: ASSET_CONDITION_META[condition].label }))}
            />
            <M3Select
              label="Status"
              value={assetForm.status}
              onChange={(e) => setAssetForm((v) => ({ ...v, status: e.target.value as AssetStatusCode }))}
              options={ASSET_STATUSES
                .filter((status) => status !== "DISPOSED" || assetForm.status === "DISPOSED")
                .map((status) => ({ value: status, label: ASSET_STATUS_META[status].label }))}
            />
            <M3TextField label="Tanggal Perolehan" type="date" value={assetForm.acquisitionDate} onChange={(e) => setAssetForm((v) => ({ ...v, acquisitionDate: e.target.value }))} />
            <M3TextField label="Sumber Perolehan" value={assetForm.acquisitionSource} onChange={(e) => setAssetForm((v) => ({ ...v, acquisitionSource: e.target.value }))} placeholder="BOS / Hibah / APBD / Lainnya" />
            <M3TextField label="Nilai Perolehan" type="number" min="0" value={assetForm.acquisitionValue} onChange={(e) => setAssetForm((v) => ({ ...v, acquisitionValue: e.target.value }))} />
          </div>
          <div className="mt-4">
            <label className="mb-1.5 block text-[13px] font-semibold text-md-on-surface">Catatan</label>
            <textarea
              className="min-h-24 w-full rounded-[10px] border border-md-outline-variant bg-md-surface px-3.5 py-3 text-[13px] outline-none focus:border-md-primary focus:ring-2 focus:ring-md-primary/15"
              value={assetForm.notes}
              onChange={(e) => setAssetForm((v) => ({ ...v, notes: e.target.value }))}
            />
          </div>
        </M3Dialog>

        <M3Dialog
          isOpen={roomOpen}
          onClose={() => !busy && setRoomOpen(false)}
          title={roomForm.id ? "Edit Ruang / Fasilitas" : "Tambah Ruang / Fasilitas"}
          icon="meeting_room"
          maxWidth="lg"
          actions={
            <>
              <M3Button variant="text" disabled={busy} onClick={() => setRoomOpen(false)}>Batal</M3Button>
              <M3Button variant="filled" loading={busy} onClick={submitRoom}>Simpan</M3Button>
            </>
          }
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <M3TextField label="Kode Ruang" value={roomForm.code} onChange={(e) => setRoomForm((v) => ({ ...v, code: e.target.value }))} placeholder="LAB-RPL-1" />
            <M3TextField label="Nama Ruang / Fasilitas" value={roomForm.name} onChange={(e) => setRoomForm((v) => ({ ...v, name: e.target.value }))} />
            <M3TextField label="Jenis" value={roomForm.type} onChange={(e) => setRoomForm((v) => ({ ...v, type: e.target.value }))} placeholder="Laboratorium / Kelas / Gudang" />
            <M3TextField label="Gedung" value={roomForm.building} onChange={(e) => setRoomForm((v) => ({ ...v, building: e.target.value }))} />
            <M3TextField label="Lantai" value={roomForm.floor} onChange={(e) => setRoomForm((v) => ({ ...v, floor: e.target.value }))} />
            <M3Select
              label="Penanggung Jawab"
              value={roomForm.responsibleUserId}
              onChange={(e) => setRoomForm((v) => ({ ...v, responsibleUserId: e.target.value }))}
              options={[{ value: "", label: "Belum ditetapkan" }, ...data.assignees.map((p: any) => ({ value: p.id, label: personName(p) }))]}
            />
            <M3Select
              label="Status"
              value={roomForm.isActive ? "ACTIVE" : "INACTIVE"}
              onChange={(e) => setRoomForm((v) => ({ ...v, isActive: e.target.value === "ACTIVE" }))}
              options={[{ value: "ACTIVE", label: "Aktif" }, { value: "INACTIVE", label: "Nonaktif" }]}
            />
          </div>
          <div className="mt-4">
            <label className="mb-1.5 block text-[13px] font-semibold text-md-on-surface">Catatan</label>
            <textarea
              className="min-h-24 w-full rounded-[10px] border border-md-outline-variant bg-md-surface px-3.5 py-3 text-[13px] outline-none focus:border-md-primary focus:ring-2 focus:ring-md-primary/15"
              value={roomForm.notes}
              onChange={(e) => setRoomForm((v) => ({ ...v, notes: e.target.value }))}
            />
          </div>
        </M3Dialog>

        <M3Dialog
          isOpen={categoryOpen}
          onClose={() => !busy && setCategoryOpen(false)}
          title={categoryForm.id ? "Edit Kategori Aset" : "Tambah Kategori Aset"}
          icon="category"
          actions={
            <>
              <M3Button variant="text" disabled={busy} onClick={() => setCategoryOpen(false)}>Batal</M3Button>
              <M3Button variant="filled" loading={busy} onClick={submitCategory}>Simpan</M3Button>
            </>
          }
        >
          <div className="space-y-4">
            <M3TextField label="Kode Kategori" value={categoryForm.code} onChange={(e) => setCategoryForm((v) => ({ ...v, code: e.target.value }))} placeholder="KOMPUTER" />
            <M3TextField label="Nama Kategori" value={categoryForm.name} onChange={(e) => setCategoryForm((v) => ({ ...v, name: e.target.value }))} />
            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-md-on-surface">Deskripsi</label>
              <textarea
                className="min-h-24 w-full rounded-[10px] border border-md-outline-variant bg-md-surface px-3.5 py-3 text-[13px] outline-none focus:border-md-primary focus:ring-2 focus:ring-md-primary/15"
                value={categoryForm.description}
                onChange={(e) => setCategoryForm((v) => ({ ...v, description: e.target.value }))}
              />
            </div>
          </div>
        </M3Dialog>

        <M3Dialog
          isOpen={maintenanceOpen}
          onClose={() => !busy && setMaintenanceOpen(false)}
          title="Lapor Kerusakan / Pemeliharaan"
          subtitle="Laporan ini otomatis membuat kasus pada Tindak Lanjut Terpadu."
          icon="report_problem"
          maxWidth="lg"
          actions={
            <>
              <M3Button variant="text" disabled={busy} onClick={() => setMaintenanceOpen(false)}>Batal</M3Button>
              <M3Button variant="filled" loading={busy} onClick={submitMaintenance}>Kirim Laporan</M3Button>
            </>
          }
        >
          <div className="space-y-4">
            <M3Select
              label="Aset"
              value={maintenanceForm.assetId}
              onChange={(e) => setMaintenanceForm((v) => ({ ...v, assetId: e.target.value }))}
              options={[
                { value: "", label: "Pilih aset" },
                ...data.assets.filter((a: any) => a.status === "ACTIVE").map((a: any) => ({
                  value: a.id,
                  label: a.code + " · " + a.name + (a.room ? " · " + a.room.name : ""),
                })),
              ]}
            />
            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-md-on-surface">Masalah / Kerusakan</label>
              <textarea
                className="min-h-28 w-full rounded-[10px] border border-md-outline-variant bg-md-surface px-3.5 py-3 text-[13px] outline-none focus:border-md-primary focus:ring-2 focus:ring-md-primary/15"
                value={maintenanceForm.issue}
                onChange={(e) => setMaintenanceForm((v) => ({ ...v, issue: e.target.value }))}
                placeholder="Jelaskan gejala, kerusakan, atau kebutuhan pemeliharaan."
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <M3Select
                label="Prioritas"
                value={maintenanceForm.priority}
                onChange={(e) => setMaintenanceForm((v) => ({ ...v, priority: e.target.value as FollowUpSeverityCode }))}
                options={FOLLOW_UP_SEVERITIES.map((severity) => ({ value: severity, label: FOLLOW_UP_SEVERITY_META[severity].label }))}
              />
              <M3Select
                label="Kondisi Teramati"
                value={maintenanceForm.observedCondition}
                onChange={(e) => setMaintenanceForm((v) => ({ ...v, observedCondition: e.target.value as AssetConditionCode }))}
                options={ASSET_CONDITIONS.map((condition) => ({ value: condition, label: ASSET_CONDITION_META[condition].label }))}
              />
              {canManage && (
                <M3Select
                  label="PIC Pemeliharaan"
                  value={maintenanceForm.assignedToId}
                  onChange={(e) => setMaintenanceForm((v) => ({ ...v, assignedToId: e.target.value }))}
                  options={[{ value: "", label: "Otomatis ke Waka Sarpras" }, ...data.assignees.map((p: any) => ({ value: p.id, label: personName(p) }))]}
                />
              )}
              <M3TextField label="Jadwal" type="datetime-local" value={maintenanceForm.scheduledAt} onChange={(e) => setMaintenanceForm((v) => ({ ...v, scheduledAt: e.target.value }))} />
              <M3TextField label="Vendor / Teknisi" value={maintenanceForm.vendor} onChange={(e) => setMaintenanceForm((v) => ({ ...v, vendor: e.target.value }))} />
              <M3TextField label="Estimasi Biaya" type="number" min="0" value={maintenanceForm.estimatedCost} onChange={(e) => setMaintenanceForm((v) => ({ ...v, estimatedCost: e.target.value }))} />
            </div>
          </div>
        </M3Dialog>

        <M3Dialog
          isOpen={!!maintenanceDetail}
          onClose={() => !busy && setMaintenanceDetail(null)}
          title={maintenanceDetail ? maintenanceDetail.asset.name : "Detail Pemeliharaan"}
          subtitle={maintenanceDetail ? maintenanceDetail.asset.code + " · " + formatDateTime(maintenanceDetail.reportedAt) : undefined}
          icon="handyman"
          maxWidth="xl"
          actions={<M3Button variant="text" onClick={() => setMaintenanceDetail(null)}>Tutup</M3Button>}
        >
          {maintenanceDetail && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-1.5">
                <M3Badge variant={priorityVariant(maintenanceDetail.priority)}>
                  {FOLLOW_UP_SEVERITY_META[maintenanceDetail.priority as FollowUpSeverityCode].label}
                </M3Badge>
                <M3Badge variant={maintenanceVariant(maintenanceDetail.status)}>
                  {MAINTENANCE_STATUS_META[maintenanceDetail.status as AssetMaintenanceStatusCode].label}
                </M3Badge>
                <M3Badge variant={conditionVariant(maintenanceDetail.asset.condition)}>
                  {ASSET_CONDITION_META[maintenanceDetail.asset.condition as AssetConditionCode].label}
                </M3Badge>
              </div>

              <M3Card variant="outlined" className="p-4">
                <p className="text-[13px] leading-6 text-md-on-surface">{maintenanceDetail.issue}</p>
                <div className="mt-3 grid gap-2 text-[11.5px] text-md-on-surface-variant sm:grid-cols-2">
                  <p>Pelapor: <strong className="text-md-on-surface">{personName(maintenanceDetail.reportedBy)}</strong></p>
                  <p>PIC: <strong className="text-md-on-surface">{personName(maintenanceDetail.assignedTo)}</strong></p>
                  <p>Lokasi: <strong className="text-md-on-surface">{maintenanceDetail.asset.room?.name || "-"}</strong></p>
                  <p>Estimasi: <strong className="text-md-on-surface">{currency(maintenanceDetail.estimatedCost)}</strong></p>
                  <p>Aktual: <strong className="text-md-on-surface">{currency(maintenanceDetail.actualCost)}</strong></p>
                  <p>Vendor: <strong className="text-md-on-surface">{maintenanceDetail.vendor || "-"}</strong></p>
                </div>
                <div className="mt-3">
                  <M3Button
                    variant="text"
                    size="sm"
                    href={maintenanceDetail.followUp?.id ? "/school/follow-up?case=" + maintenanceDetail.followUp.id : "/school/follow-up"}
                    icon="assignment_turned_in"
                  >
                    Buka Tindak Lanjut
                  </M3Button>
                </div>
              </M3Card>

              {canManage ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-4">
                    <M3Select
                      label="PIC"
                      value={maintenanceEdit.assignedToId}
                      onChange={(e) => setMaintenanceEdit((v) => ({ ...v, assignedToId: e.target.value }))}
                      options={[{ value: "", label: "Belum ditetapkan" }, ...data.assignees.map((p: any) => ({ value: p.id, label: personName(p) }))]}
                    />
                    <M3TextField label="Jadwal" type="datetime-local" value={maintenanceEdit.scheduledAt} onChange={(e) => setMaintenanceEdit((v) => ({ ...v, scheduledAt: e.target.value }))} />
                    <M3TextField label="Vendor / Teknisi" value={maintenanceEdit.vendor} onChange={(e) => setMaintenanceEdit((v) => ({ ...v, vendor: e.target.value }))} />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <M3TextField label="Estimasi Biaya" type="number" min="0" value={maintenanceEdit.estimatedCost} onChange={(e) => setMaintenanceEdit((v) => ({ ...v, estimatedCost: e.target.value }))} />
                      <M3TextField label="Biaya Aktual" type="number" min="0" value={maintenanceEdit.actualCost} onChange={(e) => setMaintenanceEdit((v) => ({ ...v, actualCost: e.target.value }))} />
                    </div>
                    <M3Select
                      label="Kondisi Aset Setelah Tindakan"
                      value={maintenanceEdit.assetCondition}
                      onChange={(e) => setMaintenanceEdit((v) => ({ ...v, assetCondition: e.target.value }))}
                      options={[
                        { value: "", label: "Tidak diubah" },
                        ...ASSET_CONDITIONS.map((condition) => ({ value: condition, label: ASSET_CONDITION_META[condition].label })),
                      ]}
                    />
                    <M3Button variant="tonal" loading={busy} onClick={() => saveMaintenanceDetails()}>
                      Simpan Detail
                    </M3Button>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="mb-1.5 block text-[13px] font-semibold text-md-on-surface">Catatan Penyelesaian</label>
                      <textarea
                        className="min-h-32 w-full rounded-[10px] border border-md-outline-variant bg-md-surface px-3.5 py-3 text-[13px] outline-none focus:border-md-primary focus:ring-2 focus:ring-md-primary/15"
                        value={maintenanceEdit.resolutionNote}
                        onChange={(e) => setMaintenanceEdit((v) => ({ ...v, resolutionNote: e.target.value }))}
                        placeholder="Tindakan yang dilakukan, hasil pemeriksaan, dan kondisi akhir aset."
                      />
                    </div>
                    <p className="text-[12px] font-semibold text-md-on-surface">Ubah Status</p>
                    <div className="flex flex-wrap gap-2">
                      {nextMaintenanceStatuses(maintenanceDetail.status as AssetMaintenanceStatusCode).map((status) => (
                        <M3Button
                          key={status}
                          variant={status === "COMPLETED" ? "filled" : "tonal"}
                          size="sm"
                          loading={busy}
                          onClick={() => saveMaintenanceDetails({ status })}
                        >
                          {MAINTENANCE_STATUS_META[status].label}
                        </M3Button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                maintenanceDetail.resolutionNote && (
                  <M3Banner
                    variant="success"
                    headline="Catatan penyelesaian"
                    supportingText={maintenanceDetail.resolutionNote}
                    icon="task_alt"
                  />
                )
              )}
            </div>
          )}
        </M3Dialog>

        <M3Dialog
          isOpen={moveOpen}
          onClose={() => !busy && setMoveOpen(false)}
          title={moveAsset ? "Pindahkan " + moveAsset.name : "Pindahkan Aset"}
          subtitle={moveAsset ? moveAsset.code + " · lokasi saat ini: " + (moveAsset.room?.name || "belum ditempatkan") : undefined}
          icon="swap_horiz"
          actions={
            <>
              <M3Button variant="text" disabled={busy} onClick={() => setMoveOpen(false)}>Batal</M3Button>
              <M3Button variant="filled" loading={busy} onClick={submitMove}>Catat Perpindahan</M3Button>
            </>
          }
        >
          <div className="space-y-4">
            <M3Select
              label="Jenis Pergerakan"
              value={moveForm.type}
              onChange={(e) => setMoveForm((v) => ({ ...v, type: e.target.value }))}
              options={[
                { value: "TRANSFER", label: "Pindah Ruang" },
                { value: "REPAIR", label: "Dikirim Perbaikan" },
                { value: "RETURN", label: "Kembali dari Perbaikan" },
                { value: "DISPOSAL", label: "Penghapusan Aset" },
                { value: "ADJUSTMENT", label: "Penyesuaian Lokasi" },
              ]}
            />
            <M3Select
              label="Lokasi Tujuan"
              value={moveForm.toRoomId}
              onChange={(e) => setMoveForm((v) => ({ ...v, toRoomId: e.target.value }))}
              options={[
                { value: "", label: moveForm.type === "DISPOSAL" ? "Tidak ada lokasi (dihapuskan)" : "Tanpa lokasi" },
                ...data.rooms.filter((r: any) => r.isActive).map((r: any) => ({ value: r.id, label: r.code + " · " + r.name })),
              ]}
            />
            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-md-on-surface">Catatan</label>
              <textarea
                className="min-h-24 w-full rounded-[10px] border border-md-outline-variant bg-md-surface px-3.5 py-3 text-[13px] outline-none focus:border-md-primary focus:ring-2 focus:ring-md-primary/15"
                value={moveForm.note}
                onChange={(e) => setMoveForm((v) => ({ ...v, note: e.target.value }))}
                placeholder="Alasan perpindahan atau dokumen pendukung."
              />
            </div>
          </div>
        </M3Dialog>
      </div>
    </SchoolLayout>
  );
}
