export type StarterManualField = {
  key: string;
  label: string;
  type: "text" | "textarea" | "date" | "time" | "select";
  required?: boolean;
  placeholder?: string;
  helperText?: string;
  options?: Array<{ label: string; value: string }>;
};

export type StarterContextMode = "hidden" | "optional" | "required";

export type StarterTemplateContext = {
  student: StarterContextMode;
  staff: StarterContextMode;
  recipient: StarterContextMode;
  recipientAddress?: StarterContextMode;
  requireOneOf?: Array<"student" | "staff">;
};

export type StarterAdministrationTemplate = {
  code: string;
  name: string;
  category: string;
  description: string;
  subjectTemplate: string;
  bodyHtml: string;
  manualFields: StarterManualField[];
  context: StarterTemplateContext;
};

export const ADMINISTRATION_STARTER_REGISTER = {
  code: "STARTER-OUTGOING",
  name: "Register Surat Keluar — Starter",
  pattern: "{{sequence}}/{{unit}}/{{monthRoman}}/{{year}}",
  resetPolicy: "YEARLY",
} as const;

// Redaksi di bawah adalah starter School OS yang mengikuti struktur korespondensi
// administrasi sekolah Indonesia. Ia bukan kutipan wajib dari satu regulasi tertentu
// dan tetap dapat divariasikan sekolah melalui template versioning.
export const ADMINISTRATION_STARTER_TEMPLATES: StarterAdministrationTemplate[] = [
  {
    code: "STUDENT-ACTIVE",
    name: "Surat Keterangan Aktif Siswa",
    category: "KETERANGAN",
    description: "Surat keterangan aktif dengan identitas siswa, rombel, program keahlian, tahun ajaran, dan Kepala Sekolah terisi otomatis.",
    subjectTemplate: "Surat Keterangan Aktif Siswa",
    context: { student: "required", staff: "hidden", recipient: "hidden" },
    manualFields: [
      { key: "manual.purpose", label: "Keperluan", type: "text", required: true, placeholder: "Contoh: persyaratan beasiswa", helperText: "Cukup isi tujuan penggunaan surat." },
    ],
    bodyHtml: `<p>Yang bertanda tangan di bawah ini, Kepala {{school.name}}, menerangkan bahwa:</p>
<table><tbody>
<tr><td>Nama</td><td>: {{student.name}}</td></tr>
<tr><td>NIS / NISN</td><td>: {{student.nis}} / {{student.nisn}}</td></tr>
<tr><td>Rombel</td><td>: {{student.className}}</td></tr>
<tr><td>Program Keahlian</td><td>: {{student.department}}</td></tr>
</tbody></table>
<p>Benar bahwa nama tersebut di atas tercatat sebagai peserta didik aktif di {{school.name}} pada Tahun Ajaran {{academicYear.yearName}} semester {{academicYear.semester}}.</p>
<p>Surat keterangan ini dibuat untuk keperluan <strong>{{manual.purpose}}</strong>. Demikian surat keterangan ini dibuat dengan sebenarnya agar dapat dipergunakan sebagaimana mestinya.</p>`,
  },
  {
    code: "STUDENT-STATEMENT",
    name: "Surat Keterangan Siswa",
    category: "KETERANGAN",
    description: "Surat keterangan umum siswa; identitas siswa otomatis dan operator hanya menuliskan konteks keterangan serta keperluannya.",
    subjectTemplate: "Surat Keterangan Siswa",
    context: { student: "required", staff: "hidden", recipient: "hidden" },
    manualFields: [
      { key: "manual.statement", label: "Keterangan yang dinyatakan", type: "textarea", required: true, placeholder: "Contoh: yang bersangkutan mengikuti kegiatan ...", helperText: "Tuliskan fakta/keterangan inti saja; pembuka dan penutup sudah otomatis." },
      { key: "manual.purpose", label: "Keperluan", type: "text", required: false, placeholder: "Opsional" },
    ],
    bodyHtml: `<p>Yang bertanda tangan di bawah ini, Kepala {{school.name}}, menerangkan bahwa:</p>
<table><tbody>
<tr><td>Nama</td><td>: {{student.name}}</td></tr>
<tr><td>NIS / NISN</td><td>: {{student.nis}} / {{student.nisn}}</td></tr>
<tr><td>Rombel</td><td>: {{student.className}}</td></tr>
<tr><td>Program Keahlian</td><td>: {{student.department}}</td></tr>
</tbody></table>
<p>{{manual.statement}}</p>
{{#if manual.purpose}}<p>Surat keterangan ini dibuat untuk keperluan <strong>{{manual.purpose}}</strong>.</p>{{/if}}
<p>Demikian surat keterangan ini dibuat dengan sebenarnya agar dapat dipergunakan sebagaimana mestinya.</p>`,
  },
  {
    code: "ASSIGNMENT",
    name: "Surat Tugas",
    category: "PENUGASAN",
    description: "Surat tugas guru/tendik dengan identitas, NIP, dan jabatan dari database; operator cukup mengisi kegiatan, waktu, tempat, serta dasar bila ada.",
    subjectTemplate: "Surat Tugas — {{manual.activityName}}",
    context: { student: "hidden", staff: "required", recipient: "hidden" },
    manualFields: [
      { key: "manual.basis", label: "Dasar penugasan", type: "textarea", required: false, placeholder: "Opsional: undangan, program kerja, atau dasar kegiatan" },
      { key: "manual.activityName", label: "Nama kegiatan / tugas", type: "text", required: true, placeholder: "Contoh: Workshop Penyelarasan Kurikulum" },
      { key: "manual.activityDate", label: "Tanggal kegiatan", type: "date", required: true },
      { key: "manual.activityTime", label: "Waktu", type: "time", required: false },
      { key: "manual.location", label: "Tempat", type: "text", required: true },
      { key: "manual.dutyDetail", label: "Rincian tugas", type: "textarea", required: false, placeholder: "Opsional bila perlu penjelasan khusus." },
    ],
    bodyHtml: `{{#if manual.basis}}<p>Berdasarkan {{manual.basis}}, Kepala {{school.name}} dengan ini memberikan tugas kepada:</p>{{/if}}
{{#unless manual.basis}}<p>Kepala {{school.name}} dengan ini memberikan tugas kepada:</p>{{/unless}}
<table><tbody>
<tr><td>Nama</td><td>: {{staff.name}}</td></tr>
<tr><td>NIP</td><td>: {{staff.nip}}</td></tr>
<tr><td>Jabatan</td><td>: {{staff.title}}</td></tr>
</tbody></table>
<p>Untuk melaksanakan tugas/kegiatan <strong>{{manual.activityName}}</strong> dengan ketentuan:</p>
<table><tbody>
<tr><td>Tanggal</td><td>: {{manual.activityDate}}</td></tr>
{{#if manual.activityTime}}<tr><td>Waktu</td><td>: {{manual.activityTime}}</td></tr>{{/if}}
<tr><td>Tempat</td><td>: {{manual.location}}</td></tr>
</tbody></table>
{{#if manual.dutyDetail}}<p>{{manual.dutyDetail}}</p>{{/if}}
<p>Demikian surat tugas ini dibuat untuk dilaksanakan dengan penuh tanggung jawab dan setelah selesai agar melaporkan hasil pelaksanaan tugas sesuai ketentuan yang berlaku.</p>`,
  },
  {
    code: "COVER-LETTER",
    name: "Surat Pengantar",
    category: "PENGANTAR",
    description: "Surat pengantar ke instansi/pihak lain; tujuan penerima, keperluan, dan daftar dokumen/barang menjadi input utama.",
    subjectTemplate: "Pengantar — {{manual.purpose}}",
    context: { student: "optional", staff: "optional", recipient: "required", recipientAddress: "optional" },
    manualFields: [
      { key: "manual.purpose", label: "Keperluan pengantar", type: "text", required: true },
      { key: "manual.items", label: "Dokumen / berkas / barang yang disampaikan", type: "textarea", required: true, placeholder: "Tuliskan daftar singkat dokumen atau berkas." },
      { key: "manual.notes", label: "Keterangan tambahan", type: "textarea", required: false },
    ],
    bodyHtml: `<p>Dengan hormat,</p>
<p>Bersama surat ini kami menyampaikan <strong>{{manual.items}}</strong> untuk keperluan <strong>{{manual.purpose}}</strong>.</p>
{{#if student.name}}<p>Dokumen tersebut berkaitan dengan peserta didik <strong>{{student.name}}</strong>, NISN {{student.nisn}}, rombel {{student.className}}.</p>{{/if}}
{{#if staff.name}}<p>Dokumen tersebut berkaitan dengan <strong>{{staff.name}}</strong>.</p>{{/if}}
{{#if staff.nip}}<p>NIP: {{staff.nip}}.</p>{{/if}}
{{#if manual.notes}}<p>{{manual.notes}}</p>{{/if}}
<p>Demikian surat pengantar ini disampaikan. Atas perhatian dan kerja sama yang baik, kami ucapkan terima kasih.</p>`,
  },
  {
    code: "INVITATION",
    name: "Surat Undangan",
    category: "UNDANGAN",
    description: "Undangan resmi dengan penerima, kegiatan, tanggal, waktu, tempat, dan agenda; redaksi pembuka/penutup otomatis.",
    subjectTemplate: "Undangan — {{manual.activityName}}",
    context: { student: "hidden", staff: "hidden", recipient: "required", recipientAddress: "optional" },
    manualFields: [
      { key: "manual.activityName", label: "Nama kegiatan", type: "text", required: true },
      { key: "manual.activityDate", label: "Tanggal", type: "date", required: true },
      { key: "manual.activityTime", label: "Waktu", type: "time", required: true },
      { key: "manual.location", label: "Tempat", type: "text", required: true },
      { key: "manual.agenda", label: "Agenda / acara", type: "textarea", required: true },
      { key: "manual.attendanceNote", label: "Catatan kehadiran", type: "textarea", required: false, placeholder: "Opsional, misalnya membawa surat tugas atau hadir 15 menit lebih awal." },
    ],
    bodyHtml: `<p>Dengan hormat,</p>
<p>Sehubungan dengan akan dilaksanakannya <strong>{{manual.activityName}}</strong>, kami mengundang Bapak/Ibu/Saudara untuk hadir pada:</p>
<table><tbody>
<tr><td>Tanggal</td><td>: {{manual.activityDate}}</td></tr>
<tr><td>Waktu</td><td>: {{manual.activityTime}}</td></tr>
<tr><td>Tempat</td><td>: {{manual.location}}</td></tr>
<tr><td>Agenda</td><td>: {{manual.agenda}}</td></tr>
</tbody></table>
{{#if manual.attendanceNote}}<p>{{manual.attendanceNote}}</p>{{/if}}
<p>Demikian undangan ini kami sampaikan. Atas perhatian dan kehadiran Bapak/Ibu/Saudara, kami ucapkan terima kasih.</p>`,
  },
  {
    code: "NOTICE",
    name: "Surat Pemberitahuan",
    category: "PEMBERITAHUAN",
    description: "Pemberitahuan resmi sekolah; operator cukup menentukan sasaran/topik, isi informasi utama, dan tindak lanjut bila diperlukan.",
    subjectTemplate: "Pemberitahuan — {{manual.topic}}",
    context: { student: "hidden", staff: "hidden", recipient: "optional", recipientAddress: "optional" },
    manualFields: [
      { key: "manual.topic", label: "Topik pemberitahuan", type: "text", required: true },
      { key: "manual.content", label: "Informasi utama", type: "textarea", required: true, placeholder: "Tuliskan fakta/informasi inti yang perlu diketahui." },
      { key: "manual.effectiveDate", label: "Tanggal berlaku / pelaksanaan", type: "date", required: false },
      { key: "manual.followUp", label: "Tindak lanjut yang diharapkan", type: "textarea", required: false },
    ],
    bodyHtml: `<p>Dengan hormat,</p>
<p>Sehubungan dengan <strong>{{manual.topic}}</strong>, bersama ini kami sampaikan bahwa {{manual.content}}</p>
{{#if manual.effectiveDate}}<p>Ketentuan/informasi tersebut berlaku atau dilaksanakan mulai tanggal <strong>{{manual.effectiveDate}}</strong>.</p>{{/if}}
{{#if manual.followUp}}<p>Sehubungan dengan hal tersebut, kami mengharapkan {{manual.followUp}}</p>{{/if}}
<p>Demikian pemberitahuan ini disampaikan untuk menjadi perhatian dan dilaksanakan sebagaimana mestinya. Atas perhatian dan kerja samanya, kami ucapkan terima kasih.</p>`,
  },
  {
    code: "REQUEST",
    name: "Surat Permohonan",
    category: "PERMOHONAN",
    description: "Permohonan resmi sekolah ke instansi/pihak lain; tujuan surat, konteks, dan permohonan inti menjadi input utama.",
    subjectTemplate: "Permohonan — {{manual.requestTitle}}",
    context: { student: "optional", staff: "optional", recipient: "required", recipientAddress: "optional" },
    manualFields: [
      { key: "manual.requestTitle", label: "Jenis / judul permohonan", type: "text", required: true },
      { key: "manual.background", label: "Konteks singkat", type: "textarea", required: true, placeholder: "Jelaskan alasan/kegiatan yang melatarbelakangi permohonan secara singkat." },
      { key: "manual.requestDetail", label: "Permohonan yang diajukan", type: "textarea", required: true, placeholder: "Tuliskan secara jelas apa yang dimohonkan." },
      { key: "manual.expectedDate", label: "Tanggal/waktu yang diharapkan", type: "date", required: false },
    ],
    bodyHtml: `<p>Dengan hormat,</p>
<p>{{manual.background}}</p>
<p>Sehubungan dengan hal tersebut, kami memohon kepada Bapak/Ibu agar berkenan <strong>{{manual.requestDetail}}</strong>.</p>
{{#if manual.expectedDate}}<p>Pelaksanaan/pemenuhan permohonan tersebut kami harapkan pada tanggal {{manual.expectedDate}}.</p>{{/if}}
{{#if student.name}}<p>Permohonan ini berkaitan dengan peserta didik <strong>{{student.name}}</strong>, NISN {{student.nisn}}, rombel {{student.className}}.</p>{{/if}}
{{#if staff.name}}<p>Permohonan ini berkaitan dengan <strong>{{staff.name}}</strong>.</p>{{/if}}
{{#if staff.nip}}<p>NIP: {{staff.nip}}.</p>{{/if}}
<p>Demikian permohonan ini kami sampaikan. Atas perhatian, dukungan, dan kerja sama yang baik, kami ucapkan terima kasih.</p>`,
  },
  {
    code: "RECOMMENDATION",
    name: "Surat Rekomendasi",
    category: "REKOMENDASI",
    description: "Rekomendasi untuk siswa atau guru/tendik. Operator memilih salah satu orang dari database lalu mengisi tujuan dan pertimbangan rekomendasi.",
    subjectTemplate: "Surat Rekomendasi",
    context: { student: "optional", staff: "optional", recipient: "optional", recipientAddress: "optional", requireOneOf: ["student", "staff"] },
    manualFields: [
      { key: "manual.purpose", label: "Tujuan rekomendasi", type: "text", required: true },
      { key: "manual.reason", label: "Pertimbangan / dasar rekomendasi", type: "textarea", required: true, placeholder: "Tuliskan alasan singkat dan faktual." },
    ],
    bodyHtml: `<p>Yang bertanda tangan di bawah ini, Kepala {{school.name}}, dengan ini memberikan rekomendasi kepada:</p>
{{#if student.name}}<table><tbody>
<tr><td>Nama</td><td>: {{student.name}}</td></tr>
<tr><td>NIS / NISN</td><td>: {{student.nis}} / {{student.nisn}}</td></tr>
<tr><td>Rombel</td><td>: {{student.className}}</td></tr>
<tr><td>Program Keahlian</td><td>: {{student.department}}</td></tr>
</tbody></table>{{/if}}
{{#if staff.name}}<table><tbody>
<tr><td>Nama</td><td>: {{staff.name}}</td></tr>
<tr><td>NIP</td><td>: {{staff.nip}}</td></tr>
<tr><td>Jabatan</td><td>: {{staff.title}}</td></tr>
</tbody></table>{{/if}}
<p>Untuk <strong>{{manual.purpose}}</strong>.</p>
<p>Rekomendasi ini diberikan dengan pertimbangan bahwa {{manual.reason}}</p>
<p>Demikian surat rekomendasi ini dibuat dengan sebenarnya agar dapat dipergunakan sebagaimana mestinya.</p>`,
  },
  {
    code: "PKL-COVER",
    name: "Surat Pengantar PKL",
    category: "PKL",
    description: "Pengantar PKL dengan data siswa otomatis dan guru pembimbing opsional; operator cukup mengisi DUDI, periode, dan keterangan khusus bila ada.",
    subjectTemplate: "Pengantar Praktik Kerja Lapangan — {{student.name}}",
    context: { student: "required", staff: "optional", recipient: "optional", recipientAddress: "optional" },
    manualFields: [
      { key: "manual.companyName", label: "Nama DUDI / perusahaan / instansi", type: "text", required: true },
      { key: "manual.pklPeriod", label: "Periode PKL", type: "text", required: true, placeholder: "Contoh: 1 Oktober 2026 s.d. 31 Maret 2027" },
      { key: "manual.notes", label: "Keterangan tambahan", type: "textarea", required: false },
    ],
    bodyHtml: `<p>Dengan hormat,</p>
<p>Dalam rangka pelaksanaan Praktik Kerja Lapangan (PKL) peserta didik {{school.name}}, bersama ini kami mengantar:</p>
<table><tbody>
<tr><td>Nama</td><td>: {{student.name}}</td></tr>
<tr><td>NIS / NISN</td><td>: {{student.nis}} / {{student.nisn}}</td></tr>
<tr><td>Rombel</td><td>: {{student.className}}</td></tr>
<tr><td>Program Keahlian</td><td>: {{student.department}}</td></tr>
</tbody></table>
<p>untuk melaksanakan PKL di <strong>{{manual.companyName}}</strong> pada periode <strong>{{manual.pklPeriod}}</strong>.</p>
{{#if staff.name}}<p>Guru pembimbing dari sekolah: <strong>{{staff.name}}</strong>.</p>{{/if}}
{{#if staff.nip}}<p>NIP guru pembimbing: {{staff.nip}}.</p>{{/if}}
{{#if manual.notes}}<p>{{manual.notes}}</p>{{/if}}
<p>Kami mengharapkan peserta didik tersebut dapat memperoleh bimbingan, pengalaman kerja, serta pembiasaan budaya kerja sesuai ketentuan yang berlaku di tempat PKL.</p>
<p>Atas kesempatan, bimbingan, dan kerja sama yang diberikan, kami ucapkan terima kasih.</p>`,
  },
  {
    code: "PARENT-CALL",
    name: "Surat Panggilan Orang Tua/Wali",
    category: "KESISWAAN",
    description: "Panggilan administratif orang tua/wali. Data siswa otomatis; alasan pertemuan hanya memuat konteks yang memang diperlukan.",
    subjectTemplate: "Panggilan Orang Tua/Wali — {{student.name}}",
    context: { student: "required", staff: "hidden", recipient: "hidden" },
    manualFields: [
      { key: "manual.meetingDate", label: "Tanggal pertemuan", type: "date", required: true },
      { key: "manual.meetingTime", label: "Waktu", type: "time", required: true },
      { key: "manual.location", label: "Tempat", type: "text", required: true, placeholder: "Contoh: Ruang BK / Ruang Wakasek Kesiswaan" },
      { key: "manual.purpose", label: "Keperluan pertemuan", type: "textarea", required: true, placeholder: "Tuliskan konteks pertemuan secara singkat dan proporsional." },
      { key: "manual.contactPerson", label: "Kontak / pihak yang ditemui", type: "text", required: false, placeholder: "Opsional" },
    ],
    bodyHtml: `<p>Dengan hormat,</p>
<p>Dalam rangka komunikasi dan koordinasi sekolah dengan orang tua/wali peserta didik, kami mengharapkan kehadiran Bapak/Ibu Orang Tua/Wali dari:</p>
<table><tbody>
<tr><td>Nama</td><td>: {{student.name}}</td></tr>
<tr><td>NIS / NISN</td><td>: {{student.nis}} / {{student.nisn}}</td></tr>
<tr><td>Rombel</td><td>: {{student.className}}</td></tr>
</tbody></table>
<p>untuk hadir pada:</p>
<table><tbody>
<tr><td>Tanggal</td><td>: {{manual.meetingDate}}</td></tr>
<tr><td>Waktu</td><td>: {{manual.meetingTime}}</td></tr>
<tr><td>Tempat</td><td>: {{manual.location}}</td></tr>
<tr><td>Keperluan</td><td>: {{manual.purpose}}</td></tr>
</tbody></table>
{{#if manual.contactPerson}}<p>Pihak sekolah yang dapat ditemui: {{manual.contactPerson}}.</p>{{/if}}
<p>Mengingat pentingnya pertemuan tersebut, kami sangat mengharapkan kehadiran Bapak/Ibu tepat pada waktunya. Atas perhatian dan kerja samanya, kami ucapkan terima kasih.</p>`,
  },
];

export const ADMINISTRATION_ALLOWED_VARIABLES = [
  "school.name", "school.npsn", "school.address", "school.city", "school.province", "school.phone", "school.email",
  "student.name", "student.nis", "student.nisn", "student.className", "student.department",
  "staff.name", "staff.nip", "staff.title", "staff.unitName",
  "principal.name", "principal.nip", "principal.title",
  "academicYear.yearName", "academicYear.semester",
  "document.number", "document.subject", "document.date", "document.recipientName", "document.recipientAddress",
] as const;
