import { Link, router, usePage } from '@inertiajs/react';
import type { ComponentType, ReactNode, SVGProps } from 'react';
import { useEffect, useState } from 'react';
import {
    AlertIcon,
    ArrowDownTrayIcon,
    ArrowUpTrayIcon,
    BoxIcon,
    ChartIcon,
    ChevronDownIcon,
    ChevronRightIcon,
    ClipboardIcon,
    DatabaseIcon,
    HelpIcon,
    LaptopIcon,
    BanIcon,
} from '@/components/icons';
import { startGuidedTour } from '@/components/guided-tour';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { SearchInput } from '@/components/ui/search-input';
import { Switch } from '@/components/ui/switch';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';
import { preference as guidePreference } from '@/routes/guide';
import { index as assetsIndex } from '@/routes/assets';
import { index as itemsIndex } from '@/routes/items';
import { index as employeesIndex } from '@/routes/master/employees';
import { index as reportsIndex } from '@/routes/reports';
import { index as stockChecksIndex } from '@/routes/stock-opnames';
import { index as transactionsIndex } from '@/routes/transactions';
import { create as incomingCreate } from '@/routes/transactions/incoming';
import { create as outgoingCreate } from '@/routes/transactions/outgoing';

type Step = { title: string; body: ReactNode };

type GuideSection = {
    id: string;
    title: string;
    summary: string;
    icon: ComponentType<SVGProps<SVGSVGElement>>;
    tone: 'brand' | 'green' | 'amber' | 'red' | 'violet';
    adminOnly?: boolean;
    link?: { label: string; href: string };
    steps: Step[];
    tips?: string[];
};

const tones = {
    brand: 'bg-brand-50 text-brand-700',
    green: 'bg-ok/10 text-ok',
    amber: 'bg-service/10 text-service',
    red: 'bg-low/10 text-low',
    violet: 'bg-[#f1ecfb] text-[#6d3fc4]',
};

function Term({ children }: { children: ReactNode }) {
    return <strong className="font-semibold text-ink-900">{children}</strong>;
}

const sections: GuideSection[] = [
    {
        id: 'mengenal',
        title: 'Mengenal InventarisInvesta',
        summary:
            'Dua jenis barang yang dicatat, dan siapa saja yang bisa memakai aplikasi.',
        icon: HelpIcon,
        tone: 'brand',
        link: { label: 'Buka Beranda', href: dashboard.url() },
        steps: [
            {
                title: 'Perlengkapan Kantor',
                body: (
                    <>
                        Barang yang <Term>habis dipakai</Term> dan dihitung
                        jumlahnya, misalnya kalender, gantungan kunci, kertas,
                        dan tinta. Stoknya bertambah lewat Barang Masuk dan
                        berkurang lewat Barang Keluar.
                    </>
                ),
            },
            {
                title: 'Peralatan Kantor',
                body: (
                    <>
                        Barang yang <Term>dipakai, bukan dihabiskan</Term>,
                        dicatat per unit dengan kode seperti
                        INVESTA-PRL-2025-ITE-LPT-001. Contohnya laptop yang
                        dipegang karyawan atau printer di sebuah ruangan.
                    </>
                ),
            },
            {
                title: 'Peran pengguna',
                body: (
                    <>
                        <Term>Sekretaris</Term> mencatat barang masuk/keluar,
                        peralatan, dan cek stok, serta melihat laporan.{' '}
                        <Term>Admin</Term> bisa semua itu, ditambah mengelola
                        Master Data, membatalkan transaksi, dan menghapuskan
                        aset. Admin juga bisa memberi Sekretaris tertentu akses
                        tambahan, misalnya menambah atau menghapus barang.
                    </>
                ),
            },
            {
                title: 'Stok tidak diketik langsung',
                body: 'Angka stok selalu dihitung dari catatan transaksi. Kalau stok terasa salah, cari transaksinya di kartu stok, lalu batalkan atau koreksi lewat Cek Stok.',
            },
        ],
    },
    {
        id: 'barang-masuk',
        title: 'Mencatat barang masuk',
        summary: 'Saat barang datang dari toko atau supplier.',
        icon: ArrowDownTrayIcon,
        tone: 'green',
        link: { label: 'Catat barang masuk', href: incomingCreate.url() },
        steps: [
            {
                title: 'Buka form Barang Masuk',
                body: 'Dari Beranda, Daftar Barang, atau Riwayat Transaksi, klik tombol Barang Masuk.',
            },
            {
                title: 'Isi tanggal dan supplier',
                body: 'Ketik nama toko atau supplier. Kalau sudah pernah dipakai, pilih dari saran yang muncul. Nama baru otomatis tersimpan.',
            },
            {
                title: 'Lampirkan foto nota (opsional)',
                body: 'Klik area foto nota untuk memilih file atau memotret langsung dari HP.',
            },
            {
                title: 'Tambahkan barang',
                body: (
                    <>
                        Ketik nama barang di kolom pencarian lalu pilih. Barang
                        yang belum terdaftar bisa ditambahkan lewat pilihan{' '}
                        <Term>"Tambah barang baru"</Term>. Kotak{' '}
                        <Term>Foto</Term> di setiap baris bisa diisi foto
                        barang.
                    </>
                ),
            },
            {
                title: 'Isi jumlah dan harga',
                body: (
                    <>
                        Isi jumlah dan harga satuan. <Term>Subtotal</Term> boleh
                        diketik langsung sesuai angka di nota. Klik ikon putar
                        di sampingnya untuk kembali ke hitungan otomatis.
                    </>
                ),
            },
            {
                title: 'Simpan',
                body: 'Stok langsung bertambah dan harga rata-rata ikut diperbarui.',
            },
        ],
        tips: [
            'Beli barang yang sama dari toko berbeda? Catat sebagai dua transaksi terpisah, satu untuk setiap nota. Harga rata-ratanya menyesuaikan otomatis.',
        ],
    },
    {
        id: 'barang-keluar',
        title: 'Mencatat barang keluar',
        summary: 'Saat ada karyawan yang mengambil barang dari gudang.',
        icon: ArrowUpTrayIcon,
        tone: 'brand',
        link: { label: 'Catat barang keluar', href: outgoingCreate.url() },
        steps: [
            {
                title: 'Pilih penerima',
                body: (
                    <>
                        Ketik nama karyawan. Kalau belum terdaftar, pilih{' '}
                        <Term>"Tambah karyawan baru"</Term>. Cukup nama, dan
                        divisinya boleh dikosongkan dulu.
                    </>
                ),
            },
            {
                title: 'Tulis keperluannya',
                body: 'Misalnya "Hampers klien PT Andalas" atau "Operasional kantor". Ini membantu saat membaca laporan.',
            },
            {
                title: 'Tambahkan barang dan jumlahnya',
                body: 'Sisa stok terlihat di setiap baris. Kalau jumlahnya melebihi sisa stok, baris akan berwarna merah dan tidak bisa disimpan.',
            },
            {
                title: 'Simpan',
                body: 'Stok langsung berkurang. Kalau ada barang yang jadi di bawah stok minimum, lonceng di pojok kanan atas akan menyala.',
            },
        ],
    },
    {
        id: 'batal-transaksi',
        title: 'Memperbaiki transaksi yang salah',
        summary: 'Transaksi tidak diedit, tapi dibatalkan lalu dicatat ulang.',
        icon: BanIcon,
        tone: 'red',
        adminOnly: true,
        link: {
            label: 'Buka riwayat transaksi',
            href: transactionsIndex.url(),
        },
        steps: [
            {
                title: 'Cari transaksinya',
                body: 'Buka Transaksi, lalu cari berdasarkan nomor, nama barang, atau penerima.',
            },
            {
                title: 'Batalkan dengan alasan',
                body: 'Klik transaksinya, lalu Batalkan transaksi, dan tulis alasannya. Hanya Admin atau pengguna yang diberi akses membatalkan transaksi yang bisa melakukannya.',
            },
            {
                title: 'Catat ulang yang benar',
                body: 'Buat transaksi baru dengan data yang benar. Transaksi yang dibatalkan tetap terlihat dicoret di kartu stok sebagai jejak.',
            },
        ],
        tips: [
            'Pembatalan ditolak kalau membuat stok jadi minus, misalnya membatalkan barang masuk yang barangnya sudah terpakai.',
        ],
    },
    {
        id: 'stok',
        title: 'Melihat stok dan kartu stok',
        summary:
            'Memantau sisa barang, barang yang hampir habis, dan riwayatnya.',
        icon: BoxIcon,
        tone: 'brand',
        link: { label: 'Buka daftar barang', href: itemsIndex.url() },
        steps: [
            {
                title: 'Status stok',
                body: (
                    <>
                        <Term>Aman</Term> berarti stok di atas batas minimum,{' '}
                        <Term>Menipis</Term> berarti sudah sampai batas minimum,
                        dan <Term>Habis</Term> berarti stoknya 0.
                    </>
                ),
            },
            {
                title: 'Kartu stok',
                body: 'Klik nama barang untuk melihat semua barang masuk dan keluar beserta saldo setelah setiap transaksi.',
            },
            {
                title: 'Notifikasi stok rendah',
                body: 'Lonceng menyala untuk barang yang menipis atau habis. Notifikasi bisa dimatikan per barang lewat tombol di halaman detail barang.',
            },
        ],
    },
    {
        id: 'cek-stok',
        title: 'Cek stok gudang',
        summary:
            'Menghitung fisik barang lalu mencocokkannya dengan catatan di sistem.',
        icon: ClipboardIcon,
        tone: 'amber',
        link: { label: 'Mulai cek stok', href: stockChecksIndex.url() },
        steps: [
            {
                title: 'Mulai cek stok',
                body: 'Pilih semua barang atau satu kategori saja. Sistem membuat lembar hitung yang diurutkan per rak.',
            },
            {
                title: 'Hitung dan isi jumlah fisiknya',
                body: (
                    <>
                        Isi jumlah yang benar-benar ada di gudang. Untuk barang
                        yang jumlahnya sama, klik <Term>Cocok</Term>.
                    </>
                ),
            },
            {
                title: 'Tulis alasan selisih',
                body: 'Kalau jumlahnya berbeda, tulis alasannya, misalnya rusak, hilang, atau lupa dicatat.',
            },
            {
                title: 'Simpan draf atau selesaikan',
                body: 'Draf bisa dilanjutkan kapan saja. Setelah diselesaikan, stok sistem disesuaikan otomatis dan lembar hitung dikunci.',
            },
        ],
        tips: [
            'Lakukan cek stok rutin, misalnya sebulan sekali, supaya selisih cepat ketahuan.',
        ],
    },
    {
        id: 'aset',
        title: 'Mengelola peralatan',
        summary:
            'Mencatat siapa yang memegang laptop, printer, dan peralatan lainnya.',
        icon: LaptopIcon,
        tone: 'violet',
        link: { label: 'Buka daftar peralatan', href: assetsIndex.url() },
        steps: [
            {
                title: 'Tambah peralatan',
                body: 'Klik Tambah Peralatan dan isi datanya. Kode peralatan dibuat otomatis, dan statusnya Tersedia.',
            },
            {
                title: 'Serahkan atau pindahkan',
                body: 'Di halaman peralatan, klik Serahkan, lalu pilih karyawan atau ruangan. Untuk memindahkan, klik Pindahkan; catatan pengembalian dari pemegang lama dibuat otomatis.',
            },
            {
                title: 'Kembalikan',
                body: 'Saat peralatan dikembalikan, pilih kondisinya: Baik, Perlu servis, atau Rusak.',
            },
            {
                title: 'Servis',
                body: 'Klik Kirim servis dan tulis keluhannya. Setelah selesai, klik Selesai servis dan isi biayanya.',
            },
            {
                title: 'Hapuskan',
                body: 'Untuk peralatan yang dijual, dibuang, atau hilang. Datanya tetap tersimpan dengan status Dihapuskan.',
            },
        ],
    },
    {
        id: 'laporan',
        title: 'Membuat laporan',
        summary: 'Rekap untuk atasan atau bagian keuangan.',
        icon: ChartIcon,
        tone: 'green',
        link: { label: 'Buka laporan', href: reportsIndex.url() },
        steps: [
            {
                title: 'Pilih jenis laporan',
                body: 'Ringkasan, Mutasi Barang, Pemakaian per Divisi, Nilai Perlengkapan, atau Peralatan per Pemegang.',
            },
            {
                title: 'Pilih periode',
                body: 'Bulan ini, bulan lalu, 3 bulan terakhir, tahun ini, atau tanggal sendiri.',
            },
            {
                title: 'Unduh atau cetak',
                body: (
                    <>
                        <Term>Unduh Excel</Term> menghasilkan file .xlsx yang
                        rapi. <Term>Cetak / PDF</Term> membuka dokumen siap
                        cetak; pilih "Simpan sebagai PDF" di jendela cetak untuk
                        mendapatkan file PDF.
                    </>
                ),
            },
        ],
    },
    {
        id: 'master-data',
        title: 'Master Data',
        summary: 'Data dasar yang dipakai di seluruh aplikasi.',
        icon: DatabaseIcon,
        tone: 'brand',
        adminOnly: true,
        link: { label: 'Buka master data', href: employeesIndex.url() },
        steps: [
            {
                title: 'Karyawan dan divisi',
                body: 'Lengkapi divisi karyawan yang ditambahkan langsung dari form. Karyawan yang keluar cukup dinonaktifkan supaya riwayatnya tetap ada.',
            },
            {
                title: 'Ruangan dan supplier',
                body: 'Ruangan dipakai sebagai pemegang peralatan bersama. Data supplier bisa dilengkapi dengan nomor telepon dan alamat.',
            },
            {
                title: 'Kategori',
                body: 'Kode kategori menjadi awalan kode barang dan aset. Kode kategori aset dapat diubah saat menambah aset; kode aset lama tetap sama.',
            },
            {
                title: 'Pengguna',
                body: 'Tambah akun Admin atau Sekretaris dan reset kata sandi. Untuk Sekretaris, centang akses tambahan yang boleh dipakainya. Harus selalu ada minimal satu Admin.',
            },
        ],
    },
];

const faqs: { question: string; answer: string }[] = [
    {
        question:
            'Stok di sistem berbeda dengan di gudang, apa yang harus dilakukan?',
        answer: 'Lakukan Cek Stok. Isi jumlah fisiknya beserta alasan selisih, lalu selesaikan. Stok sistem akan disesuaikan dan alasannya tercatat di kartu stok.',
    },
    {
        question: 'Saya lupa mencatat barang keluar kemarin.',
        answer: 'Catat sekarang di form Barang Keluar dan pilih tanggal kemarin. Tanggal boleh mundur, tapi tidak boleh melewati hari ini.',
    },
    {
        question: 'Salah memasukkan jumlah, bisa diedit?',
        answer: 'Tidak bisa diedit supaya jejaknya tetap ada. Minta Admin (atau rekan yang diberi akses membatalkan) membatalkan transaksi tersebut, lalu catat ulang dengan jumlah yang benar.',
    },
    {
        question: 'Ada karyawan baru yang mengambil barang.',
        answer: 'Ketik namanya di kolom penerima lalu pilih "Tambah karyawan baru". Admin bisa melengkapi divisinya nanti di Master Data.',
    },
    {
        question: 'Karyawan resign, laptopnya bagaimana?',
        answer: 'Buka peralatan laptopnya lalu klik Kembalikan. Setelah itu Admin bisa menonaktifkan karyawan tersebut di Master Data.',
    },
    {
        question: 'Bagaimana cara mengganti kata sandi atau email saya?',
        answer: 'Buka Pengaturan di menu kiri. Untuk mengganti kata sandi, masukkan kata sandi sekarang lalu kata sandi baru. Kalau lupa kata sandi, minta Admin mengaturnya ulang di Master Data → Pengguna.',
    },
    {
        question: 'Kenapa lonceng terus menyala untuk barang tertentu?',
        answer: 'Stok barang itu sudah di bawah batas minimum. Tambah stoknya lewat Barang Masuk, atau matikan notifikasinya di halaman detail barang kalau memang tidak perlu dipantau.',
    },
];

export default function Guide() {
    const { canAccessMasterData, user } = usePage().props.auth;
    const [showOnLogin, setShowOnLogin] = useState(
        user?.show_guide_on_login ?? true,
    );
    const [search, setSearch] = useState('');
    const [activeId, setActiveId] = useState(sections[0].id);

    const normalized = search.trim().toLowerCase();
    const visibleSections = sections.filter(
        (section) =>
            !normalized ||
            [
                section.title,
                section.summary,
                ...section.steps.map((step) =>
                    typeof step.body === 'string' ? step.body : '',
                ),
                ...section.steps.map((step) => step.title),
                ...(section.tips ?? []),
            ]
                .join(' ')
                .toLowerCase()
                .includes(normalized),
    );
    const visibleFaqs = faqs.filter(
        (faq) =>
            !normalized ||
            `${faq.question} ${faq.answer}`.toLowerCase().includes(normalized),
    );

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                const visible = entries.find((entry) => entry.isIntersecting);

                if (visible) {
                    setActiveId(visible.target.id);
                }
            },
            { rootMargin: '-20% 0px -70% 0px' },
        );

        document
            .querySelectorAll('[data-guide-section]')
            .forEach((element) => observer.observe(element));

        return () => observer.disconnect();
    }, [normalized]);

    return (
        <AppLayout
            title="Panduan"
            breadcrumbs={[
                { title: 'Beranda', href: dashboard.url() },
                { title: 'Panduan' },
            ]}
        >
            <PageHeader
                title="Panduan Pemakaian"
                description="Langkah-langkah singkat untuk setiap fitur. Pilih topik di kiri, atau cari yang ingin diketahui."
                actions={
                    <Button
                        icon={<HelpIcon className="size-[18px]" />}
                        onClick={startGuidedTour}
                    >
                        Mulai tur aplikasi
                    </Button>
                }
            />

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/70 px-5 py-3.5">
                <span className="text-sm text-ink-500">
                    Tur menyorot setiap menu dan menjelaskan kegunaannya.
                </span>
                <Switch
                    id="guide-on-login"
                    label="Tawarkan tur setiap kali saya login"
                    checked={showOnLogin}
                    onChange={(checked) => {
                        setShowOnLogin(checked);
                        router.patch(
                            guidePreference.url(),
                            { show_guide_on_login: checked },
                            { preserveScroll: true, preserveState: true },
                        );
                    }}
                />
            </div>

            <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
                <aside className="flex flex-col gap-3 lg:sticky lg:top-4">
                    <SearchInput
                        id="guide-search"
                        label="Cari di panduan"
                        value={search}
                        onChange={setSearch}
                        placeholder="Cari, misal: batal"
                        className="sm:w-full"
                    />
                    <nav
                        aria-label="Topik panduan"
                        className="hidden flex-col gap-0.5 rounded-2xl bg-white/70 p-2 lg:flex"
                    >
                        {visibleSections.map((section) => (
                            <a
                                key={section.id}
                                href={`#${section.id}`}
                                className={cn(
                                    'flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-colors',
                                    activeId === section.id
                                        ? 'bg-white font-semibold text-brand-700 shadow-sm'
                                        : 'text-ink-700 hover:bg-white/80',
                                )}
                            >
                                <section.icon className="size-4 shrink-0" />
                                <span className="truncate">
                                    {section.title}
                                </span>
                            </a>
                        ))}
                        {visibleFaqs.length > 0 && (
                            <a
                                href="#tanya-jawab"
                                className={cn(
                                    'flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-colors',
                                    activeId === 'tanya-jawab'
                                        ? 'bg-white font-semibold text-brand-700 shadow-sm'
                                        : 'text-ink-700 hover:bg-white/80',
                                )}
                            >
                                <AlertIcon className="size-4 shrink-0" />
                                Tanya jawab
                            </a>
                        )}
                    </nav>
                </aside>

                <div className="flex min-w-0 flex-col gap-5">
                    {visibleSections.length === 0 &&
                        visibleFaqs.length === 0 && (
                            <div className="rounded-2xl bg-white px-6 py-12 text-center text-sm text-ink-500">
                                Tidak ada panduan yang cocok dengan "{search}".
                            </div>
                        )}

                    {visibleSections.map((section) => (
                        <section
                            key={section.id}
                            id={section.id}
                            data-guide-section
                            className="scroll-mt-6 rounded-2xl border border-white bg-white shadow-[0_1px_2px_rgba(18,24,38,0.04),0_8px_24px_-12px_rgba(18,24,38,0.08)]"
                        >
                            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-ink-100 px-6 py-5">
                                <div className="flex items-start gap-3.5">
                                    <span
                                        className={cn(
                                            'flex size-11 shrink-0 items-center justify-center rounded-2xl',
                                            tones[section.tone],
                                        )}
                                    >
                                        <section.icon className="size-5" />
                                    </span>
                                    <div className="flex flex-col gap-0.5">
                                        <h2 className="flex flex-wrap items-center gap-2 text-lg font-semibold text-ink-900">
                                            {section.title}
                                            {section.adminOnly && (
                                                <span className="rounded-md bg-ink-100 px-2 py-0.5 text-[11px] font-semibold text-ink-700">
                                                    Admin / akses tambahan
                                                </span>
                                            )}
                                        </h2>
                                        <p className="text-sm text-ink-500">
                                            {section.summary}
                                        </p>
                                    </div>
                                </div>
                                {section.link &&
                                    (!section.adminOnly ||
                                        canAccessMasterData) && (
                                        <Link
                                            href={section.link.href}
                                            className="inline-flex items-center gap-1 rounded-xl bg-brand-50 px-3.5 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-100"
                                        >
                                            {section.link.label}
                                            <ChevronRightIcon className="size-4" />
                                        </Link>
                                    )}
                            </div>

                            <ol className="flex flex-col px-6 py-5">
                                {section.steps.map((step, index) => (
                                    <li key={step.title} className="flex gap-4">
                                        <div className="flex flex-col items-center">
                                            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-700 text-xs font-bold text-white">
                                                {index + 1}
                                            </span>
                                            {index <
                                                section.steps.length - 1 && (
                                                <span className="w-px flex-1 bg-ink-200" />
                                            )}
                                        </div>
                                        <div
                                            className={cn(
                                                'flex flex-col gap-1 pt-0.5',
                                                index <
                                                    section.steps.length - 1 &&
                                                    'pb-5',
                                            )}
                                        >
                                            <h3 className="text-[15px] font-semibold text-ink-900">
                                                {step.title}
                                            </h3>
                                            <p className="max-w-2xl text-sm leading-relaxed text-ink-700">
                                                {step.body}
                                            </p>
                                        </div>
                                    </li>
                                ))}
                            </ol>

                            {section.tips && (
                                <div className="mx-6 mb-5 flex flex-col gap-2 rounded-xl bg-service/[0.08] px-4 py-3">
                                    {section.tips.map((tip) => (
                                        <p
                                            key={tip}
                                            className="flex gap-2.5 text-sm text-[#7c3a0a]"
                                        >
                                            <span className="font-semibold">
                                                Tips:
                                            </span>
                                            {tip}
                                        </p>
                                    ))}
                                </div>
                            )}
                        </section>
                    ))}

                    {visibleFaqs.length > 0 && (
                        <section
                            id="tanya-jawab"
                            data-guide-section
                            className="scroll-mt-6 rounded-2xl border border-white bg-white shadow-[0_1px_2px_rgba(18,24,38,0.04),0_8px_24px_-12px_rgba(18,24,38,0.08)]"
                        >
                            <div className="border-b border-ink-100 px-6 py-5">
                                <h2 className="text-lg font-semibold text-ink-900">
                                    Tanya jawab
                                </h2>
                                <p className="text-sm text-ink-500">
                                    Masalah yang sering ditemui sehari-hari.
                                </p>
                            </div>
                            <div className="divide-y divide-ink-100">
                                {visibleFaqs.map((faq) => (
                                    <details
                                        key={faq.question}
                                        className="group px-6"
                                    >
                                        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-[15px] font-medium text-ink-900 [&::-webkit-details-marker]:hidden">
                                            {faq.question}
                                            <ChevronDownIcon className="size-5 shrink-0 text-ink-400 transition-transform group-open:rotate-180" />
                                        </summary>
                                        <p className="max-w-2xl pb-4 text-sm leading-relaxed text-ink-700">
                                            {faq.answer}
                                        </p>
                                    </details>
                                ))}
                            </div>
                        </section>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
