export type User = {
    id: number;
    name: string;
    email: string;
    role: 'admin' | 'sekretaris';
    show_guide_on_login: boolean;
};

export type Auth = {
    user: User | null;
    canManageMasterData: boolean;
};
