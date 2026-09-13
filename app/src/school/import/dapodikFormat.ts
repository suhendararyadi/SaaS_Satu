export type DapodikStudentRow = {
  sourceRow: number;
  name: string;
  nis: string;
  gender: string;
  nisn: string;
  birthPlace: string;
  birthDate: string;
  nik: string;
  religion: string;
  address: string;
  rt: string;
  rw: string;
  hamlet: string;
  village: string;
  district: string;
  postalCode: string;
  residenceType: string;
  transportation: string;
  phone: string;
  mobilePhone: string;
  email: string;
  skhun: string;
  receivesKps: string;
  kpsNumber: string;
  fatherName: string;
  fatherBirthYear: string;
  fatherEducation: string;
  fatherOccupation: string;
  fatherIncome: string;
  fatherNik: string;
  motherName: string;
  motherBirthYear: string;
  motherEducation: string;
  motherOccupation: string;
  motherIncome: string;
  motherNik: string;
  guardianName: string;
  guardianBirthYear: string;
  guardianEducation: string;
  guardianOccupation: string;
  guardianIncome: string;
  guardianNik: string;
  currentClassName: string;
  nationalExamNumber: string;
  diplomaSerialNumber: string;
  receivesKip: string;
  kipNumber: string;
  kipName: string;
  kksNumber: string;
  birthCertificateNumber: string;
  bankName: string;
  bankAccountNumber: string;
  bankAccountHolder: string;
  pipEligible: string;
  pipReason: string;
  specialNeeds: string;
  previousSchool: string;
  birthOrder: string;
  latitude: string;
  longitude: string;
  familyCardNumber: string;
  weightKg: string;
  heightCm: string;
  headCircumferenceCm: string;
  siblingCount: string;
  distanceToSchoolKm: string;
};

export const DAPODIK_MAX_ROWS = 5000;

export function normalizeDapodikHeader(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("id-ID")
    .replace(/&/g, "dan")
    .replace(/[^a-z0-9]+/g, "");
}

const aliases: Record<string, keyof Omit<DapodikStudentRow, "sourceRow">> = {
  nama: "name",
  nipd: "nis",
  jk: "gender",
  nisn: "nisn",
  tempatlahir: "birthPlace",
  tanggallahir: "birthDate",
  nik: "nik",
  agama: "religion",
  alamat: "address",
  rt: "rt",
  rw: "rw",
  dusun: "hamlet",
  kelurahan: "village",
  kecamatan: "district",
  kodepos: "postalCode",
  jenistinggal: "residenceType",
  alattransportasi: "transportation",
  telepon: "phone",
  hp: "mobilePhone",
  email: "email",
  skhun: "skhun",
  penerimakps: "receivesKps",
  nokps: "kpsNumber",
  dataayahnama: "fatherName",
  dataayahtahunlahir: "fatherBirthYear",
  dataayahjenjangpendidikan: "fatherEducation",
  dataayahpekerjaan: "fatherOccupation",
  dataayahpenghasilan: "fatherIncome",
  dataayahnik: "fatherNik",
  dataibunama: "motherName",
  dataibutahunlahir: "motherBirthYear",
  dataibujenjangpendidikan: "motherEducation",
  dataibupekerjaan: "motherOccupation",
  dataibupenghasilan: "motherIncome",
  dataibunik: "motherNik",
  datawalinama: "guardianName",
  datawalitahunlahir: "guardianBirthYear",
  datawalijenjangpendidikan: "guardianEducation",
  datawalipekerjaan: "guardianOccupation",
  datawalipenghasilan: "guardianIncome",
  datawalinik: "guardianNik",
  rombelsaatini: "currentClassName",
  nopesertaujiannasional: "nationalExamNumber",
  noseriijazah: "diplomaSerialNumber",
  penerimakip: "receivesKip",
  nomorkip: "kipNumber",
  namadikip: "kipName",
  nomorkks: "kksNumber",
  noregistrasiaktalahir: "birthCertificateNumber",
  bank: "bankName",
  nomorrekeningbank: "bankAccountNumber",
  rekeningatasnama: "bankAccountHolder",
  layakpipusulandarisekolah: "pipEligible",
  alasanlayakpip: "pipReason",
  kebutuhankhusus: "specialNeeds",
  sekolahasal: "previousSchool",
  anakkeberapa: "birthOrder",
  lintang: "latitude",
  bujur: "longitude",
  nokk: "familyCardNumber",
  beratbadan: "weightKg",
  tinggibadan: "heightCm",
  lingkarkepala: "headCircumferenceCm",
  jmlsaudarakandung: "siblingCount",
  jarakrumahkesekolahkm: "distanceToSchoolKm",
};

const emptyDapodikRow = (): DapodikStudentRow => ({
  sourceRow: 0,
  name: "",
  nis: "",
  gender: "",
  nisn: "",
  birthPlace: "",
  birthDate: "",
  nik: "",
  religion: "",
  address: "",
  rt: "",
  rw: "",
  hamlet: "",
  village: "",
  district: "",
  postalCode: "",
  residenceType: "",
  transportation: "",
  phone: "",
  mobilePhone: "",
  email: "",
  skhun: "",
  receivesKps: "",
  kpsNumber: "",
  fatherName: "",
  fatherBirthYear: "",
  fatherEducation: "",
  fatherOccupation: "",
  fatherIncome: "",
  fatherNik: "",
  motherName: "",
  motherBirthYear: "",
  motherEducation: "",
  motherOccupation: "",
  motherIncome: "",
  motherNik: "",
  guardianName: "",
  guardianBirthYear: "",
  guardianEducation: "",
  guardianOccupation: "",
  guardianIncome: "",
  guardianNik: "",
  currentClassName: "",
  nationalExamNumber: "",
  diplomaSerialNumber: "",
  receivesKip: "",
  kipNumber: "",
  kipName: "",
  kksNumber: "",
  birthCertificateNumber: "",
  bankName: "",
  bankAccountNumber: "",
  bankAccountHolder: "",
  pipEligible: "",
  pipReason: "",
  specialNeeds: "",
  previousSchool: "",
  birthOrder: "",
  latitude: "",
  longitude: "",
  familyCardNumber: "",
  weightKg: "",
  heightCm: "",
  headCircumferenceCm: "",
  siblingCount: "",
  distanceToSchoolKm: "",
});

function trimCell(value: unknown): string {
  if (value == null) return "";
  return String(value).trim();
}

export function findDapodikHeaderRow(rows: string[][]): number {
  const scanLimit = Math.min(rows.length, 20);
  for (let index = 0; index < scanLimit; index += 1) {
    const normalized = rows[index].map((cell) =>
      normalizeDapodikHeader(trimCell(cell)),
    );
    const required = [
      "nama",
      "nipd",
      "jk",
      "nisn",
      "tempatlahir",
      "tanggallahir",
    ];
    if (required.every((key) => normalized.includes(key))) return index;
  }
  return -1;
}

export function buildDapodikCompositeHeaders(
  primaryHeader: string[],
  secondaryHeader: string[],
): string[] {
  const length = Math.max(primaryHeader.length, secondaryHeader.length);
  const result: string[] = [];
  let activeGroup = "";

  for (let column = 0; column < length; column += 1) {
    const primary = trimCell(primaryHeader[column]);
    const secondary = trimCell(secondaryHeader[column]);

    if (primary) activeGroup = primary;
    result.push(secondary ? `${activeGroup} ${secondary}`.trim() : primary);
  }

  return result;
}

export function mapDapodikSheetRows(rows: string[][]): {
  headerRowIndex: number;
  headers: string[];
  students: DapodikStudentRow[];
  recognizedColumns: number;
} {
  const headerRowIndex = findDapodikHeaderRow(rows);
  if (headerRowIndex < 0) {
    throw new Error(
      "Format Dapodik tidak dikenali. Header Nama, NIPD, JK, NISN, Tempat Lahir, dan Tanggal Lahir tidak ditemukan.",
    );
  }

  const primary = rows[headerRowIndex] ?? [];
  const secondary = rows[headerRowIndex + 1] ?? [];
  const composite = buildDapodikCompositeHeaders(primary, secondary);
  const mappedKeys = composite.map(
    (header) => aliases[normalizeDapodikHeader(header)] ?? null,
  );
  const recognizedColumns = mappedKeys.filter(Boolean).length;

  if (recognizedColumns < 20) {
    throw new Error(
      "Kolom Dapodik yang dikenali terlalu sedikit. Gunakan file Daftar Peserta Didik hasil unduhan Dapodik tanpa mengubah struktur kolom.",
    );
  }

  const students: DapodikStudentRow[] = [];
  for (let rowIndex = headerRowIndex + 2; rowIndex < rows.length; rowIndex += 1) {
    const source = rows[rowIndex] ?? [];
    if (!source.some((cell) => trimCell(cell))) continue;

    const target = emptyDapodikRow();
    target.sourceRow = rowIndex + 1;

    mappedKeys.forEach((key, column) => {
      if (!key) return;
      target[key] = trimCell(source[column]) as never;
    });

    if (!target.name && !target.nis && !target.nisn && !target.nik) continue;
    students.push(target);

    if (students.length > DAPODIK_MAX_ROWS) {
      throw new Error(
        `File terlalu besar. Maksimal ${DAPODIK_MAX_ROWS.toLocaleString("id-ID")} peserta didik per proses impor.`,
      );
    }
  }

  return {
    headerRowIndex,
    headers: composite,
    students,
    recognizedColumns,
  };
}
