export type User = {
    id: number;
    name: string;
    email: string;
    role: 'admin' | 'sekretaris';
    show_guide_on_login: boolean;
};

/** Extra access an admin can tick for a Sekretaris; admins have all of it. */
export type Permission =
    | 'items.create'
    | 'items.update'
    | 'items.delete'
    | 'assets.update'
    | 'assets.dispose'
    | 'transactions.cancel'
    | 'master.employees'
    | 'master.places'
    | 'master.categories';

export type Auth = {
    user: User | null;
    can: Record<Permission | 'manage-users', boolean>;
    canAccessMasterData: boolean;
};
