import { BoxIcon, DoorIcon, UserIcon, WrenchIcon } from '@/components/icons';
import { cn } from '@/lib/utils';
import type { AssetStatus, Holder } from '@/types';

type HolderLabelProps = {
    holder: Holder | null;
    status?: AssetStatus;
    size?: 'sm' | 'lg';
};

/**
 * Shows who holds an asset: an employee, a room, or nobody (in storage or
 * at the repair shop).
 */
export function HolderLabel({ holder, status, size = 'sm' }: HolderLabelProps) {
    const iconBox = size === 'lg' ? 'size-12 rounded-2xl' : 'size-9 rounded-xl';
    const iconSize = size === 'lg' ? 'size-6' : 'size-[18px]';

    if (!holder) {
        const isInService = status === 'diperbaiki';
        const isDisposed = status === 'dihapuskan';
        const Icon = isInService ? WrenchIcon : BoxIcon;

        return (
            <div className="flex items-center gap-3">
                <span
                    className={cn(
                        'flex shrink-0 items-center justify-center bg-ink-100 text-ink-500',
                        iconBox,
                    )}
                >
                    <Icon className={iconSize} />
                </span>
                <div className="flex min-w-0 flex-col">
                    <span
                        className={cn(
                            'font-medium text-ink-700',
                            size === 'lg' && 'text-lg',
                        )}
                    >
                        {isDisposed
                            ? 'Tidak ada'
                            : isInService
                              ? 'Di tempat servis'
                              : 'Di gudang'}
                    </span>
                    <span className="text-xs text-ink-500">
                        {isDisposed
                            ? 'Aset sudah dihapuskan'
                            : isInService
                              ? 'Belum kembali dari perbaikan'
                              : 'Belum diserahkan ke siapa pun'}
                    </span>
                </div>
            </div>
        );
    }

    const isRoom = holder.type === 'room';
    const Icon = isRoom ? DoorIcon : UserIcon;

    return (
        <div className="flex items-center gap-3">
            <span
                className={cn(
                    'flex shrink-0 items-center justify-center',
                    isRoom
                        ? 'bg-[#f1ecfb] text-[#6d3fc4]'
                        : 'bg-brand-50 text-brand-700',
                    iconBox,
                )}
            >
                <Icon className={iconSize} />
            </span>
            <div className="flex min-w-0 flex-col">
                <span
                    className={cn(
                        'truncate font-semibold text-ink-900',
                        size === 'lg' && 'text-lg',
                    )}
                >
                    {holder.name}
                </span>
                <span className="text-xs text-ink-500">
                    {isRoom ? 'Ruangan' : 'Karyawan'}
                    {holder.detail && ` · ${holder.detail}`}
                </span>
            </div>
        </div>
    );
}
