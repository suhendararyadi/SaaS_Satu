export type TeacherFieldOption = {
  value: string;
  label: string;
};

export type TeacherFieldConfig = {
  key: string;
  label: string;
  type?: "text" | "email" | "date" | "number" | "textarea" | "select";
  span?: 1 | 2;
  sensitive?: boolean;
  required?: boolean;
  placeholder?: string;
  supportingText?: string;
  options?: TeacherFieldOption[];
};

export type TeacherSectionConfig = {
  id: string;
  title: string;
  description: string;
  icon: string;
  fields: TeacherFieldConfig[];
};

export type TeacherFormState = Record<string, string>;

export const teacherProfileSections: TeacherSectionConfig[] = [
  {
    id: "utama",
    title: "Data Utama",
    description:
      "Identitas dan status kepegawaian PTK sesuai format profil Dapodik sekolah.",
    icon: "badge",
    fields: [
      {
        key: "name",
        label: "Nama Lengkap",
        span: 2,
        required: true,
        placeholder: "Nama lengkap sesuai dokumen resmi",
      },
      {
        key: "nip",
        label: "NIP",
        placeholder: "Nomor Induk Pegawai",
      },
      {
        key: "nuptk",
        label: "NUPTK",
        sensitive: true,
        placeholder: "Nomor Unik Pendidik dan Tenaga Kependidikan",
      },
      {
        key: "gender",
        label: "Jenis Kelamin",
        type: "select",
        options: [
          { value: "", label: "Belum ditentukan" },
          { value: "L", label: "Laki-laki" },
          { value: "P", label: "Perempuan" },
        ],
      },
      {
        key: "ptkType",
        label: "Jenis PTK",
        placeholder: "Contoh: Guru / Tenaga Kependidikan",
      },
      {
        key: "employmentStatus",
        label: "Status Kepegawaian",
        placeholder: "Contoh: PNS / PPPK / Honor Sekolah",
      },
      {
        key: "jobTitle",
        label: "Jabatan PTK",
        placeholder: "Jabatan yang tercatat pada profil PTK",
      },
      {
        key: "birthPlace",
        label: "Tempat Lahir",
        sensitive: true,
      },
      {
        key: "birthDate",
        label: "Tanggal Lahir",
        type: "date",
        sensitive: true,
      },
      {
        key: "nik",
        label: "NIK",
        sensitive: true,
        placeholder: "Nomor Induk Kependudukan",
      },
    ],
  },
  {
    id: "kualifikasi",
    title: "Kualifikasi & Sertifikasi",
    description:
      "Gelar, pendidikan, sertifikasi, dan kompetensi profesional PTK.",
    icon: "workspace_premium",
    fields: [
      { key: "frontTitle", label: "Gelar Depan", placeholder: "Contoh: Dr." },
      {
        key: "backTitle",
        label: "Gelar Belakang",
        placeholder: "Contoh: S.Pd., M.Pd.",
      },
      {
        key: "educationLevel",
        label: "Jenjang Pendidikan",
        placeholder: "Contoh: S1 / D4 / S2",
      },
      {
        key: "educationMajor",
        label: "Jurusan / Prodi",
        span: 2,
        placeholder: "Program studi pendidikan terakhir",
      },
      {
        key: "certification",
        label: "Sertifikasi",
        type: "textarea",
        span: 2,
        placeholder: "Sertifikasi pendidik/profesi yang tercatat",
      },
      {
        key: "competencies",
        label: "Kompetensi",
        type: "textarea",
        span: 2,
        placeholder: "Kompetensi atau bidang keahlian PTK",
      },
    ],
  },
  {
    id: "beban-kerja",
    title: "Beban Kerja & Mengajar",
    description:
      "TMT kerja, tugas tambahan, mata pelajaran, dan beban jam yang tercatat pada profil Dapodik.",
    icon: "schedule",
    fields: [
      { key: "workStartDate", label: "TMT Kerja", type: "date" },
      {
        key: "additionalDutyHours",
        label: "Jam Tugas Tambahan",
        type: "number",
      },
      { key: "teachingHours", label: "JJM", type: "number" },
      { key: "totalTeachingHours", label: "Total JJM", type: "number" },
      {
        key: "studentLoad",
        label: "Jumlah / Beban Siswa",
        placeholder: "Nilai sesuai sumber Dapodik",
      },
      {
        key: "additionalDuties",
        label: "Tugas Tambahan",
        type: "textarea",
        span: 2,
        placeholder: "Tugas tambahan yang tercatat",
      },
      {
        key: "subjectsTaught",
        label: "Mengajar",
        type: "textarea",
        span: 2,
        placeholder: "Mata pelajaran/rombel yang tercatat",
      },
    ],
  },
  {
    id: "kontak",
    title: "Kontak & Akun School OS",
    description:
      "Informasi kontak dan peran akun internal School OS. Perubahan di sini tidak membuat kredensial login.",
    icon: "contact_mail",
    fields: [
      {
        key: "email",
        label: "Email",
        type: "email",
        span: 2,
        placeholder: "email@sekolah.sch.id",
      },
      {
        key: "phone",
        label: "Telepon / WhatsApp",
        placeholder: "Nomor kontak PTK",
      },
      {
        key: "role",
        label: "Peran Akun",
        type: "select",
        options: [
          { value: "TEACHER", label: "Guru / PTK (TEACHER)" },
          { value: "SCHOOL_ADMIN", label: "Admin Sekolah (SCHOOL_ADMIN)" },
        ],
        supportingText:
          "Peran akun School OS tidak mengubah penugasan Wakasek, wali kelas, atau struktur organisasi.",
      },
    ],
  },
];

export function createEmptyTeacherForm(): TeacherFormState {
  const state: TeacherFormState = {};
  for (const section of teacherProfileSections) {
    for (const field of section.fields) {
      state[field.key] = field.key === "role" ? "TEACHER" : "";
    }
  }
  return state;
}

export const sensitiveTeacherProfileKeys = teacherProfileSections
  .flatMap((section) => section.fields)
  .filter((field) => field.sensitive)
  .map((field) => field.key);
