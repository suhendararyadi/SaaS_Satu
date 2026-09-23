export type StarterManualField = {
  key: string;
  label: string;
  type: "text" | "textarea" | "date";
  required?: boolean;
  placeholder?: string;
};

export type StarterAdministrationTemplate = {
  code: string;
  name: string;
  category: string;
  description: string;
  subjectTemplate: string;
  bodyHtml: string;
  manualFields: StarterManualField[];
};

export const ADMINISTRATION_STARTER_REGISTER = {
  code: "STARTER-OUTGOING",
  name: "Register Surat Keluar — Starter",
  pattern: "{{sequence}}/{{unit}}/{{monthRoman}}/{{year}}",
  resetPolicy: "YEARLY",
} as const;

export const ADMINISTRATION_STARTER_TEMPLATES: StarterAdministrationTemplate[] = [
  {
    code: "STUDENT-ACTIVE",
    name: "Surat Keterangan Aktif Siswa",
    category: "KETERANGAN",
    description: "Kerangka umum surat keterangan bahwa peserta didik tercatat aktif di sekolah.",
    subjectTemplate: "Surat Keterangan Aktif Siswa — {{student.name}}",
    manualFields: [
      { key: "manual.purpose", label: "Keperluan", type: "text", required: true, placeholder: "Contoh: persyaratan administrasi" },
    ],
    bodyHtml: `<p>Yang bertanda tangan di bawah ini menerangkan bahwa:</p>
<table><tbody>
<tr><td>Nama</td><td>: {{student.name}}</td></tr>
<tr><td>NIS / NISN</td><td>: {{student.nis}} / {{student.nisn}}</td></tr>
<tr><td>Rombel</td><td>: {{student.className}}</td></tr>
<tr><td>Program</td><td>: {{student.department}}</td></tr>
</tbody></table>
<p>Peserta didik tersebut tercatat sebagai peserta didik aktif di {{school.name}} pada tahun ajaran {{academicYear.yearName}} {{academicYear.semester}}.</p>
<p>Surat keterangan ini dibuat untuk keperluan {{manual.purpose}} dan dapat digunakan sebagaimana mestinya.</p>`,
  },
  {
    code: "STUDENT-STATEMENT",
    name: "Surat Keterangan Siswa",
    category: "KETERANGAN",
    description: "Kerangka fleksibel untuk surat keterangan data/status siswa.",
    subjectTemplate: "Surat Keterangan — {{student.name}}",
    manualFields: [
      { key: "manual.statement", label: "Isi keterangan", type: "textarea", required: true, placeholder: "Tuliskan keterangan yang perlu dinyatakan." },
      { key: "manual.purpose", label: "Keperluan", type: "text", required: false },
    ],
    bodyHtml: `<p>Yang bertanda tangan di bawah ini menerangkan bahwa:</p>
<table><tbody>
<tr><td>Nama</td><td>: {{student.name}}</td></tr>
<tr><td>NIS / NISN</td><td>: {{student.nis}} / {{student.nisn}}</td></tr>
<tr><td>Rombel</td><td>: {{student.className}}</td></tr>
</tbody></table>
<p>{{manual.statement}}</p>
<p>Surat ini dibuat {{manual.purpose}} untuk dipergunakan sebagaimana mestinya.</p>`,
  },
  {
    code: "ASSIGNMENT",
    name: "Surat Tugas",
    category: "PENUGASAN",
    description: "Kerangka umum penugasan guru, tendik, atau peserta didik.",
    subjectTemplate: "Surat Tugas — {{manual.activityName}}",
    manualFields: [
      { key: "manual.assignee", label: "Nama pihak yang ditugaskan", type: "textarea", required: true },
      { key: "manual.activityName", label: "Nama kegiatan/tugas", type: "text", required: true },
      { key: "manual.activityDate", label: "Tanggal/waktu kegiatan", type: "text", required: true },
      { key: "manual.location", label: "Tempat", type: "text", required: true },
      { key: "manual.notes", label: "Keterangan tambahan", type: "textarea", required: false },
    ],
    bodyHtml: `<p>Dengan ini memberikan tugas kepada:</p>
<p><strong>{{manual.assignee}}</strong></p>
<p>Untuk melaksanakan kegiatan <strong>{{manual.activityName}}</strong> pada {{manual.activityDate}} bertempat di {{manual.location}}.</p>
<p>{{manual.notes}}</p>
<p>Demikian surat tugas ini dibuat untuk dilaksanakan dengan penuh tanggung jawab.</p>`,
  },
  {
    code: "COVER-LETTER",
    name: "Surat Pengantar",
    category: "PENGANTAR",
    description: "Kerangka umum surat pengantar dokumen atau keperluan kedinasan.",
    subjectTemplate: "Surat Pengantar — {{manual.purpose}}",
    manualFields: [
      { key: "manual.purpose", label: "Keperluan/pengantar", type: "text", required: true },
      { key: "manual.items", label: "Dokumen/barang yang diantar", type: "textarea", required: true },
      { key: "manual.notes", label: "Keterangan", type: "textarea", required: false },
    ],
    bodyHtml: `<p>Dengan hormat,</p>
<p>Bersama surat ini kami menyampaikan {{manual.items}} untuk keperluan {{manual.purpose}}.</p>
<p>{{manual.notes}}</p>
<p>Demikian surat pengantar ini disampaikan. Atas perhatian dan kerja sama yang baik, kami ucapkan terima kasih.</p>`,
  },
  {
    code: "INVITATION",
    name: "Surat Undangan",
    category: "UNDANGAN",
    description: "Kerangka umum undangan rapat/kegiatan sekolah.",
    subjectTemplate: "Undangan — {{manual.activityName}}",
    manualFields: [
      { key: "manual.activityName", label: "Nama kegiatan", type: "text", required: true },
      { key: "manual.activityDate", label: "Hari/tanggal/waktu", type: "text", required: true },
      { key: "manual.location", label: "Tempat", type: "text", required: true },
      { key: "manual.agenda", label: "Agenda", type: "textarea", required: true },
    ],
    bodyHtml: `<p>Dengan hormat,</p>
<p>Sehubungan dengan pelaksanaan <strong>{{manual.activityName}}</strong>, kami mengundang Bapak/Ibu/Saudara untuk hadir pada:</p>
<table><tbody>
<tr><td>Hari/Tanggal/Waktu</td><td>: {{manual.activityDate}}</td></tr>
<tr><td>Tempat</td><td>: {{manual.location}}</td></tr>
<tr><td>Agenda</td><td>: {{manual.agenda}}</td></tr>
</tbody></table>
<p>Demikian undangan ini disampaikan. Atas kehadiran dan kerja samanya, kami ucapkan terima kasih.</p>`,
  },
  {
    code: "NOTICE",
    name: "Surat Pemberitahuan",
    category: "PEMBERITAHUAN",
    description: "Kerangka umum pemberitahuan sekolah kepada pihak internal/eksternal.",
    subjectTemplate: "Pemberitahuan — {{manual.topic}}",
    manualFields: [
      { key: "manual.topic", label: "Topik pemberitahuan", type: "text", required: true },
      { key: "manual.content", label: "Isi pemberitahuan", type: "textarea", required: true },
      { key: "manual.followUp", label: "Tindak lanjut yang diharapkan", type: "textarea", required: false },
    ],
    bodyHtml: `<p>Dengan hormat,</p><p>Sehubungan dengan {{manual.topic}}, bersama ini kami sampaikan:</p><p>{{manual.content}}</p><p>{{manual.followUp}}</p><p>Demikian pemberitahuan ini disampaikan untuk menjadi perhatian.</p>`,
  },
  {
    code: "REQUEST",
    name: "Surat Permohonan",
    category: "PERMOHONAN",
    description: "Kerangka umum permohonan resmi sekolah.",
    subjectTemplate: "Permohonan — {{manual.requestTitle}}",
    manualFields: [
      { key: "manual.requestTitle", label: "Judul permohonan", type: "text", required: true },
      { key: "manual.background", label: "Latar belakang", type: "textarea", required: true },
      { key: "manual.requestDetail", label: "Permohonan yang diajukan", type: "textarea", required: true },
    ],
    bodyHtml: `<p>Dengan hormat,</p><p>{{manual.background}}</p><p>Sehubungan dengan hal tersebut, kami memohon {{manual.requestDetail}}.</p><p>Atas perhatian dan dukungan yang diberikan, kami ucapkan terima kasih.</p>`,
  },
  {
    code: "RECOMMENDATION",
    name: "Surat Rekomendasi",
    category: "REKOMENDASI",
    description: "Kerangka umum rekomendasi untuk siswa/guru/tendik.",
    subjectTemplate: "Surat Rekomendasi — {{manual.subjectName}}",
    manualFields: [
      { key: "manual.subjectName", label: "Nama yang direkomendasikan", type: "text", required: true },
      { key: "manual.purpose", label: "Tujuan rekomendasi", type: "text", required: true },
      { key: "manual.reason", label: "Dasar/alasan rekomendasi", type: "textarea", required: true },
    ],
    bodyHtml: `<p>Dengan ini {{school.name}} memberikan rekomendasi kepada <strong>{{manual.subjectName}}</strong> untuk {{manual.purpose}}.</p><p>Rekomendasi ini diberikan dengan pertimbangan: {{manual.reason}}</p><p>Demikian surat rekomendasi ini dibuat untuk digunakan sebagaimana mestinya.</p>`,
  },
  {
    code: "PKL-COVER",
    name: "Surat Pengantar PKL",
    category: "PKL",
    description: "Kerangka awal pengantar peserta didik untuk kegiatan PKL; data DUDI dapat disempurnakan pada integrasi berikutnya.",
    subjectTemplate: "Pengantar PKL — {{student.name}}",
    manualFields: [
      { key: "manual.companyName", label: "Nama perusahaan/instansi", type: "text", required: true },
      { key: "manual.pklPeriod", label: "Periode PKL", type: "text", required: true },
      { key: "manual.notes", label: "Keterangan tambahan", type: "textarea", required: false },
    ],
    bodyHtml: `<p>Dengan hormat,</p><p>Bersama surat ini kami mengantar peserta didik:</p>
<table><tbody><tr><td>Nama</td><td>: {{student.name}}</td></tr><tr><td>NISN</td><td>: {{student.nisn}}</td></tr><tr><td>Rombel</td><td>: {{student.className}}</td></tr></tbody></table>
<p>untuk melaksanakan Praktik Kerja Lapangan di <strong>{{manual.companyName}}</strong> pada periode {{manual.pklPeriod}}.</p><p>{{manual.notes}}</p><p>Atas kesempatan dan kerja sama yang diberikan, kami ucapkan terima kasih.</p>`,
  },
  {
    code: "PARENT-CALL",
    name: "Surat Panggilan Orang Tua/Wali",
    category: "KESISWAAN",
    description: "Kerangka administratif undangan/panggilan orang tua atau wali tanpa menarik catatan disiplin sensitif secara otomatis.",
    subjectTemplate: "Panggilan Orang Tua/Wali — {{student.name}}",
    manualFields: [
      { key: "manual.meetingDate", label: "Hari/tanggal/waktu", type: "text", required: true },
      { key: "manual.location", label: "Tempat", type: "text", required: true },
      { key: "manual.purpose", label: "Keperluan pertemuan", type: "textarea", required: true },
    ],
    bodyHtml: `<p>Dengan hormat,</p><p>Kami mengharapkan kehadiran orang tua/wali dari peserta didik:</p>
<table><tbody><tr><td>Nama</td><td>: {{student.name}}</td></tr><tr><td>Rombel</td><td>: {{student.className}}</td></tr></tbody></table>
<p>pada {{manual.meetingDate}} bertempat di {{manual.location}} untuk {{manual.purpose}}.</p><p>Demikian surat ini disampaikan. Atas perhatian dan kehadirannya, kami ucapkan terima kasih.</p>`,
  },
];

export const ADMINISTRATION_ALLOWED_VARIABLES = [
  "school.name", "school.npsn", "school.address", "school.city", "school.province", "school.phone", "school.email",
  "student.name", "student.nis", "student.nisn", "student.className", "student.department",
  "academicYear.yearName", "academicYear.semester",
  "document.subject", "document.date", "document.recipientName", "document.recipientAddress",
] as const;
