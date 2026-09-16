export type TeacherFieldConfig = {
  key: string;
  label: string;
  type?: "text" | "date" | "number" | "textarea";
  span?: 1 | 2;
  sensitive?: boolean;
};

export type TeacherSectionConfig = {
  id: string;
  title: string;
  description: string;
  icon: string;
  fields: TeacherFieldConfig[];
};

export const teacherProfileSections: TeacherSectionConfig[] = [
  {
    id: "utama",
    title: "Data Utama",
    description:
      "Identitas dan status kepegawaian PTK sesuai format profil Dapodik sekolah.",
    icon: "badge",
    fields: [
      { key: "name", label: "Nama Lengkap", span: 2 },
      { key: "nip", label: "NIP" },
      { key: "nuptk", label: "NUPTK", sensitive: true },
      { key: "gender", label: "Jenis Kelamin" },
      { key: "ptkType", label: "Jenis PTK" },
      { key: "employmentStatus", label: "Status Kepegawaian" },
      { key: "jobTitle", label: "Jabatan PTK" },
      { key: "birthPlace", label: "Tempat Lahir", sensitive: true },
      { key: "birthDate", label: "Tanggal Lahir", type: "date", sensitive: true },
      { key: "nik", label: "NIK", sensitive: true },
    ],
  },
  {
    id: "kualifikasi",
    title: "Kualifikasi & Sertifikasi",
    description:
      "Gelar, pendidikan, sertifikasi, dan kompetensi profesional PTK.",
    icon: "workspace_premium",
    fields: [
      { key: "frontTitle", label: "Gelar Depan" },
      { key: "backTitle", label: "Gelar Belakang" },
      { key: "educationLevel", label: "Jenjang Pendidikan" },
      { key: "educationMajor", label: "Jurusan / Prodi", span: 2 },
      { key: "certification", label: "Sertifikasi", span: 2 },
      { key: "competencies", label: "Kompetensi", type: "textarea", span: 2 },
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
      { key: "additionalDutyHours", label: "Jam Tugas Tambahan", type: "number" },
      { key: "teachingHours", label: "JJM", type: "number" },
      { key: "totalTeachingHours", label: "Total JJM", type: "number" },
      { key: "studentLoad", label: "Jumlah / Beban Siswa" },
      { key: "additionalDuties", label: "Tugas Tambahan", type: "textarea", span: 2 },
      { key: "subjectsTaught", label: "Mengajar", type: "textarea", span: 2 },
    ],
  },
  {
    id: "kontak",
    title: "Kontak & Akun School OS",
    description:
      "Informasi kontak dan akun internal School OS. Kredensial login tidak ditampilkan di profil ini.",
    icon: "contact_mail",
    fields: [
      { key: "email", label: "Email", span: 2 },
      { key: "phone", label: "Telepon / WhatsApp" },
      { key: "role", label: "Peran Akun" },
    ],
  },
];
