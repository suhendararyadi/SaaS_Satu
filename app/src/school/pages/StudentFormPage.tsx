import React, { useEffect, useMemo, useRef, useState } from "react";
import { type AuthUser } from "wasp/auth";
import { useNavigate, useParams } from "react-router";
import {
  createStudent,
  getClassRooms,
  getSchoolStudentDetail,
  updateStudent,
  useQuery,
} from "wasp/client/operations";
import { SchoolLayout } from "../components/SchoolLayout";
import {
  M3Banner,
  M3Button,
  M3Card,
  M3CircularProgress,
  M3Icon,
  M3Select,
  M3TextField,
} from "../../client/components/m3";
import {
  booleanToFormValue,
  createEmptyStudentForm,
  studentFormSections,
  type StudentFieldConfig,
  type StudentFormState,
} from "../studentProfileUi";

function toDateInput(value: unknown): string {
  if (!value) return "";
  const text = String(value);
  return text.length >= 10 ? text.slice(0, 10) : text;
}

function studentToForm(student: any): StudentFormState {
  const state = createEmptyStudentForm();
  const profile = student?.studentProfile || {};

  state.name = student?.name || "";
  state.email = student?.email || "";
  state.classRoomId = student?.classRoom?.id || "";

  for (const section of studentFormSections) {
    for (const field of section.fields) {
      if (["name", "email", "classRoomId"].includes(field.key)) continue;
      const value = profile[field.key];
      if (field.key === "birthDate") {
        state[field.key] = toDateInput(value);
      } else if (
        ["receivesKps", "receivesKip", "pipEligible"].includes(field.key)
      ) {
        state[field.key] = booleanToFormValue(value);
      } else {
        state[field.key] =
          value === null || value === undefined ? "" : String(value);
      }
    }
  }

  state.gender = profile.gender === "P" ? "P" : "L";
  state.status = profile.status || "ACTIVE";
  return state;
}

function FormField({
  field,
  value,
  onChange,
  classOptions,
}: {
  field: StudentFieldConfig;
  value: string;
  onChange: (value: string) => void;
  classOptions: Array<{ value: string; label: string }>;
}) {
  if (field.type === "textarea") {
    return (
      <div
        className={
          "flex flex-col gap-1.5 " +
          (field.span === 2 ? "sm:col-span-2" : "")
        }
      >
        <label className="text-[13px] font-semibold text-md-on-surface">
          {field.label}
          {field.required ? " *" : ""}
        </label>
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
    const options =
      field.key === "classRoomId" ? classOptions : field.options || [];
    return (
      <div className={field.span === 2 ? "sm:col-span-2" : ""}>
        <M3Select
          label={field.label + (field.required ? " *" : "")}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          options={options}
          required={field.required}
        />
      </div>
    );
  }

  const isDecimal = [
    "latitude",
    "longitude",
    "weightKg",
    "heightCm",
    "headCircumferenceCm",
    "distanceToSchoolKm",
  ].includes(field.key);

  return (
    <div className={field.span === 2 ? "sm:col-span-2" : ""}>
      <M3TextField
        label={field.label + (field.required ? " *" : "")}
        type={field.type || "text"}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={field.placeholder}
        supportingText={field.supportingText}
        required={field.required}
        step={field.type === "number" && isDecimal ? "any" : undefined}
      />
    </div>
  );
}

export function StudentFormPage({ user }: { user: AuthUser }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;
  const canManage =
    !!user.isAdmin ||
    user.role === "SUPERADMIN" ||
    user.role === "SCHOOL_ADMIN";

  const { data: classes } = useQuery(getClassRooms);
  const detailQuery = useQuery(
    getSchoolStudentDetail,
    { id: id || "00000000-0000-0000-0000-000000000000" },
    { enabled: isEdit },
  );

  const [form, setForm] = useState<StudentFormState>(() =>
    createEmptyStudentForm(),
  );
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const hydratedId = useRef<string | null>(null);

  useEffect(() => {
    if (!isEdit || !id || !detailQuery.data?.student) return;
    if (hydratedId.current === id) return;
    setForm(studentToForm(detailQuery.data.student));
    hydratedId.current = id;
  }, [detailQuery.data, id, isEdit]);

  const classOptions = useMemo(
    () => [
      { value: "", label: "Belum ditentukan" },
      ...(classes?.map((room) => ({
        value: room.id,
        label:
          room.name +
          (room.department ? " (" + room.department.code + ")" : ""),
      })) || []),
    ],
    [classes],
  );

  const setValue = (key: string, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canManage) return;
    if (!form.name.trim()) {
      setErrorMsg("Nama lengkap siswa wajib diisi.");
      return;
    }
    if (!["L", "P"].includes(form.gender)) {
      setErrorMsg("Jenis kelamin wajib dipilih.");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");

    try {
      const payload = { ...form, name: form.name.trim() };
      const result =
        isEdit && id
          ? await updateStudent({ ...payload, id } as any)
          : await createStudent(payload as any);

      const studentId = (result as any)?.id || id;
      navigate(studentId ? "/school/students/" + studentId : "/school/students");
    } catch (error: any) {
      setErrorMsg(error?.message || "Data siswa gagal disimpan.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSubmitting(false);
    }
  };

  if (!canManage) {
    return (
      <SchoolLayout user={user}>
        <M3Banner
          variant="error"
          headline="Akses terbatas"
          supportingText="Hanya administrator sekolah yang dapat menambah atau mengubah database siswa."
        />
      </SchoolLayout>
    );
  }

  if (isEdit && detailQuery.isLoading) {
    return (
      <SchoolLayout user={user}>
        <div className="flex min-h-[360px] items-center justify-center">
          <M3CircularProgress size={40} />
        </div>
      </SchoolLayout>
    );
  }

  if (isEdit && (detailQuery.error || !detailQuery.data?.student)) {
    return (
      <SchoolLayout user={user}>
        <M3Banner
          variant="error"
          headline="Data siswa tidak dapat dibuka"
          supportingText="Pastikan siswa masih terdaftar pada unit sekolah aktif."
          actionLabel="Kembali ke Data Siswa"
          onAction={() => navigate("/school/students")}
        />
      </SchoolLayout>
    );
  }

  return (
    <SchoolLayout user={user}>
      <form onSubmit={handleSubmit} className="mx-auto max-w-[1180px] space-y-5">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div className="flex min-w-0 items-start gap-3">
            <M3Button
              variant="icon"
              size="icon-sm"
              icon="arrow_back"
              aria-label="Kembali"
              onClick={() =>
                navigate(
                  isEdit && id ? "/school/students/" + id : "/school/students",
                )
              }
            />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[.08em] text-md-primary">
                Database Siswa · Format Dapodik
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-[-.02em] text-md-on-surface">
                {isEdit ? "Edit Data Siswa" : "Tambah Siswa"}
              </h1>
              <p className="mt-1 max-w-2xl text-xs leading-5 text-md-on-surface-variant sm:text-sm">
                Nama lengkap dan jenis kelamin adalah data wajib. Kolom lain
                dapat dilengkapi sekarang, melalui halaman edit, atau dari
                impor Dapodik.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <M3Button
              variant="tonal"
              size="md"
              onClick={() =>
                navigate(
                  isEdit && id ? "/school/students/" + id : "/school/students",
                )
              }
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
              {isEdit ? "Simpan Perubahan" : "Simpan Siswa"}
            </M3Button>
          </div>
        </div>

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
                  {studentFormSections.length} bagian
                </p>
              </div>
              <nav className="p-1.5">
                {studentFormSections.map((section) => (
                  <a
                    key={section.id}
                    href={"#student-" + section.id}
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
            {studentFormSections.map((section) => (
              <M3Card
                key={section.id}
                id={"student-" + section.id}
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
                      classOptions={classOptions}
                    />
                  ))}
                </div>
              </M3Card>
            ))}

            <div className="flex justify-end gap-2 pt-1">
              <M3Button
                variant="tonal"
                size="md"
                onClick={() =>
                  navigate(
                    isEdit && id ? "/school/students/" + id : "/school/students",
                  )
                }
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
                {isEdit ? "Simpan Perubahan" : "Simpan Siswa"}
              </M3Button>
            </div>
          </div>
        </div>
      </form>
    </SchoolLayout>
  );
}
