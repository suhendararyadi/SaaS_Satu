import { describe, expect, it } from "vitest";
import {
  buildDapodikCompositeHeaders,
  findDapodikHeaderRow,
  mapDapodikSheetRows,
} from "./dapodikFormat";

const primaryHeader = [
  "No",
  "Nama",
  "NIPD",
  "JK",
  "NISN",
  "Tempat Lahir",
  "Tanggal Lahir",
  "NIK",
  "Agama",
  "Alamat",
  "RT",
  "RW",
  "Dusun",
  "Kelurahan",
  "Kecamatan",
  "Kode Pos",
  "Jenis Tinggal",
  "Alat Transportasi",
  "Telepon",
  "HP",
  "E-Mail",
  "SKHUN",
  "Penerima KPS",
  "No. KPS",
  "Data Ayah",
  "",
  "",
  "",
  "",
  "",
  "Data Ibu",
  "",
  "",
  "",
  "",
  "",
  "Data Wali",
  "",
  "",
  "",
  "",
  "",
  "Rombel Saat Ini",
  "No Peserta Ujian Nasional",
  "No Seri Ijazah",
  "Penerima KIP",
  "Nomor KIP",
  "Nama di KIP",
  "Nomor KKS",
  "No Registrasi Akta Lahir",
  "Bank",
  "Nomor Rekening Bank",
  "Rekening Atas Nama",
  "Layak PIP (usulan dari sekolah)",
  "Alasan Layak PIP",
  "Kebutuhan Khusus",
  "Sekolah Asal",
  "Anak ke-berapa",
  "Lintang",
  "Bujur",
  "No KK",
  "Berat Badan",
  "Tinggi Badan",
  "Lingkar Kepala",
  "Jml. Saudara\nKandung",
  "Jarak Rumah\nke Sekolah (KM)",
];

const secondaryHeader = Array.from({ length: primaryHeader.length }, () => "");
secondaryHeader.splice(
  24,
  18,
  "Nama",
  "Tahun Lahir",
  "Jenjang Pendidikan",
  "Pekerjaan",
  "Penghasilan",
  "NIK",
  "Nama",
  "Tahun Lahir",
  "Jenjang Pendidikan",
  "Pekerjaan",
  "Penghasilan",
  "NIK",
  "Nama",
  "Tahun Lahir",
  "Jenjang Pendidikan",
  "Pekerjaan",
  "Penghasilan",
  "NIK",
);

describe("Dapodik student format", () => {
  it("detects the two-row Dapodik header after report metadata", () => {
    const rows = [
      ["Daftar Peserta Didik"],
      ["Nama sekolah"],
      ["Wilayah"],
      ["Tanggal Unduh"],
      primaryHeader,
      secondaryHeader,
    ];

    expect(findDapodikHeaderRow(rows)).toBe(4);
  });

  it("combines parent and guardian group headers correctly", () => {
    const headers = buildDapodikCompositeHeaders(primaryHeader, secondaryHeader);
    expect(headers[24]).toBe("Data Ayah Nama");
    expect(headers[29]).toBe("Data Ayah NIK");
    expect(headers[30]).toBe("Data Ibu Nama");
    expect(headers[36]).toBe("Data Wali Nama");
    expect(headers[42]).toBe("Rombel Saat Ini");
  });

  it("maps Dapodik columns into canonical student fields without report metadata", () => {
    const data = Array.from({ length: primaryHeader.length }, () => "");
    data[0] = "1";
    data[1] = "Siswa Uji";
    data[2] = "NIPD001";
    data[3] = "L";
    data[4] = "0012345678";
    data[5] = "Bandung";
    data[6] = "2010-01-02";
    data[7] = "3200000000000001";
    data[24] = "Ayah Uji";
    data[30] = "Ibu Uji";
    data[36] = "Wali Uji";
    data[42] = "10 RPL-1";
    data[45] = "Ya";
    data[53] = "Tidak";
    data[58] = "-6.9";
    data[59] = "107.6";
    data[60] = "3200000000000002";
    data[65] = "4.5";

    const mapped = mapDapodikSheetRows([
      ["Daftar Peserta Didik"],
      ["Sekolah"],
      ["Wilayah"],
      ["Tanggal Unduh"],
      primaryHeader,
      secondaryHeader,
      data,
    ]);

    expect(mapped.recognizedColumns).toBeGreaterThanOrEqual(60);
    expect(mapped.students).toHaveLength(1);
    expect(mapped.students[0]).toMatchObject({
      sourceRow: 7,
      name: "Siswa Uji",
      nis: "NIPD001",
      nisn: "0012345678",
      fatherName: "Ayah Uji",
      motherName: "Ibu Uji",
      guardianName: "Wali Uji",
      currentClassName: "10 RPL-1",
      receivesKip: "Ya",
      pipEligible: "Tidak",
      latitude: "-6.9",
      longitude: "107.6",
      familyCardNumber: "3200000000000002",
      distanceToSchoolKm: "4.5",
    });
  });
});
