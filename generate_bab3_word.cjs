const fs = require('fs');
const path = require('path');
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  ShadingType,
  convertInchesToTwip,
} = require('docx');

// Indonesian PKM standard styling:
// Font: Times New Roman, 12pt (size 24 in half-points)
// Spacing: 1.15 line spacing, 6pt after paragraph
// Margins: Left 4cm (2268 twips), Top 3cm (1701 twips), Right 3cm (1701 twips), Bottom 3cm (1701 twips)

function p(text, opts = {}) {
  const runs = Array.isArray(text)
    ? text
    : [new TextRun({ text, font: 'Times New Roman', size: 24, ...opts.runOpts })];
  return new Paragraph({
    alignment: opts.alignment || AlignmentType.JUSTIFIED,
    spacing: { line: 276, after: opts.after !== undefined ? opts.after : 120 }, // 1.15 line spacing = 276 (240 * 1.15)
    children: runs,
    ...opts.paraOpts,
  });
}

function run(text, opts = {}) {
  return new TextRun({
    text,
    font: 'Times New Roman',
    size: 24,
    ...opts,
  });
}

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    alignment: AlignmentType.CENTER,
    spacing: { before: 240, after: 180, line: 276 },
    children: [
      new TextRun({
        text,
        font: 'Times New Roman',
        size: 24,
        bold: true,
      }),
    ],
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    alignment: AlignmentType.LEFT,
    spacing: { before: 200, after: 120, line: 276 },
    children: [
      new TextRun({
        text,
        font: 'Times New Roman',
        size: 24,
        bold: true,
      }),
    ],
  });
}

function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    alignment: AlignmentType.LEFT,
    spacing: { before: 160, after: 100, line: 276 },
    children: [
      new TextRun({
        text,
        font: 'Times New Roman',
        size: 24,
        bold: true,
      }),
    ],
  });
}

function caption(text) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 80, after: 160, line: 276 },
    children: [
      new TextRun({
        text,
        font: 'Times New Roman',
        size: 22, // 11pt
        italics: true,
      }),
    ],
  });
}

// Diagram box representation in table style
function createDiagramBox(steps) {
  const cells = [];
  const colWidth = Math.floor(8800 / steps.length);
  const colWidths = steps.map(() => colWidth);

  const rowCells = steps.map((s, idx) => {
    return new TableCell({
      width: { size: colWidth, type: WidthType.DXA },
      shading: { fill: 'F1F5F9', type: ShadingType.CLEAR },
      margins: { top: 120, bottom: 120, left: 100, right: 100 },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 6, color: '001B3A' },
        bottom: { style: BorderStyle.SINGLE, size: 6, color: '001B3A' },
        left: { style: BorderStyle.SINGLE, size: 6, color: '001B3A' },
        right: { style: BorderStyle.SINGLE, size: 6, color: '001B3A' },
      },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { line: 240, after: 0 },
          children: [
            new TextRun({
              text: s.title,
              font: 'Times New Roman',
              size: 20,
              bold: true,
              color: '001B3A',
            }),
          ],
        }),
        ...(s.sub ? [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { line: 200, after: 0 },
            children: [
              new TextRun({
                text: s.sub,
                font: 'Times New Roman',
                size: 16,
                italics: true,
                color: '475569',
              }),
            ],
          })
        ] : []),
      ],
    });
  });

  return new Table({
    width: { size: 8800, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: [new TableRow({ children: rowCells })],
  });
}

// Table of 9 Modules
function createModulesTable() {
  const tableData = [
    { no: '1', name: 'Beranda (Dashboard)', desc: 'Ringkasan operasional harian: antrean pesanan aktif, pesanan harus selesai, pesanan terlambat, dan total pengerjaan, serta ringkasan keuangan (pendapatan kas tunai, omzet, piutang) dan pintasan status pengerjaan.' },
    { no: '2', name: 'Pelanggan', desc: 'Pendataan pelanggan (nama, nomor WhatsApp aktif, alamat dengan integrasi titik peta), pencarian instan, dan riwayat pesanan per pelanggan.' },
    { no: '3', name: 'Kasir dan Transaksi', desc: 'Pemilihan katalog layanan bertingkat (Main, Express, Additional, Other Services), penyesuaian kuantitas, catatan kondisi barang, opsi layanan antar-jemput, prioritas pengerjaan, pilihan aroma parfum, dan potongan promo.' },
    { no: '4', name: 'Manajemen Antrean Pengerjaan', desc: 'Pengelompokan pesanan berdasarkan tahapan kerja fisik (Cuci, Kering, Finishing) untuk memantau beban antrean di rak tanpa pembatasan kuota otomatis yang kaku.' },
    { no: '5', name: 'Estimasi dan Status', desc: 'Penentuan tanggal estimasi selesai pengerjaan berbasis durasi standar layanan, penyesuaian estimasi manual berargumen, serta pembaruan status bertahap: Antrian → Proses Cuci → Proses Kering → Finishing & QC → Siap Ambil → Selesai Diambil.' },
    { no: '6', name: 'Pembayaran Tunai & Nota', desc: 'Pencatatan pembayaran tunai (cash) secara langsung, penerbitan nota digital dinamis yang dapat dicetak langsung (format thermal slip), diunduh sebagai PDF dengan format garis lengkap, serta dibagikan via WhatsApp.' },
    { no: '7', name: 'Pelacakan Mandiri (Publik)', desc: 'Halaman pelacakan pesanan publik bagi pelanggan untuk memantau tahapan pengerjaan dan estimasi selesai secara real-time cukup dengan memasukkan kode pesanan tanpa perlu login.' },
    { no: '8', name: 'Laporan Keuangan & Layanan', desc: 'Rekapitulasi berkala pendapatan kas tunai, piutang tagihan belum lunas, perbandingan omzet harian/bulanan, dan daftar layanan terlaris.' },
    { no: '9', name: 'Pengaturan Outlet & Staf', desc: 'Konfigurasi profil toko/outlet, katalog harga dan durasi layanan, serta akun akses staf/karyawan.' },
  ];

  const colWidths = [600, 2600, 5600]; // sum = 8800 DXA

  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      new TableCell({
        width: { size: colWidths[0], type: WidthType.DXA },
        shading: { fill: '001B3A', type: ShadingType.CLEAR },
        margins: { top: 120, bottom: 120, left: 100, right: 100 },
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [run('No', { bold: true, color: 'FFFFFF' })] })],
      }),
      new TableCell({
        width: { size: colWidths[1], type: WidthType.DXA },
        shading: { fill: '001B3A', type: ShadingType.CLEAR },
        margins: { top: 120, bottom: 120, left: 100, right: 100 },
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [run('Modul Sistem', { bold: true, color: 'FFFFFF' })] })],
      }),
      new TableCell({
        width: { size: colWidths[2], type: WidthType.DXA },
        shading: { fill: '001B3A', type: ShadingType.CLEAR },
        margins: { top: 120, bottom: 120, left: 100, right: 100 },
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [run('Rancangan Fungsi & Kegunaan', { bold: true, color: 'FFFFFF' })] })],
      }),
    ],
  });

  const bodyRows = tableData.map((row, idx) => {
    const bgFill = idx % 2 === 0 ? 'FFFFFF' : 'F8FAFC';
    return new TableRow({
      children: [
        new TableCell({
          width: { size: colWidths[0], type: WidthType.DXA },
          shading: { fill: bgFill, type: ShadingType.CLEAR },
          margins: { top: 100, bottom: 100, left: 100, right: 100 },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [run(row.no)] })],
        }),
        new TableCell({
          width: { size: colWidths[1], type: WidthType.DXA },
          shading: { fill: bgFill, type: ShadingType.CLEAR },
          margins: { top: 100, bottom: 100, left: 100, right: 100 },
          children: [new Paragraph({ alignment: AlignmentType.LEFT, children: [run(row.name, { bold: true })] })],
        }),
        new TableCell({
          width: { size: colWidths[2], type: WidthType.DXA },
          shading: { fill: bgFill, type: ShadingType.CLEAR },
          margins: { top: 100, bottom: 100, left: 100, right: 100 },
          children: [new Paragraph({ alignment: AlignmentType.JUSTIFIED, children: [run(row.desc)] })],
        }),
      ],
    });
  });

  return new Table({
    width: { size: 8800, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: [headerRow, ...bodyRows],
  });
}

// Flowchart 3.2 Diagram table
function createServiceFlowTable() {
  const steps = [
    { title: '1. Penerimaan', desc: 'Pelanggan drop-off di toko atau order penjemputan. Kasir memilih/mendaftarkan kontak pelanggan.' },
    { title: '2. Pemilihan Layanan', desc: 'Kasir memilih varian layanan dari katalog resmi, mencatat kuantitas, opsi antar/jemput, parfum, & kondisi awal sepatu.' },
    { title: '3. Penentuan Estimasi', desc: 'Sistem menetapkan estimasi waktu selesai berdasarkan durasi standar pengerjaan paket layanan yang dipilih pelanggan.' },
    { title: '4. Pembayaran Tunai & Nota', desc: 'Konfirmasi total tagihan, pembayaran tunai (cash), dan penerbitan nota digital (cetak thermal, PDF bergaris resmi, & kirim link lacak via WhatsApp).' },
    { title: '5. Pengerjaan Bertahap', desc: 'Sepatu diproses sesuai tahapan: Antrian Masuk → Proses Cuci → Proses Kering → Finishing & QC.' },
    { title: '6. Notifikasi Siap Ambil', desc: 'Setelah selesai, status berganti "Siap Ambil". Sistem mengirim pesan notifikasi siap ambil ke WhatsApp pelanggan.' },
    { title: '7. Pengambilan & Selesai', desc: 'Pelanggan mengambil sepatu di toko atau diantar ke alamat. Transaksi selesai dan tersimpan rapi di rekap laporan.' },
  ];

  const colWidths = [1800, 7000];

  const rows = steps.map((s, idx) => {
    return new TableRow({
      children: [
        new TableCell({
          width: { size: colWidths[0], type: WidthType.DXA },
          shading: { fill: '001B3A', type: ShadingType.CLEAR },
          margins: { top: 100, bottom: 100, left: 100, right: 100 },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [run(s.title, { bold: true, color: 'FFFFFF', size: 20 })],
            }),
          ],
        }),
        new TableCell({
          width: { size: colWidths[1], type: WidthType.DXA },
          shading: { fill: idx % 2 === 0 ? 'F8FAFC' : 'FFFFFF', type: ShadingType.CLEAR },
          margins: { top: 100, bottom: 100, left: 100, right: 100 },
          children: [
            new Paragraph({
              alignment: AlignmentType.JUSTIFIED,
              children: [run(s.desc, { size: 22 })],
            }),
          ],
        }),
      ],
    });
  });

  return new Table({
    width: { size: 8800, type: WidthType.DXA },
    columnWidths: colWidths,
    rows,
  });
}

async function buildDoc() {
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: 'Times New Roman',
            size: 24, // 12pt
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1701,    // 3 cm
              bottom: 1701, // 3 cm
              left: 2268,   // 4 cm (standard PKM left margin)
              right: 1701,  // 3 cm
            },
          },
        },
        children: [
          h1('BAB 3. METODE PELAKSANAAN'),
          p(
            'Pelaksanaan program direncanakan selama empat bulan melalui dua bagian utama, yaitu metode pembuatan produk dan tahap-tahap pelaksanaan. Kegiatan berpusat pada perancangan dan pengembangan platform SoleCare, pengujian bersama mitra, pelatihan penggunaan, serta validasi pemasaran.'
          ),

          h2('3.1 Metode Pembuatan Produk'),
          p(
            'Pembuatan SoleCare menggunakan pendekatan pengembangan prototipe secara bertahap. Tim mengumpulkan kebutuhan mitra, menyusun rancangan alur dan antarmuka, membangun modul, menguji fungsi, lalu memperbaiki produk berdasarkan hasil uji dan masukan pengguna. Pendekatan iteratif ini memungkinkan tim menyesuaikan fitur dengan proses kerja mitra (Sommerville, 2016).'
          ),
          p(
            'SoleCare dirancang sebagai aplikasi web berbasis mobile-first yang dapat diakses melalui peramban (browser) ponsel pintar maupun komputer kasir tanpa memerlukan instalasi aplikasi tambahan. Rancangan antarmuka mengacu pada tata letak aplikasi kasir layanan jasa yang ergonomis, mengadopsi navigasi bawah (Beranda, Pesanan, tombol cepat buat transaksi, Laporan, dan Akun), sehingga pemilik dan karyawan mitra dapat beradaptasi dengan cepat tanpa kendala teknis.'
          ),
          p(
            'Bahan dan perlengkapan pendukung pengembangan serta uji coba meliputi alat tulis kantor, kertas label pesanan, kartu identitas sepatu, serta printer thermal mini untuk penerbitan nota transaksi fisik di meja kasir. Untuk kegiatan bantuan promosi mitra, tim menyiapkan template konten digital dan kalender publikasi terstruktur secara terpisah dari produk sistem SoleCare. Kebutuhan infrastruktur komputasi mencakup penyediaan nama domain kustom, web hosting berkinerja tinggi, basis data cloud yang terenkripsi, serta penyimpanan media berbasis cloud.'
          ),

          h3('3.1.1 Perancangan Produk'),
          p(
            'Tim melakukan observasi lapangan dan wawancara mendalam bersama pemilik serta staf operasional mitra untuk memetakan alur penerimaan pesanan, identifikasi material sepatu, pencatatan transaksi kasir, pengawasan tahapan pengerjaan, hingga prosedur penyerahan kembali barang kepada pelanggan. Hasil pemetaan kebutuhan operasional tersebut kemudian diterjemahkan ke dalam spesifikasi kebutuhan fungsional perangkat lunak, perancangan diagram alur pengguna (user flow), wireframe, dan prototipe mockup interaktif. Seluruh rancangan dikonsultasikan dan disetujui bersama mitra sebelum melangkah ke tahap pengodean (coding).'
          ),
          p(
            'Berdasarkan pemetaan kebutuhan mitra Soleful Soaks! Shoes Care, rancangan sistem SoleCare disusun ke dalam 9 modul fungsional utama sebagaimana disajikan pada Tabel 3.1.'
          ),

          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 140, after: 80 },
            children: [run('Tabel 3.1 Rancangan Modul Fungsional Platform SoleCare', { bold: true })],
          }),

          createModulesTable(),

          new Paragraph({ spacing: { after: 140 } }),

          h3('3.1.2 Pengembangan Produk'),
          p(
            'Pengembangan platform dilaksanakan secara bertahap (incremental) dengan memprioritaskan modul-modul vital operasional kasir, meliputi: modul pencatatan transaksi dan kasir, modul manajemen antrean pengerjaan harian, modul estimasi durasi selesai pengerjaan beserta pembaruan status pengerjaan, modul pembayaran tunai (cash) dan nota digital, serta modul pendataan pelanggan dan rekapitulasi laporan keuangan kasir. Setiap modul yang telah selesai dibangun melewati proses verifikasi unit test dan pengujian fungsional internal oleh tim pengembang sebelum diujicobakan secara langsung di gerai mitra.'
          ),
          p(
            'Katalog layanan pada modul kasir disinkronkan secara presisi dengan daftar harga dan durasi resmi Soleful Soaks! Shoes Care (mencakup Main Services, Express Services, Additional Services, dan Other Services). Struktur katalog dirancang dinamis sehingga pihak mitra dapat memperbarui tarif atau menambah varian perawatan khusus secara mandiri melalui menu Pengaturan tanpa harus mengubah kode sumber aplikasi.'
          ),
          p(
            'Secara berdampingan, tim juga melaksanakan pendampingan pemasaran digital bagi mitra dengan merancang template konten promosi visual dan kalender posting berkala pada akun media sosial mitra. Seluruh dokumentasi foto barang pelanggan yang digunakan dalam publikasi wajib memperoleh persetujuan terlebih dahulu demi menjaga privasi dan kenyamanan pelanggan.'
          ),

          h3('3.1.3 Pengujian dan Penyempurnaan'),
          p(
            'Pengujian fungsional platform SoleCare mencakup evaluasi skenario alur kerja nyata: pembuatan pesanan multi-layanan, pengelolaan antrean sepatu di rak gerai, penyesuaian tanggal estimasi selesai disertai alasan tertulis, pembaruan status pengerjaan bertahap, pembatalan pesanan melalui dialog konfirmasi aman, pencatatan transaksi pembayaran tunai secara langsung, pencetakan nota fisik thermal dan ekspor PDF dengan garis pembatas presisi, serta penelusuran riwayat pelanggan. Uji kegunaan (usability test) direncanakan menggunakan instrumen System Usability Scale (SUS) kepada pemilik, karyawan, dan perwakilan pelanggan dengan target perolehan skor minimal 68 sebagai batas kelayakan acceptable. Aspek keamanan data mencakup penerapan autentikasi berbasis sesi aman serta pembatasan hak akses (role-based access) agar data sensitif keuangan dan pelanggan terlindungi.'
          ),

          h2('3.2 Tahap-Tahap Pelaksanaan'),
          p(
            'Pelaksanaan program PKM-K SoleCare terbagi menjadi enam tahapan terstruktur yang saling berkesinambungan, sebagaimana divisualisasikan pada Gambar 3.1.'
          ),

          // Diagram Box Gambar 3.1
          createDiagramBox([
            { title: 'Tahap 1', sub: 'Persiapan & Perizinan' },
            { title: 'Tahap 2', sub: 'Perancangan Sistem' },
            { title: 'Tahap 3', sub: 'Pengembangan Modul' },
            { title: 'Tahap 4', sub: 'Pengujian & Revisi' },
            { title: 'Tahap 5', sub: 'Pelatihan Mitra' },
            { title: 'Tahap 6', sub: 'Pemasaran & Evaluasi' },
          ]),
          caption('Gambar 3.1 Diagram Tahapan Pelaksanaan Program SoleCare'),

          h3('3.2.1 Tahap Persiapan'),
          p(
            'Pada tahap persiapan, tim menyelesaikan kelengkapan administrasi program, penyusunan jadwal kerja terperinci, pengadaan alat dan bahan operasional, serta langganan layanan cloud hosting dan nama domain resmi. Tim membangun koordinasi formal bersama mitra Soleful Soaks! Shoes Care guna menyepakati kalender observasi, pengumpulan data baseline operasional (kapasitas cuci harian rata-rata, jenis layanan terpopuler, dan kendala pencatatan manual), serta penyusunan panduan wawancara. Lokasi observasi dan uji coba operasional berpusat di gerai Soleful Soaks! Shoes Care (Jl. Mampang Prapatan, Jakarta Selatan), sedangkan perancangan perangkat lunak dilaksanakan di ruang kerja/sekretariat tim pelaksana.'
          ),

          h3('3.2.2 Tahap Perancangan dan Pembuatan'),
          p(
            'Tim memetakan alur layanan yang sedang berjalan di gerai mitra, lalu merumuskan rancangan arsitektur sistem SoleCare. Setelah mitra meninjau dan menyetujui cetak biru antarmuka, tim merealisasikan rancangan ke dalam modul fungsional berbasis web secara bertahap. Alur pelayanan yang diintegrasikan oleh platform SoleCare dirancang transparan dan terukur dari awal hingga akhir, sebagaimana dirangkum pada Tabel 3.2.'
          ),

          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 140, after: 80 },
            children: [run('Tabel 3.2 Alur Layanan Operasional Soleful Soaks Terintegrasi Platform SoleCare', { bold: true })],
          }),

          createServiceFlowTable(),
          caption('Gambar 3.2 Bagan Alur Layanan Terintegrasi SoleCare'),

          h3('3.2.3 Tahap Pengemasan dan Pelatihan'),
          p(
            'Platform SoleCare dikemas secara profesional dengan identitas merek yang konsisten serta dilengkapi buku panduan operasional (user manual) dan Standar Operasional Prosedur (SOP) digital. Tim menyelenggarakan dua sesi pelatihan intensif bagi pemilik dan seluruh karyawan gerai, yakni: (1) Pelatihan operasional kasir dan sistem pengerjaan (pembuatan order, pembaruan status cuci/kering, pencatatan pembayaran tunai, serta pencetakan struk nota), dan (2) Pelatihan pengelolaan konten serta komunikasi digital via WhatsApp resmi. Tim juga menyusun katalog layanan resmi dalam format digital interaktif yang mencantumkan nama paket, deskripsi bahan penanganan, spesifikasi, harga, estimasi durasi hari pengerjaan, dan tautan cek status mandiri.'
          ),

          h3('3.2.4 Tahap Pemasaran'),
          p(
            'Strategi komersialisasi produk SoleCare difokuskan pada pengenalan platform kepada ekosistem UMKM jasa perawatan sepatu, tas, dan helm. Tim mengelola akun media sosial resmi SoleCare yang terbuka untuk publik guna membagikan materi edukasi digitalisasi UMKM, demonstrasi kemudahan fitur kasir, studi kasus peningkatan efisiensi operasional pada mitra, dan testimoni. Seluruh materi publikasi mematuhi pedoman identitas visual program PKM-K 2026, termasuk alokasi tiga konten unggulan bersponsor (promoted ads) sesuai jadwal resmi. Pemasaran B2B ke gerai cuci sepatu lainnya dilakukan melalui demonstrasi produk langsung, penyediaan paket uji coba gratis (free trial) selama 14 hari, dan penawaran skema berlangganan yang terjangkau bagi pelaku UMKM.'
          ),

          h3('3.2.5 Tahap Evaluasi dan Keberlanjutan'),
          p(
            'Evaluasi berkala dilakukan dengan membandingkan parameter performa mitra sebelum dan sesudah mengimplementasikan platform SoleCare. Target indikator keberhasilan program ditetapkan sebagai berikut:'
          ),

          p([
            run('1. ', { bold: true }),
            run('Penurunan tingkat penolakan pelanggan akibat antrean yang tidak terkelola, dari semula rata-rata 3 pelanggan per minggu menjadi maksimal 1 pelanggan per minggu.'),
          ], { paraOpts: { indent: { left: 720, hanging: 360 } } }),

          p([
            run('2. ', { bold: true }),
            run('Ketepatan waktu pengerjaan mencapai minimal 90% pesanan selesai sesuai tanggal estimasi otomatis yang tercantum pada nota pelanggan.'),
          ], { paraOpts: { indent: { left: 720, hanging: 360 } } }),

          p([
            run('3. ', { bold: true }),
            run('Skor evaluasi kegunaan sistem (SUS) dari pemilik, karyawan, dan pengguna mencapai minimal 68 (kategori Acceptable / Baik).'),
          ], { paraOpts: { indent: { left: 720, hanging: 360 } } }),

          p([
            run('4. ', { bold: true }),
            run('Publikasi konten promosi dan edukasi digital terlaksana secara konsisten minimal 3 kali per minggu selama masa periode aktif program.'),
          ], { paraOpts: { indent: { left: 720, hanging: 360 } } }),

          p([
            run('5. ', { bold: true }),
            run('Pemilik dan karyawan mitra mampu mengoperasikan seluruh fitur utama kasir dan alur status SoleCare secara mandiri tanpa supervisi tim pelaksana.'),
          ], { paraOpts: { indent: { left: 720, hanging: 360 } } }),

          p(
            'Seluruh rangkaian kegiatan, logbook kemajuan, hasil uji fungsional, dan rekonsiliasi keuangan dicatat secara berkala. Demi menjamin keberlanjutan pasca-program PKM, sistem SoleCare dirancang berbasis model langganan bulanan (Software-as-a-Service) yang sangat ekonomis bagi mitra. Pendapatan langganan tersebut dialokasikan untuk menutup biaya sewa server hosting, pemeliharaan basis data, dan pengembangan fitur baru di masa mendatang.'
          ),
        ],
      },
    ],
  });

  const outPath = path.join(__dirname, 'BAB_3_METODE_PELAKSANAAN_SOLECARE.docx');
  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(outPath, buffer);
  console.log('SUCCESS: Written to', outPath);
}

buildDoc().catch((err) => {
  console.error('ERROR:', err);
  process.exit(1);
});
