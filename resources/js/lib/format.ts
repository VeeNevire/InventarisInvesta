const numberFormatter = new Intl.NumberFormat('id-ID');

const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'Mei',
    'Jun',
    'Jul',
    'Agu',
    'Sep',
    'Okt',
    'Nov',
    'Des',
];

const fullMonths = [
    'Januari',
    'Februari',
    'Maret',
    'April',
    'Mei',
    'Juni',
    'Juli',
    'Agustus',
    'September',
    'Oktober',
    'November',
    'Desember',
];

export function formatNumber(value: number): string {
    return numberFormatter.format(Math.round(value));
}

export function formatRupiah(value: number): string {
    return `Rp${numberFormatter.format(Math.round(value))}`;
}

/**
 * Compact rupiah for tight spaces, e.g. Rp7,6 jt.
 */
export function formatRupiahCompact(value: number): string {
    if (Math.abs(value) >= 1_000_000_000) {
        return `Rp${(value / 1_000_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} M`;
    }

    if (Math.abs(value) >= 1_000_000) {
        return `Rp${(value / 1_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} jt`;
    }

    if (Math.abs(value) >= 1_000) {
        return `Rp${(value / 1_000).toLocaleString('id-ID', { maximumFractionDigits: 0 })} rb`;
    }

    return formatRupiah(value);
}

/**
 * Format a Y-m-d date as "18 Nov 2026" without timezone shifts.
 */
export function formatDate(date: string | null): string {
    if (!date) {
        return '—';
    }

    const [year, month, day] = date.split('-').map(Number);

    return `${day} ${months[month - 1]} ${year}`;
}

export function formatMonth(yearMonth: string, full = false): string {
    const [year, month] = yearMonth.split('-').map(Number);

    return full ? `${fullMonths[month - 1]} ${year}` : months[month - 1];
}

export function initials(name: string): string {
    return name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('');
}
