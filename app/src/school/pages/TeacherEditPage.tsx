import React, { useEffect, useRef, useState } from "react";
import { type AuthUser } from "wasp/auth";
import { useNavigate, useParams } from "react-router";
import {
  getSchoolTeacherDetail,
  updateSchoolTeacherProfile,
  useQuery,
} from "wasp/client/operations";
import { SchoolLayout } from "../components/SchoolLayout";
import {
  M3Badge,
  M3Banner,
  M3Button,
  M3Card,
  M3CircularProgress,
  M3Icon,
  M3Select,
  M3TextField,
} from "../../client/components/m3";
import {
  createEmptyTeacherForm,
  teacherProfileSections,
  type TeacherFieldConfig,
  type TeacherFormState,
} from "../teacherProfileUi";

function toDateInput(value: unknown): string {
  if (!value) return "";
  const text = String(value);
  return text.length >= 10 ? text.slice(0, 10) : text;
}

function teacherToForm(teacher: any): TeacherFormState {
  const state = createEmptyTeacherForm();
  const profile = teacher?.teacherProfile || {};

  state.name = teacher?.name || "";
  state.email = teacher?.email || "";
  state.role = teacher?.role === "SCHOOL_ADMIN" ? "SCHOOL_ADMIN" : "TEACHER";

  for (const section of teacherProfileSections) {
    for (const field of section.fields) {
      if (["name", "email", "role"].includes(field.key)) continue;
      const value = field.key === "phone" ? profile.phone : profile[field.key];
      if (field.type === "date") {
        state[field.key] = toDateInput(value);
      } else {
        state[field.key] =
          value === null || value === undefined ? "" : String(value);
      }
    }
  }

  return state;
}

function FormField({
  field,
  value,
  onChange,
}: {
  field: TeacherFieldConfig;
  value: string;
  onChange: (value: string) => void;
}) {
  const spanClass = field.span === 2 ? "sm:col-span-2" : "";

  if (field.type === "textarea") {
    return (
      <div className={"flex flex-col gap-1.5 " + spanClass}>
        <div className="flex items-center gap-2">
          <label className="text-[13px] font-semibold text-md-on-surface">
            {field.label}
            {field.required ? " *" : ""}
          </label>
          {field.sensitive && (
            <M3Badge variant="outline" size="sm">
              Sensitif
            </M3Badge>
          )}
        </div>
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={field.placeholder}
          rows={3}
          className="w-full resize-y rounded-[10px] border border-md-outline-variant bg-md-surface px-3.5 py-2.5 text-[14px] text-md-on-surface outline-none transition-[border-color,box-shadow] placeholder:text-md-on-surface-variant/65 hover:border-md-outline focus:border-md-primary focus:ring-2 focus:ring-md-primary/15 lg:text-[13px]"
        />
        {field.supportingText && (
          <p className="px-0.5 text-[12px] leading-5 text-md-on-surface-variant">
            {field.supportingText}
          </p>
        )}
      </div>
    );
  }

  if (field.type === "select") {
    return (
      <div className={spanClass}>
        <div className="mb-1.5 flex items-center gap-2">
          {field.sensitive && (
            <M3Badge variant="outline" size="sm">
              Data sensitif
            </M3Badge>
          )}
        </div>
        <M3Select
          label={field.label + (field.required ? " *" : "")}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          options={field.options || []}
          required={field.required}
          supportingText={field.supportingText}
        />
      </div>
    );
  }

  return (
    <div className={spanClass}>
      <div className="mb-1 flex items-center justify-end">
        {field.sensitive && (
          <M3Badge variant="outline" size="sm">
            Data sensitif
          </M3Badge>
        )}
      </div>
      <M3TextField
        label={field.label + (field.required ? " *" : "")}
        type={field.type || "text"}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={field.placeholder}
        supportingText={field.supportingText}
        required={field.required}
        min={field.type === "number" ? "0" : undefined}
        max={field.type === "number" ? "999" : undefined}
        step={field.type === "number" ? "1" : undefined}
        autoComplete="off"
      />
    </div>
  );
}

export function TeacherEditPage({ user }: { user: AuthUser }) {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const canManage =
    !!user.isAdmin ||
    user.role === "SUPERADMIN" ||
    user.role === "SCHOOL_ADMIN";

  const detailQuery = useQuery(
    getSchoolTeacherDetail,
    { id },
    { enabled: !!id && canManage },
  );

  const [form, setForm] = useState<TeacherFormState>(() =>
    createEmptyTeacherForm(),
  );
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const hydratedId = useRef<string | null>(null);

  useEffect(() => {
    if (!id || !detailQuery.data?.teacher) return;
    if (hydratedId.current === id) return;
    setForm(teacherToForm(detailQuery.data.teacher));
    hydratedId.current = id;
  }, [detailQuery.data, id]);

  const setValue = (key: string, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canManage || !id) return;
    if (!form.name?.trim()) {
      setErrorMsg("Nama lengkap PTK wajib diisi.");
      return;
    }

    const toOptionalNumber = (value: string) =>
      value === "" ? null : Number(value);

    setSubmitting(true);
    setErrorMsg("");

    try {
      await updateSchoolTeacherProfile({
        id,
        name: form.name.trim(),
        nip: form.nip || null,
        nuptk: form.nuptk || null,
        gender: form.gender === "L" || form.gender === "P" ? form.gender : null,
        birthPlace: form.birthPlace || null,
        birthDate: form.birthDate || null,
        nik: form.nik || null,
        employmentStatus: form.employmentStatus || null,
        ptkType: form.ptkType || null,
        frontTitle: form.frontTitle || null,
        backTitle: form.backTitle || null,
        educationLevel: form.educationLevel || null,
        educationMajor: form.educationMajor || null,
        certification: form.certification || null,
        workStartDate: form.workStartDate || null,
        additionalDuties: form.additionalDuties || null,
        subjectsTaught: form.subjectsTaught || null,
        additionalDutyHours: toOptionalNumber(form.additionalDutyHours),
        teachingHours: toOptionalNumber(form.teachingHours),
        totalTeachingHours: toOptionalNumber(form.totalTeachingHours),
        studentLoad: form.studentLoad || null,
        competencies: form.competencies || null,
        jobTitle: form.jobTitle || null,
        email: form.email || null,
        phone: form.phone || null,
        role: form.role === "SCHOOL_ADMIN" ? "SCHOOL_ADMIN" : "TEACHER",
      });
      navigate("/school/teachers/" + id + "?saved=1");
    } catch (error: any) {
      setErrorMsg(
        error?.message || "Data PTK belum dapat disimpan. Periksa kembali isian.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!canManage) {
    return (
      <SchoolLayout user={user}>
        <M3Banner
          variant="error"
          headline="Akses edit PTK ditolak"
          supportingText="Hanya administrator sekolah yang dapat mengubah profil lengkap Guru & Tenaga Kependidikan."
          actionLabel="Kembali"
          onAction={() => navigate("/school/teachers/" + id)}
        />
      </SchoolLayout>
    );
  }

  if (detailQuery.isLoading) {
    return (
      <SchoolLayout user={user}>
        <div className="flex min-h-[380px] items-center justify-center">
          <M3CircularProgress size={40} />
        </div>
      </SchoolLayout>
    );
  }

  if (detailQuery.error || !detailQuery.data?.teacher) {
    return (
      <SchoolLayout user={user}>
        <M3Banner
          variant="error"
          headline="Data PTK tidak ditemukan"
          supportingText="Data mungkin sudah dihapus atau tidak termasuk unit sekolah aktif."
          actionLabel="Kembali ke Guru & Tendik"
          onAction={() => navigate("/school/teachers")}
        />
      </SchoolLayout>
    );
  }

  const teacher = detailQuery.data.teacher as any;

  return (
    <SchoolLayout user={user}>
      <form onSubmit={handleSubmit} className="mx-auto max-w-[1180px] space-y-5">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div className="flex items-start gap-3">
            <M3Button
              variant="icon"
              size="icon-sm"
              icon="arrow_back"
              aria-label="Kembali ke profil PTK"
              onClick={() => navigate("/school/teachers/" + id)}
              disabled={submitting}
            />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[.08em] text-md-primary">
                Database PTK · Format Dapodik
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-[-.02em] text-md-on-surface">
                Edit Guru & Tenaga Kependidikan
              </h1>
              <p className="mt-1 max-w-3xl text-xs leading-5 text-md-on-surface-variant sm:text-sm">
                Perbarui profil {teacher.name || "PTK"} tanpa mengubah penugasan
                Wakasek, wali kelas, kepala program, atau struktur organisasi.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <M3Button
              variant="tonal"
              size="md"
              type="button"
              onClick={() => navigate("/school/teachers/" + id)}
              disabled={submitting}
            >
              Batal
            </M3Button>
            <M3Button
              variant="filled"
              size="md"
              type="submit"
              icon="save"
              isLoading={submitting}
            >
              Simpan Perubahan
            </M3Button>
          </div>
        </div>

        <M3Banner
          variant="standard"
          headline="Data PTK sensitif"
          supportingText="NUPTK, NIK, tempat lahir, dan tanggal lahir hanya tersedia bagi administrator. Perubahan profil ini tidak membuat akun login dan tidak mengubah penugasan struktur sekolah."
          icon="shield"
        />

        {errorMsg && (
          <M3Banner
            variant="error"
            headline="Data belum dapat disimpan"
            supportingText={errorMsg}
            dismissible
            onDismiss={() => setErrorMsg("")}
          />
        )}

        <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
          <aside className="hidden lg:block">
            <div className="sticky top-20 overflow-hidden rounded-[14px] border border-md-outline-variant/45 bg-md-surface">
              <div className="border-b border-md-outline-variant/35 px-3.5 py-3">
                <p className="text-[12px] font-semibold text-md-on-surface">
                  Kelompok Data
                </p>
                <p className="mt-0.5 text-[11px] text-md-on-surface-variant">
                  {teacherProfileSections.length} bagian
                </p>
              </div>
              <nav className="p-1.5">
                {teacherProfileSections.map((section) => (
                  <a
                    key={section.id}
                    href={"#teacher-" + section.id}
                    className="flex min-h-9 items-center gap-2 rounded-[8px] px-2.5 text-[12px] font-medium text-md-on-surface-variant transition-colors hover:bg-md-surface-container hover:text-md-on-surface"
                  >
                    <M3Icon name={section.icon} size={15} />
                    <span>{section.title}</span>
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          <div className="space-y-4">
            {teacherProfileSections.map((section) => (
              <M3Card
                key={section.id}
                id={"teacher-" + section.id}
                variant="outlined"
                className="scroll-mt-20 overflow-hidden"
              >
                <div className="flex items-start gap-3 border-b border-md-outline-variant/35 px-4 py-3.5 sm:px-5">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-md-primary-container text-md-primary">
                    <M3Icon name={section.icon} size={18} />
                  </span>
                  <div>
                    <h2 className="text-[15px] font-semibold text-md-on-surface">
                      {section.title}
                    </h2>
                    <p className="mt-0.5 text-[11.5px] leading-5 text-md-on-surface-variant">
                      {section.description}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 sm:p-5">
                  {section.fields.map((field) => (
                    <FormField
                      key={field.key}
                      field={field}
                      value={form[field.key] || ""}
                      onChange={(value) => setValue(field.key, value)}
                    />
                  ))}
                </div>
              </M3Card>
            ))}

            <M3Card variant="filled" className="p-4">
              <div className="flex items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-md-surface-container-high text-md-on-surface-variant">
                  <M3Icon name="account_tree" size={18} />
                </span>
                <div>
                  <p className="text-[13px] font-semibold text-md-on-surface">
                    Penugasan dikelola terpisah
                  </p>
                  <p className="mt-1 text-[12px] leading-5 text-md-on-surface-variant">
                    Wakasek, wali kelas, kepala program/konsentrasi, dan
                    penugasan organisasi tidak diubah dari form profil ini.
                    Gunakan Pusat Struktur & Penugasan bila ingin mengubahnya.
                  </p>
                  <M3Button
                    variant="text"
                    size="sm"
                    icon="account_tree"
                    href="/school/governance/organization"
                    className="mt-2"
                  >
                    Buka Struktur & Penugasan
                  </M3Button>
                </div>
              </div>
            </M3Card>

            <div className="flex justify-end gap-2 pt-1">
              <M3Button
                variant="tonal"
                size="md"
                type="button"
                onClick={() => navigate("/school/teachers/" + id)}
                disabled={submitting}
              >
                Batal
              </M3Button>
              <M3Button
                variant="filled"
                size="md"
                type="submit"
                icon="save"
                isLoading={submitting}
              >
                Simpan Perubahan
              </M3Button>
            </div>
          </div>
        </div>
      </form>
    </SchoolLayout>
  );
}
