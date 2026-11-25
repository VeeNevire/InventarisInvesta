import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { AssetStatus, StockStatus, TransactionType } from '@/types';

type Tone = 'green' | 'red' | 'gray' | 'blue' | 'amber' | 'slate';

const solidTones: Record<Tone, string> = {
    green: 'bg-ok text-white',
    red: 'bg-low text-white',
    gray: 'bg-empty text-white',
    blue: 'bg-brand-700 text-white',
    amber: 'bg-service text-white',
    slate: 'bg-ink-700 text-white',
};

const softTones: Record<Tone, string> = {
    green: 'bg-ok/10 text-ok',
    red: 'bg-low/10 text-low-ink',
    gray: 'bg-ink-100 text-ink-700',
    blue: 'bg-brand-50 text-brand-700',
    amber: 'bg-service/10 text-sun-700',
    slate: 'bg-ink-100 text-ink-700',
};

export const stockStatusTone: Record<StockStatus, Tone> = {
    aman: 'green',
    menipis: 'red',
    habis: 'gray',
};

export const assetStatusTone: Record<AssetStatus, Tone> = {
    tersedia: 'green',
    dipakai: 'blue',
    diperbaiki: 'amber',
    rusak: 'red',
    dihapuskan: 'gray',
};

export const transactionTone: Record<TransactionType, Tone> = {
    masuk: 'green',
    keluar: 'blue',
    penyesuaian: 'slate',
};

type BadgeProps = {
    tone: Tone;
    variant?: 'solid' | 'soft';
    children: ReactNode;
    className?: string;
};

export function Badge({
    tone,
    variant = 'solid',
    children,
    className,
}: BadgeProps) {
    return (
        <span
            className={cn(
                'inline-flex items-center gap-1 rounded-md px-2 py-[3px] text-xs font-medium whitespace-nowrap',
                variant === 'solid' ? solidTones[tone] : softTones[tone],
                className,
            )}
        >
            {children}
        </span>
    );
}
