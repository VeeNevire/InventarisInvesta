import type { ComponentType, SVGProps } from 'react';
import { useState } from 'react';
import type { AssetAction } from '@/components/asset-action-dialogs';
import { AssetActionDialogs } from '@/components/asset-action-dialogs';
import { HolderLabel } from '@/components/holder-label';
import {
    ArrowDownTrayIcon,
    ArrowUpTrayIcon,
    BanIcon,
    LaptopIcon,
    PackageCheckIcon,
    TagIcon,
    WrenchIcon,
} from '@/components/icons';
import { Button, ButtonLink } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { MediaFrame } from '@/components/ui/media-frame';
import { PageHeader } from '@/components/ui/page-header';
import { assetStatusTone, Badge } from '@/components/ui/status-badge';
import AppLayout from '@/layouts/app-layout';
import { formatDate, formatRupiah } from '@/lib/format';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';
import { edit as assetEdit, index as assetsIndex } from '@/routes/assets';
import type { Asset, AssetHistory, Depreciation } from '@/types';

type AssetShowProps = {
    asset: Asset;
    holderSince: string | null;
    histories: AssetHistory[];
    depreciation: Depreciation | null;
    serviceCost: number;
    today: string;
    lastHistoryDate: string | null;
    canEdit: boolean;
    canDispose: boolean;
    employees: { id: number; name: string; division: string | null }[];
    divisions: { id: number; name: string }[];
    rooms: { id: number; name: string; floor: string | null }[];
    vendors: string[];
};

const historyStyles: Record<
    AssetHistory['type']['value'],
    { icon: ComponentType<SVGProps<SVGSVGElement>>; className: string }
> = {
    pembelian: { icon: TagIcon, className: 'bg-ink-100 text-ink-700' },
    penyerahan: {
        icon: ArrowUpTrayIcon,
        className: 'bg-brand-50 text-brand-700',
    },
    pengembalian: {
        icon: ArrowDownTrayIcon,
        className: 'bg-ok/10 text-ok',
    },
    perbaikan: { icon: WrenchIcon, className: 'bg-service/10 text-service' },
    selesai_perbaikan: {
        icon: PackageCheckIcon,
        className: 'bg-ok/10 text-ok',
    },
    penghapusan: { icon: BanIcon, className: 'bg-low/10 text-low' },
};

export default function AssetShow({
    asset,
    holderSince,
    histories,
    depreciation,
    serviceCost,
    today,
    lastHistoryDate,
    canEdit,
    canDispose,
    employees,
    divisions,
    rooms,
    vendors,
}: AssetShowProps) {
    const [action, setAction] = useState<AssetAction | null>(null);

    const details: { label: string; value: string }[] = [
        { label: 'Kode aset', value: asset.code },
        {
            label: 'Kategori',
            value: asset.category?.parent_name
                ? `${asset.category.name} (Subkategori ${asset.category.parent_name})`
                : (asset.category?.name ?? '—'),
        },
        { label: 'Merek', value: asset.brand ?? '—' },
        { label: 'Model', value: asset.model ?? '—' },
        { label: 'Nomor seri', value: asset.serial_number ?? '—' },
        { label: 'Tanggal beli', value: formatDate(asset.purchased_on) },
        { label: 'Supplier', value: asset.supplier ?? '—' },
        { label: 'Harga perolehan', value: formatRupiah(asset.purchase_price) },
    ];

    const status = asset.status.value;

    return (
        <AppLayout
            title={asset.name}
            breadcrumbs={[
                { title: 'Beranda', href: dashboard.url() },
                { title: 'Aset', href: assetsIndex.url() },
                { title: asset.code },
            ]}
        >
            <PageHeader
                eyebrow={
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-ink-500">
                            {asset.code}
                        </span>
                        <Badge tone={assetStatusTone[status]}>
                            {asset.status.label}
                        </Badge>
                    </div>
                }
                title={asset.name}
                description={asset.specification}
                actions={
                    <>
                        {canEdit && (
                            <ButtonLink
                                href={assetEdit.url(asset.code)}
                                variant="soft"
                            >
                                Edit aset
                            </ButtonLink>
                        )}
                        {canDispose &&
                            (status === 'tersedia' || status === 'rusak') && (
                                <Button
                                    variant="ghost"
                                    icon={<BanIcon className="size-4" />}
                                    onClick={() => setAction('dispose')}
                                    className="text-[#c52c32] hover:bg-low/10"
                                >
                                    Hapuskan
                                </Button>
                            )}
                        {(status === 'tersedia' || status === 'rusak') && (
                            <Button
                                variant="outline"
                                icon={<WrenchIcon className="size-[18px]" />}
                                onClick={() => setAction('service')}
                            >
                                Kirim servis
                            </Button>
                        )}
                        {status === 'diperbaiki' && (
                            <Button
                                icon={
                                    <PackageCheckIcon className="size-[18px]" />
                                }
                                onClick={() => setAction('complete')}
                            >
                                Selesai servis
                            </Button>
                        )}
                        {status === 'dipakai' && (
                            <Button
                                variant="outline"
                                icon={
                                    <ArrowDownTrayIcon className="size-[18px]" />
                                }
                                onClick={() => setAction('return')}
                            >
                                Kembalikan
                            </Button>
                        )}
                        {(status === 'tersedia' || status === 'dipakai') && (
                            <Button
                                icon={
                                    <ArrowUpTrayIcon className="size-[18px]" />
                                }
                                onClick={() => setAction('assign')}
                            >
                                {status === 'dipakai'
                                    ? 'Pindahkan'
                                    : 'Serahkan'}
                            </Button>
                        )}
                    </>
                }
            />

            <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
                <div className="flex flex-col gap-4">
                    <Card className="p-2">
                        <MediaFrame
                            src={asset.image_url}
                            alt={asset.name}
                            fallbackIcon={LaptopIcon}
                            className="aspect-[4/3] max-w-full"
                        />
                    </Card>

                    <Card>
                        <CardHeader title="Informasi aset" />
                        <dl className="flex flex-col divide-y divide-ink-100 px-5 pb-3 text-sm">
                            {details.map((detail) => (
                                <div
                                    key={detail.label}
                                    className="flex justify-between gap-4 py-2.5"
                                >
                                    <dt className="text-ink-500">
                                        {detail.label}
                                    </dt>
                                    <dd className="text-right font-medium text-ink-900">
                                        {detail.value}
                                    </dd>
                                </div>
                            ))}
                        </dl>
                    </Card>
                </div>

                <div className="flex min-w-0 flex-col gap-4">
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        <Card className="flex flex-col gap-4 p-5">
                            <span className="text-[13px] font-medium text-ink-500">
                                Pemegang saat ini
                            </span>
                            <HolderLabel
                                holder={asset.holder ?? null}
                                status={asset.status.value}
                                size="lg"
                            />
                            <dl className="grid grid-cols-2 gap-3 border-t border-ink-100 pt-4 text-sm">
                                <div className="flex flex-col gap-0.5">
                                    <dt className="text-xs text-ink-500">
                                        Sejak
                                    </dt>
                                    <dd className="font-medium text-ink-900">
                                        {holderSince
                                            ? formatDate(holderSince)
                                            : '—'}
                                    </dd>
                                </div>
                                <div className="flex flex-col gap-0.5">
                                    <dt className="text-xs text-ink-500">
                                        Kondisi
                                    </dt>
                                    <dd className="font-medium text-ink-900">
                                        {asset.condition ?? '—'}
                                    </dd>
                                </div>
                            </dl>
                        </Card>

                        <DepreciationCard
                            depreciation={depreciation}
                            purchasePrice={asset.purchase_price}
                            serviceCost={serviceCost}
                        />
                    </div>

                    <Card>
                        <CardHeader
                            title="Riwayat aset"
                            description="Pembelian, penyerahan, pengembalian, dan perbaikan"
                        />
                        <ol className="flex flex-col px-5 pb-5">
                            {histories.map((history, index) => {
                                const style = historyStyles[history.type.value];
                                const isLast = index === histories.length - 1;

                                return (
                                    <li key={history.id} className="flex gap-4">
                                        <div className="flex flex-col items-center">
                                            <span
                                                className={cn(
                                                    'flex size-9 shrink-0 items-center justify-center rounded-xl',
                                                    style.className,
                                                )}
                                            >
                                                <style.icon className="size-4" />
                                            </span>
                                            {!isLast && (
                                                <span className="w-px flex-1 bg-ink-200" />
                                            )}
                                        </div>
                                        <div
                                            className={cn(
                                                'flex min-w-0 flex-1 flex-col gap-1',
                                                !isLast && 'pb-6',
                                            )}
                                        >
                                            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                                                <span className="font-semibold text-ink-900">
                                                    {historyTitle(history)}
                                                </span>
                                                <span className="text-xs text-ink-500">
                                                    {formatDate(
                                                        history.occurred_on,
                                                    )}
                                                </span>
                                            </div>
                                            <HistoryMeta history={history} />
                                        </div>
                                    </li>
                                );
                            })}
                        </ol>
                    </Card>
                </div>
            </div>

            <AssetActionDialogs
                action={action}
                onClose={() => setAction(null)}
                asset={asset}
                today={today}
                minDate={lastHistoryDate}
                employees={employees}
                divisions={divisions}
                rooms={rooms}
                vendors={vendors}
            />
        </AppLayout>
    );
}

function historyTitle(history: AssetHistory): string {
    switch (history.type.value) {
        case 'penyerahan':
            return `Diserahkan ke ${history.holder?.name ?? '—'}`;
        case 'pengembalian':
            return `Dikembalikan oleh ${history.holder?.name ?? '—'}`;
        case 'perbaikan':
            return `Dikirim servis${history.vendor ? ` ke ${history.vendor}` : ''}`;
        case 'selesai_perbaikan':
            return 'Selesai servis';
        case 'penghapusan':
            return 'Dihapuskan dari daftar aset';
        default:
            return 'Dibeli';
    }
}

function HistoryMeta({ history }: { history: AssetHistory }) {
    const parts: string[] = [];

    if (history.holder?.detail) {
        parts.push(
            `${history.holder.type === 'room' ? 'Ruangan' : 'Divisi'} ${history.holder.detail}`,
        );
    }

    if (history.type.value === 'pembelian' && history.vendor) {
        parts.push(history.vendor);
    }

    if (history.condition) {
        parts.push(`Kondisi: ${history.condition}`);
    }

    if (history.cost !== null) {
        parts.push(
            `${history.type.value === 'pembelian' ? 'Harga' : 'Biaya'} ${formatRupiah(history.cost)}`,
        );
    }

    return (
        <div className="flex flex-col gap-1 text-[13px] text-ink-500">
            {parts.length > 0 && <span>{parts.join(' · ')}</span>}
            {history.notes && (
                <span className="rounded-lg bg-ink-50 px-3 py-2 text-ink-700">
                    {history.notes}
                </span>
            )}
        </div>
    );
}

type DepreciationCardProps = {
    depreciation: Depreciation | null;
    purchasePrice: number;
    serviceCost: number;
};

function DepreciationCard({
    depreciation,
    purchasePrice,
    serviceCost,
}: DepreciationCardProps) {
    if (!depreciation) {
        return (
            <Card className="flex flex-col gap-3 p-5">
                <span className="text-[13px] font-medium text-ink-500">
                    Nilai aset
                </span>
                <span className="text-2xl font-semibold tracking-[-0.01em] text-ink-900 tabular-nums">
                    {formatRupiah(purchasePrice)}
                </span>
                <p className="text-[13px] text-ink-500">
                    Penyusutan tidak diaktifkan untuk aset ini, jadi nilainya
                    dicatat sebesar harga perolehan.
                </p>
                {serviceCost > 0 && (
                    <p className="border-t border-ink-100 pt-3 text-[13px] text-ink-500">
                        Total biaya servis:{' '}
                        <strong className="font-semibold text-ink-900">
                            {formatRupiah(serviceCost)}
                        </strong>
                    </p>
                )}
            </Card>
        );
    }

    const used =
        (depreciation.months_elapsed / depreciation.useful_life_months) * 100;

    return (
        <Card className="flex flex-col gap-3 p-5">
            <span className="text-[13px] font-medium text-ink-500">
                Nilai buku hari ini
            </span>
            <span className="text-2xl font-semibold tracking-[-0.01em] text-ink-900 tabular-nums">
                {formatRupiah(depreciation.book_value)}
            </span>
            <div className="flex flex-col gap-1.5">
                <span className="h-2 overflow-hidden rounded-full bg-ink-100">
                    <span
                        className="block h-full rounded-full bg-brand-600"
                        style={{ width: `${used}%` }}
                    />
                </span>
                <span className="flex justify-between text-xs text-ink-500">
                    <span>
                        {depreciation.months_elapsed} dari{' '}
                        {depreciation.useful_life_months} bulan masa manfaat
                    </span>
                    <span className="tabular-nums">{Math.round(used)}%</span>
                </span>
            </div>
            <dl className="grid grid-cols-2 gap-3 border-t border-ink-100 pt-3 text-sm">
                <div className="flex flex-col gap-0.5">
                    <dt className="text-xs text-ink-500">Penyusutan/bulan</dt>
                    <dd className="font-medium text-ink-900 tabular-nums">
                        {formatRupiah(depreciation.monthly)}
                    </dd>
                </div>
                <div className="flex flex-col gap-0.5">
                    <dt className="text-xs text-ink-500">Biaya servis</dt>
                    <dd className="font-medium text-ink-900 tabular-nums">
                        {formatRupiah(serviceCost)}
                    </dd>
                </div>
            </dl>
        </Card>
    );
}
