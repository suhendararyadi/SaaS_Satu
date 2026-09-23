export type StudentFormState = Record<string, string>;

export type StudentFieldConfig = {
  key: string;
  label: string;
  type?: "text" | "email" | "date" | "number" | "select" | "textarea";
  placeholder?: string;
  supportingText?: string;
  required?: boolean;
  options?: Array<{ value: string; label: string }>;
  span?: 1 | 2;
  sensitive?: boolean;
};

export type StudentSectionConfig = {
  id: string;
  title: string;
  description: string;
  icon: string;
  fields: StudentFieldConfig[];
};

const yesNoOptions = [
  { value: "", label: "Belum diisi" },
  { value: "YA", label: "Ya" },
  { value: "TIDAK", label: "Tidak" },
];

export const studentFormSections: StudentSectionConfig[] = [
  {
    id: "utama",
    title: "Data Utama",
    description:
      "Identitas pokok peserta didik. Nama lengkap dan jenis kelamin wajib diisi; data lainnya dapat dilengkapi bertahap.",
    icon: "badge",
    fields: [
      {
        key: "name",
        label: "Nama Lengkap",
        placeholder: "Nama lengkap sesuai dokumen",
        required: true,
        span: 2,
      },
      {
        key: "nis",
        label: "NIPD / NIS",
        placeholder: "Nomor induk peserta didik",
      },
      {
        key: "nisn",
        label: "NISN",
        placeholder: "10 digit NISN",
      },
      {
        key: "gender",
        label: "Jenis Kelamin",
        type: "select",
        required: true,
        options: [
          { value: "L", label: "Laki-laki (L)" },
          { value: "P", label: "Perempuan (P)" },
        ],
      },
      {
        key: "nik",
        label: "NIK",
        placeholder: "16 digit NIK",
        sensitive: true,
      },
      {
        key: "birthPlace",
        label: "Tempat Lahir",
        placeholder: "Kabupaten/kota kelahiran",
      },
      {
        key: "birthDate",
        label: "Tanggal Lahir",
        type: "date",
      },
      {
        key: "religion",
        label: "Agama",
        placeholder: "Agama/kepercayaan",
      },
      {
        key: "classRoomId",
        label: "Rombel Saat Ini",
        type: "select",
      },
      {
        key: "email",
        label: "Email",
        type: "email",
        placeholder: "siswa@contoh.sch.id",
      },
      {
        key: "status",
        label: "Status Siswa",
        type: "select",
        options: [
          { value: "ACTIVE", label: "Aktif" },
          { value: "SUSPENDED", label: "Nonaktif / Ditangguhkan" },
          { value: "GRADUATED", label: "Lulus" },
        ],
      },
    ],
  },
  {
    id: "alamat",
    title: "Alamat & Kontak",
    description:
      "Domisili dan sarana komunikasi peserta didik sesuai struktur Dapodik.",
    icon: "home",
    fields: [
      {
        key: "address",
        label: "Alamat",
        type: "textarea",
        placeholder: "Nama jalan / kampung / nomor rumah",
        span: 2,
      },
      { key: "rt", label: "RT", placeholder: "000" },
      { key: "rw", label: "RW", placeholder: "000" },
      { key: "hamlet", label: "Dusun", placeholder: "Dusun / kampung" },
      { key: "village", label: "Kelurahan / Desa", placeholder: "Kelurahan / desa" },
      { key: "district", label: "Kecamatan", placeholder: "Kecamatan" },
      { key: "postalCode", label: "Kode Pos", placeholder: "Kode pos" },
      { key: "residenceType", label: "Jenis Tinggal", placeholder: "Bersama orang tua, wali, kos, dll." },
      { key: "transportation", label: "Alat Transportasi", placeholder: "Jalan kaki, kendaraan pribadi, dll." },
      { key: "phone", label: "Telepon", placeholder: "Nomor telepon rumah" },
      { key: "mobilePhone", label: "HP", placeholder: "Nomor HP aktif" },
    ],
  },
  {
    id: "dokumen",
    title: "Dokumen & Riwayat Pendidikan",
    description:
      "Dokumen pendidikan, asal sekolah, dan identitas administrasi tambahan.",
    icon: "description",
    fields: [
      { key: "previousSchool", label: "Sekolah Asal", placeholder: "Nama sekolah asal", span: 2 },
      { key: "skhun", label: "SKHUN", placeholder: "Nomor SKHUN" },
      { key: "nationalExamNumber", label: "No. Peserta Ujian Nasional", placeholder: "Nomor peserta ujian" },
      { key: "diplomaSerialNumber", label: "No. Seri Ijazah", placeholder: "Nomor seri ijazah" },
      {
        key: "birthCertificateNumber",
        label: "No. Registrasi Akta Lahir",
        placeholder: "Nomor akta lahir",
        sensitive: true,
      },
      {
        key: "familyCardNumber",
        label: "No. KK",
        placeholder: "16 digit nomor KK",
        sensitive: true,
      },
    ],
  },
  {
    id: "ayah",
    title: "Data Ayah",
    description: "Identitas dan latar belakang ayah sesuai data peserta didik.",
    icon: "person",
    fields: [
      { key: "fatherName", label: "Nama Ayah", placeholder: "Nama lengkap ayah", span: 2 },
      { key: "fatherBirthYear", label: "Tahun Lahir", type: "number", placeholder: "Contoh: 1978" },
      { key: "fatherEducation", label: "Jenjang Pendidikan", placeholder: "SD/SMP/SMA/D3/S1/dll." },
      { key: "fatherOccupation", label: "Pekerjaan", placeholder: "Pekerjaan ayah" },
      { key: "fatherIncome", label: "Penghasilan", placeholder: "Rentang penghasilan" },
      { key: "fatherNik", label: "NIK Ayah", placeholder: "16 digit NIK", sensitive: true, span: 2 },
    ],
  },
  {
    id: "ibu",
    title: "Data Ibu",
    description: "Identitas dan latar belakang ibu sesuai data peserta didik.",
    icon: "person",
    fields: [
      { key: "motherName", label: "Nama Ibu", placeholder: "Nama lengkap ibu", span: 2 },
      { key: "motherBirthYear", label: "Tahun Lahir", type: "number", placeholder: "Contoh: 1980" },
      { key: "motherEducation", label: "Jenjang Pendidikan", placeholder: "SD/SMP/SMA/D3/S1/dll." },
      { key: "motherOccupation", label: "Pekerjaan", placeholder: "Pekerjaan ibu" },
      { key: "motherIncome", label: "Penghasilan", placeholder: "Rentang penghasilan" },
      { key: "motherNik", label: "NIK Ibu", placeholder: "16 digit NIK", sensitive: true, span: 2 },
    ],
  },
  {
    id: "wali",
    title: "Data Wali",
    description:
      "Diisi apabila peserta didik memiliki wali yang berbeda dari orang tua.",
    icon: "supervisor_account",
    fields: [
      { key: "guardianName", label: "Nama Wali", placeholder: "Nama lengkap wali", span: 2 },
      { key: "guardianBirthYear", label: "Tahun Lahir", type: "number", placeholder: "Contoh: 1975" },
      { key: "guardianEducation", label: "Jenjang Pendidikan", placeholder: "Pendidikan wali" },
      { key: "guardianOccupation", label: "Pekerjaan", placeholder: "Pekerjaan wali" },
      { key: "guardianIncome", label: "Penghasilan", placeholder: "Rentang penghasilan" },
      { key: "guardianNik", label: "NIK Wali", placeholder: "16 digit NIK", sensitive: true, span: 2 },
    ],
  },
  {
    id: "bantuan",
    title: "KPS, KIP & PIP",
    description:
      "Informasi program bantuan sosial dan pendidikan peserta didik.",
    icon: "volunteer_activism",
    fields: [
      { key: "receivesKps", label: "Penerima KPS", type: "select", options: yesNoOptions },
      { key: "kpsNumber", label: "No. KPS", placeholder: "Nomor KPS", sensitive: true },
      { key: "receivesKip", label: "Penerima KIP", type: "select", options: yesNoOptions },
      { key: "kipNumber", label: "Nomor KIP", placeholder: "Nomor KIP", sensitive: true },
      { key: "kipName", label: "Nama di KIP", placeholder: "Nama sesuai KIP" },
      { key: "kksNumber", label: "Nomor KKS", placeholder: "Nomor KKS", sensitive: true },
      { key: "pipEligible", label: "Layak PIP (Usulan Sekolah)", type: "select", options: yesNoOptions },
      { key: "pipReason", label: "Alasan Layak PIP", type: "textarea", placeholder: "Alasan / pertimbangan kelayakan PIP", span: 2 },
    ],
  },
  {
    id: "bank",
    title: "Data Rekening",
    description:
      "Data rekening peserta didik untuk kebutuhan administrasi program pendidikan.",
    icon: "account_balance",
    fields: [
      { key: "bankName", label: "Bank", placeholder: "Nama bank" },
      { key: "bankAccountNumber", label: "Nomor Rekening", placeholder: "Nomor rekening", sensitive: true },
      { key: "bankAccountHolder", label: "Rekening Atas Nama", placeholder: "Nama pemilik rekening", span: 2 },
    ],
  },
  {
    id: "tambahan",
    title: "Data Tambahan",
    description:
      "Kebutuhan khusus, urutan kelahiran, koordinat, data fisik, dan jarak ke sekolah.",
    icon: "info",
    fields: [
      { key: "specialNeeds", label: "Kebutuhan Khusus", type: "textarea", placeholder: "Tuliskan jika ada", span: 2 },
      { key: "birthOrder", label: "Anak ke-", type: "number", placeholder: "Contoh: 2" },
      { key: "siblingCount", label: "Jumlah Saudara Kandung", type: "number", placeholder: "Contoh: 3" },
      { key: "latitude", label: "Lintang", type: "number", placeholder: "-6.900000" },
      { key: "longitude", label: "Bujur", type: "number", placeholder: "107.600000" },
      { key: "weightKg", label: "Berat Badan (kg)", type: "number", placeholder: "Contoh: 48" },
      { key: "heightCm", label: "Tinggi Badan (cm)", type: "number", placeholder: "Contoh: 165" },
      { key: "headCircumferenceCm", label: "Lingkar Kepala (cm)", type: "number", placeholder: "Contoh: 54" },
      { key: "distanceToSchoolKm", label: "Jarak Rumah ke Sekolah (km)", type: "number", placeholder: "Contoh: 3.5" },
    ],
  },
];

export const studentFormKeys = studentFormSections.flatMap((section) =>
  section.fields.map((field) => field.key),
);

export function createEmptyStudentForm(): StudentFormState {
  const state: StudentFormState = {};
  for (const key of studentFormKeys) state[key] = "";
  state.gender = "L";
  state.status = "ACTIVE";
  return state;
}

export function booleanToFormValue(value: boolean | null | undefined): string {
  if (value === true) return "YA";
  if (value === false) return "TIDAK";
  return "";
}

export function valueToDisplay(value: unknown): string {
  if (value === null || value === undefined || value === "") return "Belum diisi";
  if (value === true) return "Ya";
  if (value === false) return "Tidak";
  if (value instanceof Date) return value.toLocaleDateString("id-ID");
  return String(value);
}
