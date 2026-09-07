export interface CurriculumSubjectPreset {
  name: string;
  category: "UMUM" | "KEJURUAN" | "MUATAN_LOKAL" | "PILIHAN";
  description: string;
}

export const KURIKULUM_MERDEKA_PRESETS: Record<"SD_MI" | "SMP_MTS" | "SMA_SMK", CurriculumSubjectPreset[]> = {
  SD_MI: [
    {
      name: "Pendidikan Agama dan Budi Pekerti",
      category: "UMUM",
      description: "Pembelajaran nilai-nilai keagamaan, akhlak mulia, dan budi pekerti luhur sesuai Kurikulum Merdeka Fase A/B/C.",
    },
    {
      name: "Pendidikan Pancasila",
      category: "UMUM",
      description: "Penanaman ideologi Pancasila, kewarganegaraan, dan kebinekaan global bagi peserta didik sekolah dasar.",
    },
    {
      name: "Bahasa Indonesia",
      category: "UMUM",
      description: "Pengembangan kemampuan literasi membaca, menulis, menyimak, dan berbicara dalam bahasa Indonesia.",
    },
    {
      name: "Matematika",
      category: "UMUM",
      description: "Pengembangan nalar logis, berhitung, pemecahan masalah kontekstual, dan literasi numerasi dasar.",
    },
    {
      name: "Ilmu Pengetahuan Alam dan Sosial (IPAS)",
      category: "UMUM",
      description: "Eksplorasi fenomena alam dan dinamika sosial lingkungan sekitar secara terintegrasi (Fase B & C).",
    },
    {
      name: "Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)",
      category: "UMUM",
      description: "Aktivitas jasmani, keterampilan gerak dasar, kebugaran raga, dan pola hidup sehat.",
    },
    {
      name: "Seni dan Budaya (Rupa / Musik / Tari / Teater)",
      category: "UMUM",
      description: "Apresiasi dan kreasi seni untuk mengasah kepekaan estetika dan ekspresi diri peserta didik.",
    },
    {
      name: "Bahasa Inggris",
      category: "PILIHAN",
      description: "Pengenalan komunikasi dasar bahasa internasional dalam situasi keseharian sekolah dasar.",
    },
    {
      name: "Muatan Lokal (Bahasa Daerah)",
      category: "MUATAN_LOKAL",
      description: "Pelestarian bahasa dan kebudayaan daerah setempat.",
    },
  ],

  SMP_MTS: [
    {
      name: "Pendidikan Agama dan Budi Pekerti",
      category: "UMUM",
      description: "Pembelajaran komprehensif keimanan, ketakwaan, toleransi, dan akhlak mulia jenjang SMP (Fase D).",
    },
    {
      name: "Pendidikan Pancasila",
      category: "UMUM",
      description: "Penerapan nilai Pancasila, hukum ketatanegaraan, UUD 1945, dan komitmen kebangsaan.",
    },
    {
      name: "Bahasa Indonesia",
      category: "UMUM",
      description: "Penguasaan literasi kritis, teks fiksi, teks informasi, pidato, dan ekspresi gagasan.",
    },
    {
      name: "Matematika",
      category: "UMUM",
      description: "Aljabar, geometri, analisis data & peluang, dan penalaran matematika tingkat lanjut.",
    },
    {
      name: "Ilmu Pengetahuan Alam (IPA)",
      category: "UMUM",
      description: "Penyelidikan saintifik mengenai makhluk hidup, materi zat, energi, dan tata surya.",
    },
    {
      name: "Ilmu Pengetahuan Sosial (IPS)",
      category: "UMUM",
      description: "Kajian geografi, dinamika sejarah bangsa, aktivitas ekonomi, dan sosiologi masyarakat.",
    },
    {
      name: "Bahasa Inggris",
      category: "UMUM",
      description: "Keterampilan komunikasi lisan dan tulisan dalam wacana interpersonal dan transaksional.",
    },
    {
      name: "Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)",
      category: "UMUM",
      description: "Peningkatan kebugaran jasmani, strategi permainan olahraga, dan kesehatan reproduksi.",
    },
    {
      name: "Informatika",
      category: "UMUM",
      description: "Berpikir komputasional, literasi digital, sistem komputer, dan dasar pemrograman.",
    },
    {
      name: "Seni dan Prakarya",
      category: "UMUM",
      description: "Eksplorasi karya seni visual/kerajinan tangan dan apresiasi kebudayaan nusantara.",
    },
    {
      name: "Muatan Lokal (Bahasa Daerah)",
      category: "MUATAN_LOKAL",
      description: "Pembinaan bahasa daerah untuk memperkuat jati diri kearifan lokal.",
    },
  ],

  SMA_SMK: [
    {
      name: "Pendidikan Agama dan Budi Pekerti",
      category: "UMUM",
      description: "Penguatan fondasi spiritualitas, etika moral, dan harmoni keberagamaan jenjang menengah.",
    },
    {
      name: "Pendidikan Pancasila",
      category: "UMUM",
      description: "Kajian konstitusi, wawasan nusantara, penegakan HAM, dan kepemimpinan berintegritas.",
    },
    {
      name: "Bahasa Indonesia",
      category: "UMUM",
      description: "Penulisan karya ilmiah, esai kritis, teks persuasif, dan apresiasi sastra Indonesia.",
    },
    {
      name: "Matematika (Umum)",
      category: "UMUM",
      description: "Fungsi, trigonometri, statistika analitis, dan kalkulus dasar.",
    },
    {
      name: "Bahasa Inggris",
      category: "UMUM",
      description: "Komunikasi profesional, presentasi akademik, dan literasi media berbahasa Inggris.",
    },
    {
      name: "Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)",
      category: "UMUM",
      description: "Manajemen kebugaran fisik, taktik olahraga beregu, dan pola hidup berkelanjutan.",
    },
    {
      name: "Sejarah",
      category: "UMUM",
      description: "Pemahaman kronologis sejarah kemerdekaan nasional dan peristiwa dunia kontemporer.",
    },
    {
      name: "Seni dan Budaya",
      category: "UMUM",
      description: "Apresiasi, kurasi, dan pameran karya seni kreatif generasi muda.",
    },
    {
      name: "Informatika / Dasar Kejuruan",
      category: "KEJURUAN",
      description: "Fondasi keilmuan teknologi informasi, komputasi, atau dasar program keahlian.",
    },
    {
      name: "Muatan Lokal",
      category: "MUATAN_LOKAL",
      description: "Kearifan lokal daerah dan kebudayaan daerah provinsi.",
    },
  ],
};
