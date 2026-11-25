import { Link, usePage } from '@inertiajs/react';
import {
    AlertIcon,
    ArrowDownTrayIcon,
    ArrowUpTrayIcon,
    ArrowsIcon,
    BoxIcon,
    ChevronRightIcon,
    ClockIcon,
    LaptopIcon,
} from '@/components/icons';
import type { MonthlyMovement } from '@/components/movement-chart';
import { MovementChart } from '@/components/movement-chart';
import type { OnboardingProgress } from '@/components/onboarding-checklist';
import { OnboardingChecklist } from '@/components/onboarding-checklist';
import { ButtonLink } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import {
    assetStatusTone,
    Badge,
    stockStatusTone,
    transactionTone,
} from '@/components/ui/status-badge';
import AppLayout from '@/layouts/app-layout';
import { create as incomingCreate } from '@/routes/transactions/incoming';
import { create as outgoingCreate } from '@/routes/transactions/outgoing';
import {
    formatDate,
    formatNumber,
    formatRupiah,
    formatRupiahCompact,
} from '@/lib/format';
import { dashboard } from '@/routes';
import { show as assetShow, index as assetsIndex } from '@/routes/assets';
import { show as itemShow, index as itemsIndex } from '@/routes/items';
import type { Asset, Item, StockTransaction } from '@/types';

type DashboardProps = {
    today: string;
    stats: {
        incoming_today: number;
        outgoing_today: number;
        low_stock: number;
        low_stock_notified: number;
        assets_in_use: number;
        assets_total: number;
        inventory_value: number;
        item_count: number;
    };
    lowStockItems: Item[];
    recentTransactions: StockTransaction[];
    assetsNeedingAttention: Asset[];
    idleItems: {
        code: string;
        name: string;
        unit: string;
        current_stock: number;
        stock_value: number;
        last_out_on: string | null;
        idle_days: number | null;
    }[];
    monthlyMovement: MonthlyMovement[];
    onboarding: OnboardingProgress;
};

export default function Dashboard({
    today,
    stats,
    lowStockItems,
    recentTransactions,
    assetsNeedingAttention,
    idleItems,
    monthlyMovement,
    onboarding,
}: DashboardProps) {
    const userName = usePage().props.auth.user?.name ?? '';
    const firstName = userName.split(' ')[0] || 'Selamat datang';

    return (
        <AppLayout
            title="Beranda"
            breadcrumbs={[{ title: 'Beranda', href: dashboard.url() }]}
        >
            <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 via-brand-600 to-brand-400 px-6 py-7 text-white shadow-[0_24px_48px_-24px_rgba(22,121,201,0.7)] sm:px-8 sm:py-8">
                <svg
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 size-full"
                    preserveAspectRatio="none"
                >
                    <defs>
                        <pattern
                            id="hero-dots"
                            width="22"
                            height="22"
                            patternUnits="userSpaceOnUse"
                        >
                            <circle cx="2" cy="2" r="1.2" fill="white" />
                        </pattern>
                    </defs>
                    <rect
                        width="100%"
                        height="100%"
                        fill="url(#hero-dots)"
                        opacity="0.12"
                    />
                </svg>
                <span
                    aria-hidden="true"
                    className="pointer-events-none absolute -top-24 -right-16 size-72 rounded-full bg-white/25 blur-3xl"
                />
                <span
                    aria-hidden="true"
                    className="pointer-events-none absolute -bottom-28 left-1/3 size-72 rounded-full bg-mint-300/30 blur-3xl"
                />
                <span
                    aria-hidden="true"
                    className="pointer-events-none absolute top-6 right-8 hidden size-40 rounded-full border-[18px] border-white/10 md:block"
                />

                <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
                    <div className="flex flex-col gap-2">
                        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
                            <span className="size-1.5 rounded-full bg-sun-400" />
                            {formatDate(today)}
                        </span>
                        <h1 className="text-[28px] leading-tight font-bold tracking-[-0.02em] sm:text-[34px]">
                            Halo, {firstName}!
                        </h1>
                        <p className="max-w-md text-[15px] text-white/85">
                            Ini ringkasan gudang hari ini. Catat barang masuk
                            atau keluar langsung dari sini.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2.5">
                        <Link
                            href={incomingCreate.url()}
                            className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-brand-800 shadow-[0_8px_18px_-8px_rgba(23,82,131,0.5)] transition-colors hover:bg-brand-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                        >
                            <ArrowDownTrayIcon className="size-[18px]" />
                            Barang Masuk
                        </Link>
                        <Link
                            href={outgoingCreate.url()}
                            className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/40 bg-white/15 px-4 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                        >
                            <ArrowUpTrayIcon className="size-[18px]" />
                            Barang Keluar
                        </Link>
                    </div>
                </div>
            </section>

            <OnboardingChecklist progress={onboarding} />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                    label="Nilai Perlengkapan"
                    value={formatRupiahCompact(stats.inventory_value)}
                    hint={`${formatNumber(stats.item_count)} jenis barang`}
                    icon={BoxIcon}
                />
                <StatCard
                    label="Stok Kritis"
                    value={formatNumber(stats.low_stock)}
                    hint={`${stats.low_stock_notified} dengan notifikasi aktif`}
                    icon={AlertIcon}
                    tone="coral"
                />
                <StatCard
                    label="Transaksi Hari Ini"
                    value={formatNumber(
                        stats.incoming_today + stats.outgoing_today,
                    )}
                    hint={`${stats.incoming_today} masuk · ${stats.outgoing_today} keluar`}
                    icon={ArrowsIcon}
                    tone="sun"
                />
                <StatCard
                    label="Peralatan Dipakai"
                    value={
                        <>
                            {stats.assets_in_use}
                            <span className="text-lg font-medium text-ink-400">
                                {' '}
                                / {stats.assets_total}
                            </span>
                        </>
                    }
                    hint="unit sedang dipegang"
                    icon={LaptopIcon}
                    tone="green"
                    progress={
                        stats.assets_total > 0
                            ? (stats.assets_in_use / stats.assets_total) * 100
                            : 0
                    }
                />
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                <Card className="xl:col-span-2">
                    <CardHeader
                        title="Pergerakan Nilai Barang"
                        description="Nilai barang masuk dan keluar, 6 bulan terakhir"
                    />
                    <MovementChart data={monthlyMovement} />
                </Card>

                <Card>
                    <CardHeader
                        title="Stok Kritis"
                        description="Habis atau di bawah batas minimum"
                        action={
                            <SeeAll
                                href={itemsIndex.url({
                                    query: { status: 'menipis' },
                                })}
                            />
                        }
                    />
                    <ul className="flex flex-col gap-1 px-3 pb-3">
                        {lowStockItems.length === 0 && (
                            <li className="px-2 pb-2 text-sm text-ink-500">
                                {stats.item_count === 0
                                    ? 'Belum ada barang. Barang yang stoknya hampir habis akan muncul di sini.'
                                    : 'Semua stok aman, tidak ada yang di bawah batas minimum.'}
                            </li>
                        )}
                        {lowStockItems.map((item) => {
                            const fill =
                                item.minimum_stock > 0
                                    ? Math.min(
                                          100,
                                          (item.current_stock /
                                              item.minimum_stock) *
                                              100,
                                      )
                                    : 0;

                            return (
                                <li key={item.id}>
                                    <Link
                                        href={itemShow.url(item.code)}
                                        className="flex flex-col gap-2 rounded-xl px-2.5 py-2.5 transition-colors hover:bg-accent-50/60"
                                    >
                                        <span className="flex items-center justify-between gap-3">
                                            <span className="truncate text-sm font-medium text-ink-900">
                                                {item.name}
                                                {item.variant && (
                                                    <span className="text-ink-500">
                                                        {' '}
                                                        · {item.variant}
                                                    </span>
                                                )}
                                            </span>
                                            <Badge
                                                tone={
                                                    stockStatusTone[
                                                        item.status.value
                                                    ]
                                                }
                                            >
                                                {item.status.label}
                                            </Badge>
                                        </span>
                                        <span className="flex items-center gap-3">
                                            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-100">
                                                <span
                                                    className="block h-full rounded-full bg-gradient-to-r from-low to-accent-400"
                                                    style={{
                                                        width: `${fill}%`,
                                                    }}
                                                />
                                            </span>
                                            <span className="w-28 text-right text-xs text-ink-500 tabular-nums">
                                                {formatNumber(
                                                    item.current_stock,
                                                )}{' '}
                                                /{' '}
                                                {formatNumber(
                                                    item.minimum_stock,
                                                )}{' '}
                                                {item.unit}
                                            </span>
                                        </span>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </Card>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                <Card className="xl:col-span-2">
                    <CardHeader
                        title="Transaksi Terakhir"
                        description="Barang masuk, keluar, dan penyesuaian stok"
                    />
                    {recentTransactions.length === 0 ? (
                        <div className="flex flex-col items-start gap-3 px-5 pb-5">
                            <p className="text-sm text-ink-500">
                                Belum ada transaksi. Setiap barang masuk dan
                                keluar yang dicatat akan tampil di sini.
                            </p>
                            <div className="flex flex-wrap gap-2">
                                <ButtonLink
                                    href={incomingCreate.url()}
                                    variant="soft"
                                    size="sm"
                                    icon={
                                        <ArrowDownTrayIcon className="size-4" />
                                    }
                                >
                                    Catat barang masuk
                                </ButtonLink>
                                <ButtonLink
                                    href={outgoingCreate.url()}
                                    variant="soft"
                                    size="sm"
                                    icon={
                                        <ArrowUpTrayIcon className="size-4" />
                                    }
                                >
                                    Catat barang keluar
                                </ButtonLink>
                            </div>
                        </div>
                    ) : (
                        <div className="overflow-x-auto px-5 pb-3">
                            <table className="w-full min-w-[560px] text-sm">
                                <thead>
                                    <tr className="border-b border-ink-100 text-left text-[11px] font-semibold tracking-[0.06em] text-ink-400 uppercase">
                                        <th className="py-2.5 pr-3 font-medium">
                                            Transaksi
                                        </th>
                                        <th className="px-3 py-2.5 font-medium">
                                            Barang
                                        </th>
                                        <th className="px-3 py-2.5 font-medium">
                                            Pihak / Keperluan
                                        </th>
                                        <th className="py-2.5 pl-3 text-right font-medium">
                                            Tanggal
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-ink-100">
                                    {recentTransactions.map((transaction) => (
                                        <tr
                                            key={transaction.id}
                                            className={
                                                transaction.is_cancelled
                                                    ? 'text-ink-400'
                                                    : 'transition-colors hover:bg-brand-50/40'
                                            }
                                        >
                                            <td className="py-3 pr-3 align-top">
                                                <div className="flex flex-col items-start gap-1.5">
                                                    <span
                                                        className={
                                                            transaction.is_cancelled
                                                                ? 'font-medium line-through'
                                                                : 'font-medium text-ink-900'
                                                        }
                                                    >
                                                        {transaction.number}
                                                    </span>
                                                    {transaction.is_cancelled ? (
                                                        <Badge
                                                            tone="gray"
                                                            variant="soft"
                                                        >
                                                            Dibatalkan
                                                        </Badge>
                                                    ) : (
                                                        <Badge
                                                            tone={
                                                                transactionTone[
                                                                    transaction
                                                                        .type
                                                                        .value
                                                                ]
                                                            }
                                                            variant="soft"
                                                        >
                                                            {
                                                                transaction.type
                                                                    .label
                                                            }
                                                        </Badge>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-3 py-3 align-top">
                                                <ul className="flex flex-col gap-1">
                                                    {transaction.lines?.map(
                                                        (line) => (
                                                            <li
                                                                key={
                                                                    line.item_code
                                                                }
                                                                className="flex justify-between gap-3"
                                                            >
                                                                <span className="truncate">
                                                                    {
                                                                        line.item_name
                                                                    }
                                                                </span>
                                                                <span
                                                                    className={
                                                                        line.quantity >
                                                                        0
                                                                            ? 'font-semibold text-brand-700 tabular-nums'
                                                                            : 'font-semibold text-accent-700 tabular-nums'
                                                                    }
                                                                >
                                                                    {line.quantity >
                                                                    0
                                                                        ? '+'
                                                                        : '−'}
                                                                    {formatNumber(
                                                                        Math.abs(
                                                                            line.quantity,
                                                                        ),
                                                                    )}{' '}
                                                                    {line.unit}
                                                                </span>
                                                            </li>
                                                        ),
                                                    )}
                                                </ul>
                                            </td>
                                            <td className="px-3 py-3 align-top text-ink-500">
                                                <div className="flex flex-col gap-0.5">
                                                    {transaction.counterpart && (
                                                        <span className="text-ink-700">
                                                            {
                                                                transaction.counterpart
                                                            }
                                                        </span>
                                                    )}
                                                    {transaction.purpose && (
                                                        <span className="text-xs">
                                                            {
                                                                transaction.purpose
                                                            }
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-3 pl-3 text-right align-top whitespace-nowrap text-ink-500">
                                                {formatDate(
                                                    transaction.transacted_on,
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Card>

                <div className="flex flex-col gap-4">
                    <Card>
                        <CardHeader
                            title="Peralatan Perlu Perhatian"
                            description="Sedang diservis atau rusak"
                            action={<SeeAll href={assetsIndex.url()} />}
                        />
                        <ul className="flex flex-col gap-2 px-3 pb-3">
                            {assetsNeedingAttention.length === 0 && (
                                <li className="px-2 pb-2 text-sm text-ink-500">
                                    Semua peralatan dalam kondisi baik.
                                </li>
                            )}
                            {assetsNeedingAttention.map((asset) => (
                                <li key={asset.id}>
                                    <Link
                                        href={assetShow.url(asset.code)}
                                        className="flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-ink-50"
                                    >
                                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sun-100 text-sun-700">
                                            <LaptopIcon className="size-5" />
                                        </span>
                                        <span className="flex min-w-0 flex-1 flex-col">
                                            <span className="truncate text-sm font-medium text-ink-900">
                                                {asset.name}
                                            </span>
                                            <span className="text-xs text-ink-500">
                                                {asset.code}
                                            </span>
                                        </span>
                                        <Badge
                                            tone={
                                                assetStatusTone[
                                                    asset.status.value
                                                ]
                                            }
                                        >
                                            {asset.status.label}
                                        </Badge>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </Card>

                    <Card>
                        <CardHeader
                            title="Barang Tidak Bergerak"
                            description="Tidak keluar lebih dari 90 hari"
                        />
                        <ul className="flex flex-col gap-2 px-3 pb-3">
                            {idleItems.length === 0 && (
                                <li className="px-2 pb-2 text-sm text-ink-500">
                                    Semua barang bergerak normal.
                                </li>
                            )}
                            {idleItems.map((item) => (
                                <li key={item.code}>
                                    <Link
                                        href={itemShow.url(item.code)}
                                        className="flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-ink-50"
                                    >
                                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent-50 text-accent-700">
                                            <ClockIcon className="size-5" />
                                        </span>
                                        <span className="flex min-w-0 flex-1 flex-col">
                                            <span className="truncate text-sm font-medium text-ink-900">
                                                {item.name}
                                            </span>
                                            <span className="text-xs text-ink-500">
                                                {item.idle_days !== null
                                                    ? `${item.idle_days} hari sejak keluar terakhir`
                                                    : 'Belum pernah keluar'}
                                            </span>
                                        </span>
                                        <span className="flex flex-col items-end text-xs tabular-nums">
                                            <span className="font-semibold text-ink-900">
                                                {formatNumber(
                                                    item.current_stock,
                                                )}{' '}
                                                {item.unit}
                                            </span>
                                            <span className="text-ink-500">
                                                {formatRupiah(item.stock_value)}
                                            </span>
                                        </span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}

function SeeAll({ href }: { href: string }) {
    return (
        <Link
            href={href}
            className="inline-flex h-8 shrink-0 items-center gap-0.5 rounded-full bg-brand-50 pr-2 pl-3 text-xs font-semibold text-brand-700 transition-colors hover:bg-brand-100"
        >
            Lihat semua
            <ChevronRightIcon className="size-4" />
        </Link>
    );
}
