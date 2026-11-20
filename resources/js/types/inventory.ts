export type Option<T extends string = string> = {
    value: T;
    label: string;
};

export type StockStatus = 'aman' | 'menipis' | 'habis';

export type AssetStatus =
    | 'tersedia'
    | 'dipakai'
    | 'diperbaiki'
    | 'rusak'
    | 'dihapuskan';

export type TransactionType = 'masuk' | 'keluar' | 'penyesuaian';

export type CategoryRef = {
    parent_name?: string | null;
    code: string;
    name: string;
};

export type Item = {
    id: number;
    code: string;
    name: string;
    variant: string | null;
    unit: string;
    location: string | null;
    minimum_stock: number;
    notify_low_stock: boolean;
    current_stock: number;
    average_price: number;
    stock_value: number;
    status: Option<StockStatus>;
    image_url: string | null;
    description: string | null;
    category?: CategoryRef;
};

export type TransactionLine = {
    item_code: string;
    item_name: string;
    unit: string;
    quantity: number;
};

export type StockTransaction = {
    id: number;
    number: string;
    type: Option<TransactionType>;
    transacted_on: string;
    counterpart: string | null;
    purpose: string | null;
    is_cancelled: boolean;
    lines?: TransactionLine[];
};

export type StockCardEntry = {
    id: number;
    number: string;
    type: Option<TransactionType>;
    transacted_on: string;
    description: string;
    quantity_in: number | null;
    quantity_out: number | null;
    unit_price: number;
    balance_after: number | null;
    is_cancelled: boolean;
    cancellation_reason: string | null;
};

export type Holder = {
    type: 'employee' | 'room';
    name: string;
    detail: string | null;
};

export type Asset = {
    id: number;
    code: string;
    name: string;
    brand: string | null;
    model: string | null;
    serial_number: string | null;
    specification: string | null;
    purchased_on: string | null;
    purchase_price: number;
    status: Option<AssetStatus>;
    condition: string | null;
    holder?: Holder | null;
    is_depreciated: boolean;
    image_url: string | null;
    category?: CategoryRef;
    supplier?: string | null;
};

export type AssetHistory = {
    id: number;
    type: Option<
        | 'pembelian'
        | 'penyerahan'
        | 'pengembalian'
        | 'perbaikan'
        | 'selesai_perbaikan'
        | 'penghapusan'
    >;
    occurred_on: string;
    holder: Holder | null;
    condition: string | null;
    vendor: string | null;
    cost: number | null;
    notes: string | null;
};

export type Depreciation = {
    months_elapsed: number;
    useful_life_months: number;
    monthly: number;
    accumulated: number;
    book_value: number;
};

export type LowStockAlert = {
    code: string;
    name: string;
    unit: string;
    current_stock: number;
    minimum_stock: number;
};

export type BreadcrumbItem = {
    title: string;
    href?: string;
};

export type TransactionHistoryEntry = Omit<StockTransaction, 'lines'> & {
    reference: string | null;
    purchased_on: string | null;
    receipt_url: string | null;
    notes: string | null;
    cancellation_reason: string | null;
    cancelled_at: string | null;
    recorded_by: string | null;
    pic_name: string | null;
    cancelled_by: string | null;
    can_cancel: boolean;
    lines: (TransactionLine & { unit_price: number })[];
};

export type FormItemOption = {
    id: number;
    code: string;
    name: string;
    variant: string | null;
    unit: string;
    category: string;
    current_stock: number;
    minimum_stock: number;
    average_price: number;
    image_url: string | null;
};

export type Pagination = {
    current_page: number;
    last_page: number;
    total: number;
    from: number | null;
    to: number | null;
    prev_url: string | null;
    next_url: string | null;
};
