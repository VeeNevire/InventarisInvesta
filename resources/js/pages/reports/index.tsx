import { Link, router } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import {
    ArrowDownTrayIcon,
    ArrowUpTrayIcon,
    BoxIcon,
    ClipboardIcon,
    DoorIcon,
    UserIcon,
} from '@/components/icons';
import { buttonClasses } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Select } from '@/components/ui/select';
import { StatCard } from '@/components/ui/stat-card';
import { Switch } from '@/components/ui/switch';
import AppLayout from '@/layouts/app-layout';
import {
    formatDate,
    formatNumber,
    formatRupiah,
    formatRupiahCompact,
} from '@/lib/format';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';
import {
    exportMethod as reportExport,
    index as reportsIndex,
    print as reportPrint,
} from '@/routes/reports';

type ReportKey = 'ringkasan' | 'mutasi' | 'pemakaian' | 'persediaan' | 'aset';

type Usage = {
    divisions: {
        name: string;
        value: number;
        transactions: number;
        employees: number;
    }[];
    employees: {
        name: string;
        division: string;
        value: number;
        transactions: number;
    }[];
    top_items: {
        name: string;
        unit: string;
        quantity: number;
        value: number;
    }[];
    total: number;
};

type MovementRow = {
    code: string;
    name: string;
    category: string;
    unit: string;
    opening: number;
    incoming: number;
    outgoing: number;
    adjustment: number;
    closing: number;
    outgoing_value: number;
};

type InventoryValue = {
    categories: { name: string; items: number; value: number }[];
    items: {
        code: string;
        name: string;
        category: string;
        unit: string;
        stock: number;
        average_price: number;
        value: number;
    }[];
    total: number;
};

type AssetsByHolder = {
    holders: {
        type: 'employee' | 'room';
        name: string;
        detail: string | null;
        assets: {
            code: string;
            name: string;
            category: string;
            since: string | null;
            price: number;
        }[];
        value: number;
    }[];
    unassigned: {
        code: string;
        name: string;
        category: string;
        status: string;
        price: number;
    }[];
    status_counts: Record<string, number>;
    total_value: number;
};

type Summary = {
    incoming_value: number;
    outgoing_value: number;
    adjustment_value: number;
    incoming_count: number;
    outgoing_count: number;
    adjustment_count: number;
    inventory_value: number;
    item_count: number;
    low_stock_count: number;
};

type ReportsProps = {
    report: ReportKey;
    period: { from: string; to: string };
    today: string;
    data:
        | { summary: Summary; usage: Usage }
        | { rows: MovementRow[] }
        | Usage
        | InventoryValue
        | AssetsByHolder;
};

const reports: { key: ReportKey; title: string; description: string }[] = [
    {
        key: 'ringkasan',
        title: 'Ringkasan',
        description: 'Gambaran singkat gudang dalam periode ini',
    },
    {
        key: 'mutasi',
        title: 'Mutasi Barang',
        description: 'Stok awal, masuk, keluar, dan stok akhir tiap barang',
    },
    {
        key: 'pemakaian',
        title: 'Pemakaian per Divisi',
        description:
            'Siapa dan divisi mana yang paling banyak mengambil barang',
    },
    {
        key: 'persediaan',
        title: 'Nilai Persediaan',
        description: 'Nilai barang yang ada di gudang hari ini',
    },
    {
        key: 'aset',
        title: 'Aset per Pemegang',
        description: 'Aset yang sedang dipegang karyawan dan ruangan',
    },
];

const periodicReports: ReportKey[] = ['ringkasan', 'mutasi', 'pemakaian'];

export default function Reports({ report, period, today, data }: ReportsProps) {
    const current = reports.find((item) => item.key === report) ?? reports[0];
    const usesPeriod = periodicReports.includes(report);

    function visit(changes: {
        laporan?: ReportKey;
        dari?: string;
        sampai?: string;
    }) {
        router.get(
            reportsIndex.url(),
            {
                laporan: changes.laporan ?? report,
                dari: changes.dari ?? period.from,
                sampai: changes.sampai ?? period.to,
            },
            { preserveScroll: true, preserveState: true, replace: true },
        );
    }

    const printUrl = reportPrint.url(report, {
        query: { dari: period.from, sampai: period.to },
    });
    const exportUrl = reportExport.url(report, {
        query: { dari: period.from, sampai: period.to },
    });

    return (
        <AppLayout
            title={`Laporan ${current.title}`}
            breadcrumbs={[
                { title: 'Beranda', href: dashboard.url() },
                { title: 'Laporan' },
            ]}
        >
            <div className="hidden print:block">
                <p className="text-sm font-semibold text-ink-500">
                    InventarisInvesta
                </p>
                <h1 className="text-2xl font-semibold text-ink-900">
                    Laporan {current.title}
                </h1>
                <p className="text-sm text-ink-500">
                    {usesPeriod
                        ? `Periode ${formatDate(period.from)} s.d. ${formatDate(period.to)}`
                        : `Per ${formatDate(today)}`}
                </p>
            </div>

            <div className="print:hidden">
                <PageHeader
                    title="Laporan"
                    description="Rekap gudang untuk atasan atau keuangan. Bisa diunduh untuk Excel atau dicetak sebagai PDF."
                    actions={
                        <>
                            <a
                                href={exportUrl}
                                className={buttonClasses('outline')}
                            >
                                <ArrowDownTrayIcon className="size-[18px]" />
                                Unduh Excel
                            </a>
                            <a
                                href={printUrl}
                                target="_blank"
                                rel="noreferrer"
                                className={buttonClasses()}
                            >
                                <ClipboardIcon className="size-[18px]" />
                                Cetak / PDF
                            </a>
                        </>
                    }
                />
            </div>

            <div className="flex flex-col gap-4 print:hidden">
                <nav
                    aria-label="Jenis laporan"
                    className="flex gap-1 overflow-x-auto rounded-2xl bg-white/70 p-1.5"
                >
                    {reports.map((item) => (
                        <Link
                            key={item.key}
                            href={reportsIndex.url({
                                query: {
                                    laporan: item.key,
                                    dari: period.from,
                                    sampai: period.to,
                                },
                            })}
                            preserveScroll
                            aria-current={
                                item.key === report ? 'page' : undefined
                            }
                            className={cn(
                                'rounded-xl px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors',
                                item.key === report
                                    ? 'bg-white text-brand-700 shadow-sm ring-1 ring-brand-100'
                                    : 'text-ink-500 hover:bg-white/80 hover:text-ink-900',
                            )}
                        >
                            {item.title}
                        </Link>
                    ))}
                </nav>

                <div className="flex flex-wrap items-end justify-between gap-4">
                    <div className="flex flex-col gap-0.5">
                        <h2 className="text-lg font-semibold text-ink-900">
                            {current.title}
                        </h2>
                        <p className="text-sm text-ink-500">
                            {current.description}
                        </p>
                    </div>
                    {usesPeriod ? (
                        <PeriodFilter
                            period={period}
                            today={today}
                            onChange={(dari, sampai) => visit({ dari, sampai })}
                        />
                    ) : (
                        <span className="rounded-xl bg-white px-3.5 py-2.5 text-sm text-ink-500">
                            Data per hari ini, {formatDate(today)}
                        </span>
                    )}
                </div>
            </div>

            {report === 'ringkasan' && 'summary' in data && (
                <SummaryReport summary={data.summary} usage={data.usage} />
            )}
            {report === 'mutasi' && 'rows' in data && (
                <MovementReport rows={data.rows} />
            )}
            {report === 'pemakaian' && 'employees' in data && (
                <UsageReport usage={data} />
            )}
            {report === 'persediaan' && 'categories' in data && (
                <InventoryReport inventory={data} />
            )}
            {report === 'aset' && 'holders' in data && (
                <AssetReport assets={data} />
            )}
        </AppLayout>
    );
}

type PeriodFilterProps = {
    period: { from: string; to: string };
    today: string;
    onChange: (from: string, to: string) => void;
};

function PeriodFilter({ period, today, onChange }: PeriodFilterProps) {
    const presets = buildPresets(today);
    const matched = presets.find(
        (preset) => preset.from === period.from && preset.to === period.to,
    );
    const [isCustom, setIsCustom] = useState(!matched);

    return (
        <div className="flex flex-wrap items-center gap-2">
            <div className="w-48">
                <Select
                    id="report-period"
                    aria-label="Periode"
                    value={isCustom ? 'custom' : (matched?.key ?? 'custom')}
                    onChange={(key) => {
                        if (key === 'custom') {
                            setIsCustom(true);

                            return;
                        }

                        const preset = presets.find((item) => item.key === key);

                        if (preset) {
                            setIsCustom(false);
                            onChange(preset.from, preset.to);
                        }
                    }}
                    options={[
                        ...presets.map((preset) => ({
                            value: preset.key,
                            label: preset.label,
                        })),
                        { value: 'custom', label: 'Pilih tanggal sendiri' },
                    ]}
                />
            </div>
            {isCustom && (
                <div className="flex items-center gap-2">
                    <label className="sr-only" htmlFor="report-from">
                        Dari tanggal
                    </label>
                    <input
                        id="report-from"
                        type="date"
                        max={period.to}
                        value={period.from}
                        onChange={(event) =>
                            event.target.value &&
                            onChange(event.target.value, period.to)
                        }
                        className="h-11 rounded-xl border border-ink-200 bg-white px-3 text-sm text-ink-900 outline-none focus:border-brand-500"
                    />
                    <span className="text-sm text-ink-500">s.d.</span>
                    <label className="sr-only" htmlFor="report-to">
                        Sampai tanggal
                    </label>
                    <input
                        id="report-to"
                        type="date"
                        min={period.from}
                        max={today}
                        value={period.to}
                        onChange={(event) =>
                            event.target.value &&
                            onChange(period.from, event.target.value)
                        }
                        className="h-11 rounded-xl border border-ink-200 bg-white px-3 text-sm text-ink-900 outline-none focus:border-brand-500"
                    />
                </div>
            )}
        </div>
    );
}

function buildPresets(today: string) {
    const [year, month] = today.split('-').map(Number);
    const pad = (value: number) => String(value).padStart(2, '0');
    const firstOf = (y: number, m: number) => `${y}-${pad(m)}-01`;
    const lastOf = (y: number, m: number) =>
        `${y}-${pad(m)}-${pad(new Date(y, m, 0).getDate())}`;
    const shift = (offset: number) => {
        const date = new Date(year, month - 1 + offset, 1);

        return [date.getFullYear(), date.getMonth() + 1] as const;
    };
    const [prevYear, prevMonth] = shift(-1);
    const [threeYear, threeMonth] = shift(-2);

    return [
        {
            key: 'this-month',
            label: 'Bulan ini',
            from: firstOf(year, month),
            to: today,
        },
        {
            key: 'last-month',
            label: 'Bulan lalu',
            from: firstOf(prevYear, prevMonth),
            to: lastOf(prevYear, prevMonth),
        },
        {
            key: 'three-months',
            label: '3 bulan terakhir',
            from: firstOf(threeYear, threeMonth),
            to: today,
        },
        {
            key: 'this-year',
            label: 'Tahun ini',
            from: `${year}-01-01`,
            to: today,
        },
    ];
}

function BarList({
    items,
    emptyText,
}: {
    items: { label: string; value: number; hint?: string }[];
    emptyText: string;
}) {
    const max = Math.max(1, ...items.map((item) => item.value));

    if (items.length === 0) {
        return <p className="px-5 pb-5 text-sm text-ink-500">{emptyText}</p>;
    }

    return (
        <ul className="flex flex-col gap-3 px-5 pb-5">
            {items.map((item) => (
                <li key={item.label} className="flex flex-col gap-1.5">
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="font-medium text-ink-900">
                            {item.label}
                        </span>
                        <span className="font-semibold text-ink-900 tabular-nums">
                            {formatRupiah(item.value)}
                        </span>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="h-2 flex-1 overflow-hidden rounded-full bg-ink-100">
                            <span
                                className="block h-full rounded-full bg-brand-600 print:bg-ink-700"
                                style={{
                                    width: `${(item.value / max) * 100}%`,
                                }}
                            />
                        </span>
                        {item.hint && (
                            <span className="w-32 text-right text-xs text-ink-500">
                                {item.hint}
                            </span>
                        )}
                    </div>
                </li>
            ))}
        </ul>
    );
}

function TableCard({
    title,
    description,
    children,
    minWidth = '640px',
}: {
    title: string;
    description?: string;
    children: ReactNode;
    minWidth?: string;
}) {
    return (
        <Card className="print:break-inside-avoid print:border print:border-ink-200 print:shadow-none">
            <CardHeader title={title} description={description} />
            <div className="overflow-x-auto">
                <table className="w-full text-sm" style={{ minWidth }}>
                    {children}
                </table>
            </div>
        </Card>
    );
}

const th = 'px-3 py-2.5 text-left text-xs font-medium text-ink-500';
const thRight = 'px-3 py-2.5 text-right text-xs font-medium text-ink-500';
const td = 'px-3 py-2.5 text-ink-700';
const tdRight = 'px-3 py-2.5 text-right text-ink-900 tabular-nums';

function SummaryReport({ summary, usage }: { summary: Summary; usage: Usage }) {
    return (
        <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                    label="Barang masuk"
                    value={formatRupiahCompact(summary.incoming_value)}
                    hint={`${summary.incoming_count} transaksi`}
                    icon={ArrowDownTrayIcon}
                    tone="green"
                />
                <StatCard
                    label="Barang keluar"
                    value={formatRupiahCompact(summary.outgoing_value)}
                    hint={`${summary.outgoing_count} transaksi`}
                    icon={ArrowUpTrayIcon}
                />
                <StatCard
                    label="Selisih cek stok"
                    value={formatRupiahCompact(summary.adjustment_value)}
                    hint={`${summary.adjustment_count} penyesuaian`}
                    icon={ClipboardIcon}
                    tone="amber"
                />
                <StatCard
                    label="Nilai persediaan hari ini"
                    value={formatRupiahCompact(summary.inventory_value)}
                    hint={`${summary.item_count} jenis barang · ${summary.low_stock_count} stok kritis`}
                    icon={BoxIcon}
                />
            </div>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <Card className="print:break-inside-avoid print:shadow-none">
                    <CardHeader
                        title="Pemakaian per divisi"
                        description={`Total ${formatRupiah(usage.total)}`}
                    />
                    <BarList
                        items={usage.divisions.map((division) => ({
                            label: division.name,
                            value: division.value,
                            hint: `${division.transactions} transaksi`,
                        }))}
                        emptyText="Belum ada barang keluar di periode ini."
                    />
                </Card>
                <TopItems items={usage.top_items} />
            </div>
        </>
    );
}

function TopItems({ items }: { items: Usage['top_items'] }) {
    return (
        <TableCard
            title="Barang paling banyak keluar"
            description="10 teratas berdasarkan nilai"
            minWidth="420px"
        >
            <thead>
                <tr className="border-y border-ink-100 bg-ink-50">
                    <th className={`${th} pl-5`}>Barang</th>
                    <th className={thRight}>Jumlah</th>
                    <th className={`${thRight} pr-5`}>Nilai</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
                {items.length === 0 && (
                    <tr>
                        <td
                            colSpan={3}
                            className="px-5 py-6 text-center text-ink-500"
                        >
                            Belum ada barang keluar di periode ini.
                        </td>
                    </tr>
                )}
                {items.map((item) => (
                    <tr key={item.name}>
                        <td className={`${td} pl-5 font-medium text-ink-900`}>
                            {item.name}
                        </td>
                        <td className={tdRight}>
                            {formatNumber(item.quantity)} {item.unit}
                        </td>
                        <td className={`${tdRight} pr-5 font-semibold`}>
                            {formatRupiah(item.value)}
                        </td>
                    </tr>
                ))}
            </tbody>
        </TableCard>
    );
}

function MovementReport({ rows }: { rows: MovementRow[] }) {
    const [onlyMoving, setOnlyMoving] = useState(false);
    const visible = onlyMoving
        ? rows.filter((row) => row.incoming || row.outgoing || row.adjustment)
        : rows;
    const totalOut = visible.reduce(
        (total, row) => total + row.outgoing_value,
        0,
    );

    return (
        <Card className="print:shadow-none">
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 pb-4">
                <div className="flex flex-col gap-1">
                    <h2 className="text-base font-semibold text-ink-900">
                        Mutasi per barang
                    </h2>
                    <p className="text-[13px] text-ink-500">
                        Stok akhir = stok awal + masuk − keluar ± penyesuaian
                    </p>
                </div>
                <div className="print:hidden">
                    <Switch
                        id="only-moving"
                        label="Hanya barang yang bergerak"
                        checked={onlyMoving}
                        onChange={setOnlyMoving}
                    />
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] text-sm">
                    <thead>
                        <tr className="border-y border-ink-100 bg-ink-50">
                            <th className={`${th} pl-5`}>Barang</th>
                            <th className={thRight}>Stok awal</th>
                            <th className={thRight}>Masuk</th>
                            <th className={thRight}>Keluar</th>
                            <th className={thRight}>Penyesuaian</th>
                            <th className={thRight}>Stok akhir</th>
                            <th className={`${thRight} pr-5`}>Nilai keluar</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-ink-100">
                        {visible.map((row) => (
                            <tr
                                key={row.code}
                                className="print:break-inside-avoid"
                            >
                                <td className={`${td} pl-5`}>
                                    <span className="flex flex-col">
                                        <span className="font-medium text-ink-900">
                                            {row.name}
                                        </span>
                                        <span className="text-xs text-ink-400">
                                            {row.code} · {row.category}
                                        </span>
                                    </span>
                                </td>
                                <td className={tdRight}>
                                    {formatNumber(row.opening)}
                                </td>
                                <td
                                    className={cn(
                                        tdRight,
                                        row.incoming && 'text-ok',
                                    )}
                                >
                                    {row.incoming
                                        ? `+${formatNumber(row.incoming)}`
                                        : '—'}
                                </td>
                                <td className={tdRight}>
                                    {row.outgoing
                                        ? `−${formatNumber(row.outgoing)}`
                                        : '—'}
                                </td>
                                <td
                                    className={cn(
                                        tdRight,
                                        row.adjustment < 0 && 'text-low',
                                        row.adjustment > 0 && 'text-ok',
                                    )}
                                >
                                    {row.adjustment
                                        ? `${row.adjustment > 0 ? '+' : '−'}${formatNumber(Math.abs(row.adjustment))}`
                                        : '—'}
                                </td>
                                <td className={`${tdRight} font-semibold`}>
                                    {formatNumber(row.closing)}{' '}
                                    <span className="font-normal text-ink-400">
                                        {row.unit}
                                    </span>
                                </td>
                                <td className={`${tdRight} pr-5`}>
                                    {row.outgoing_value
                                        ? formatRupiah(row.outgoing_value)
                                        : '—'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="border-t-2 border-ink-200 bg-ink-50 font-semibold">
                            <td className={`${td} pl-5 text-ink-900`}>
                                Total ({visible.length} barang)
                            </td>
                            <td colSpan={5} />
                            <td className={`${tdRight} pr-5`}>
                                {formatRupiah(totalOut)}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </Card>
    );
}

function UsageReport({ usage }: { usage: Usage }) {
    return (
        <>
            <Card className="print:break-inside-avoid print:shadow-none">
                <CardHeader
                    title="Nilai barang keluar per divisi"
                    description={`Total ${formatRupiah(usage.total)}`}
                />
                <BarList
                    items={usage.divisions.map((division) => ({
                        label: division.name,
                        value: division.value,
                        hint: `${division.employees} orang · ${division.transactions} transaksi`,
                    }))}
                    emptyText="Belum ada barang keluar di periode ini."
                />
            </Card>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <TableCard title="Per karyawan" minWidth="480px">
                    <thead>
                        <tr className="border-y border-ink-100 bg-ink-50">
                            <th className={`${th} pl-5`}>Karyawan</th>
                            <th className={th}>Divisi</th>
                            <th className={thRight}>Transaksi</th>
                            <th className={`${thRight} pr-5`}>Nilai</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-ink-100">
                        {usage.employees.length === 0 && (
                            <tr>
                                <td
                                    colSpan={4}
                                    className="px-5 py-6 text-center text-ink-500"
                                >
                                    Belum ada barang keluar di periode ini.
                                </td>
                            </tr>
                        )}
                        {usage.employees.map((employee) => (
                            <tr key={`${employee.name}-${employee.division}`}>
                                <td
                                    className={`${td} pl-5 font-medium text-ink-900`}
                                >
                                    {employee.name}
                                </td>
                                <td className={td}>{employee.division}</td>
                                <td className={tdRight}>
                                    {employee.transactions}
                                </td>
                                <td className={`${tdRight} pr-5 font-semibold`}>
                                    {formatRupiah(employee.value)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </TableCard>
                <TopItems items={usage.top_items} />
            </div>
        </>
    );
}

function InventoryReport({ inventory }: { inventory: InventoryValue }) {
    return (
        <>
            <Card className="print:break-inside-avoid print:shadow-none">
                <CardHeader
                    title="Nilai per kategori"
                    description={`Total nilai persediaan ${formatRupiah(inventory.total)}`}
                />
                <BarList
                    items={inventory.categories.map((category) => ({
                        label: category.name,
                        value: category.value,
                        hint: `${category.items} jenis barang`,
                    }))}
                    emptyText="Belum ada barang."
                />
            </Card>
            <TableCard
                title="Rincian per barang"
                description="Diurutkan dari nilai terbesar"
                minWidth="720px"
            >
                <thead>
                    <tr className="border-y border-ink-100 bg-ink-50">
                        <th className={`${th} pl-5`}>Barang</th>
                        <th className={th}>Kategori</th>
                        <th className={thRight}>Stok</th>
                        <th className={thRight}>Harga rata-rata</th>
                        <th className={`${thRight} pr-5`}>Nilai</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                    {inventory.items.map((item) => (
                        <tr
                            key={item.code}
                            className="print:break-inside-avoid"
                        >
                            <td className={`${td} pl-5`}>
                                <span className="flex flex-col">
                                    <span className="font-medium text-ink-900">
                                        {item.name}
                                    </span>
                                    <span className="text-xs text-ink-400">
                                        {item.code}
                                    </span>
                                </span>
                            </td>
                            <td className={td}>{item.category}</td>
                            <td className={tdRight}>
                                {formatNumber(item.stock)}{' '}
                                <span className="text-ink-400">
                                    {item.unit}
                                </span>
                            </td>
                            <td className={tdRight}>
                                {formatRupiah(item.average_price)}
                            </td>
                            <td className={`${tdRight} pr-5 font-semibold`}>
                                {formatRupiah(item.value)}
                            </td>
                        </tr>
                    ))}
                </tbody>
                <tfoot>
                    <tr className="border-t-2 border-ink-200 bg-ink-50 font-semibold">
                        <td className={`${td} pl-5 text-ink-900`} colSpan={4}>
                            Total nilai persediaan
                        </td>
                        <td className={`${tdRight} pr-5`}>
                            {formatRupiah(inventory.total)}
                        </td>
                    </tr>
                </tfoot>
            </TableCard>
        </>
    );
}

function AssetReport({ assets }: { assets: AssetsByHolder }) {
    return (
        <>
            <div className="flex flex-wrap gap-3">
                {Object.entries(assets.status_counts).map(([label, count]) => (
                    <span
                        key={label}
                        className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm shadow-[0_1px_2px_rgba(18,24,38,0.04)]"
                    >
                        <span className="text-ink-500">{label}</span>
                        <span className="font-semibold text-ink-900 tabular-nums">
                            {count}
                        </span>
                    </span>
                ))}
                <span className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm shadow-[0_1px_2px_rgba(18,24,38,0.04)]">
                    <span className="text-ink-500">Total harga perolehan</span>
                    <span className="font-semibold text-ink-900 tabular-nums">
                        {formatRupiah(assets.total_value)}
                    </span>
                </span>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {assets.holders.map((holder) => (
                    <Card
                        key={`${holder.type}-${holder.name}`}
                        className="flex flex-col print:break-inside-avoid print:shadow-none"
                    >
                        <div className="flex items-center gap-3 px-5 pt-5 pb-3">
                            <span
                                className={cn(
                                    'flex size-10 items-center justify-center rounded-xl',
                                    holder.type === 'room'
                                        ? 'bg-[#f1ecfb] text-[#6d3fc4]'
                                        : 'bg-brand-50 text-brand-700',
                                )}
                            >
                                {holder.type === 'room' ? (
                                    <DoorIcon className="size-5" />
                                ) : (
                                    <UserIcon className="size-5" />
                                )}
                            </span>
                            <span className="flex min-w-0 flex-1 flex-col">
                                <span className="truncate font-semibold text-ink-900">
                                    {holder.name}
                                </span>
                                <span className="text-xs text-ink-500">
                                    {holder.type === 'room'
                                        ? 'Ruangan'
                                        : 'Karyawan'}
                                    {holder.detail && ` · ${holder.detail}`}
                                </span>
                            </span>
                            <span className="text-right text-xs text-ink-500">
                                {holder.assets.length} aset
                                <br />
                                <span className="font-semibold text-ink-900">
                                    {formatRupiah(holder.value)}
                                </span>
                            </span>
                        </div>
                        <ul className="divide-y divide-ink-100 border-t border-ink-100">
                            {holder.assets.map((asset) => (
                                <li
                                    key={asset.code}
                                    className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm"
                                >
                                    <span className="flex min-w-0 flex-col">
                                        <span className="truncate text-ink-900">
                                            {asset.name}
                                        </span>
                                        <span className="text-xs text-ink-400">
                                            {asset.code} · {asset.category}
                                        </span>
                                    </span>
                                    <span className="shrink-0 text-xs text-ink-500">
                                        sejak {formatDate(asset.since)}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </Card>
                ))}
            </div>

            <TableCard
                title="Aset tanpa pemegang"
                description="Di gudang, sedang diservis, atau rusak"
                minWidth="560px"
            >
                <thead>
                    <tr className="border-y border-ink-100 bg-ink-50">
                        <th className={`${th} pl-5`}>Aset</th>
                        <th className={th}>Kategori</th>
                        <th className={th}>Status</th>
                        <th className={`${thRight} pr-5`}>Harga perolehan</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                    {assets.unassigned.length === 0 && (
                        <tr>
                            <td
                                colSpan={4}
                                className="px-5 py-6 text-center text-ink-500"
                            >
                                Semua aset sedang dipakai.
                            </td>
                        </tr>
                    )}
                    {assets.unassigned.map((asset) => (
                        <tr key={asset.code}>
                            <td className={`${td} pl-5`}>
                                <span className="flex flex-col">
                                    <span className="font-medium text-ink-900">
                                        {asset.name}
                                    </span>
                                    <span className="text-xs text-ink-400">
                                        {asset.code}
                                    </span>
                                </span>
                            </td>
                            <td className={td}>{asset.category}</td>
                            <td className={td}>{asset.status}</td>
                            <td className={`${tdRight} pr-5`}>
                                {formatRupiah(asset.price)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </TableCard>
        </>
    );
}
