import type { Auth } from '@/types/auth';
import type { LowStockAlert } from '@/types/inventory';

declare module 'react' {
    interface InputHTMLAttributes<T> {
        passwordrules?: string;
    }
}

declare module '@inertiajs/core' {
    export interface InertiaConfig {
        sharedPageProps: {
            name: string;
            auth: Auth;
            lowStockAlerts: LowStockAlert[];
            offerGuide: boolean;
            sidebarOpen: boolean;
            [key: string]: unknown;
        };
        flashDataType: {
            toast?: { type: 'success' | 'error'; message: string };
        };
    }
}
