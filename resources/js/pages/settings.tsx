import { Form, router, usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { startGuidedTour } from '@/components/guided-tour';
import { HelpIcon } from '@/components/icons';
import { Button, ButtonLink } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { Field, inputClasses } from '@/components/ui/field';
import { PageHeader } from '@/components/ui/page-header';
import { Badge } from '@/components/ui/status-badge';
import { Switch } from '@/components/ui/switch';
import AppLayout from '@/layouts/app-layout';
import { initials } from '@/lib/format';
import { dashboard, guide } from '@/routes';
import { preference as guidePreference } from '@/routes/guide';
import { update as updatePassword } from '@/routes/settings/password';
import { update as updateProfile } from '@/routes/settings/profile';

export default function Settings({
    grantedPermissions,
}: {
    grantedPermissions: string[];
}) {
    const { user } = usePage().props.auth;
    const [showGuideOnLogin, setShowGuideOnLogin] = useState(
        user?.show_guide_on_login ?? true,
    );
    const isAdmin = user?.role === 'admin';

    function changeGuidePreference(checked: boolean) {
        setShowGuideOnLogin(checked);
        router.patch(
            guidePreference.url(),
            { show_guide_on_login: checked },
            { preserveScroll: true, preserveState: true },
        );
    }

    return (
        <AppLayout
            title="Pengaturan"
            breadcrumbs={[
                { title: 'Beranda', href: dashboard.url() },
                { title: 'Pengaturan' },
            ]}
        >
            <PageHeader
                title="Pengaturan Akun"
                description="Ubah nama, email, dan kata sandi akun Anda sendiri."
            />

            <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
                <div className="flex flex-col gap-6">
                    <Card>
                        <CardHeader
                            title="Profil"
                            description="Nama ini tercatat di setiap transaksi yang Anda buat."
                        />
                        <Form
                            {...updateProfile.form()}
                            options={{ preserveScroll: true }}
                            className="flex flex-col gap-4 px-5 pb-5"
                        >
                            {({ errors, processing }) => (
                                <>
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <Field
                                            label="Nama"
                                            htmlFor="profile-name"
                                            error={errors.name}
                                        >
                                            <input
                                                id="profile-name"
                                                name="name"
                                                defaultValue={user?.name}
                                                required
                                                autoComplete="name"
                                                aria-invalid={Boolean(
                                                    errors.name,
                                                )}
                                                className={inputClasses}
                                            />
                                        </Field>
                                        <Field
                                            label="Email"
                                            htmlFor="profile-email"
                                            hint="Dipakai untuk masuk"
                                            error={errors.email}
                                        >
                                            <input
                                                id="profile-email"
                                                name="email"
                                                type="email"
                                                defaultValue={user?.email}
                                                required
                                                autoComplete="email"
                                                aria-invalid={Boolean(
                                                    errors.email,
                                                )}
                                                className={inputClasses}
                                            />
                                        </Field>
                                    </div>
                                    <FormActions>
                                        <Button
                                            type="submit"
                                            disabled={processing}
                                        >
                                            {processing
                                                ? 'Menyimpan…'
                                                : 'Simpan profil'}
                                        </Button>
                                    </FormActions>
                                </>
                            )}
                        </Form>
                    </Card>

                    <Card>
                        <CardHeader
                            title="Ganti kata sandi"
                            description="Masukkan kata sandi sekarang, lalu kata sandi baru minimal 8 karakter."
                        />
                        <Form
                            {...updatePassword.form()}
                            options={{ preserveScroll: true }}
                            resetOnSuccess
                            resetOnError
                            className="flex flex-col gap-4 px-5 pb-5"
                        >
                            {({ errors, processing }) => (
                                <>
                                    <Field
                                        label="Kata sandi sekarang"
                                        htmlFor="current-password"
                                        error={errors.current_password}
                                    >
                                        <input
                                            id="current-password"
                                            name="current_password"
                                            type="password"
                                            required
                                            autoComplete="current-password"
                                            aria-invalid={Boolean(
                                                errors.current_password,
                                            )}
                                            className={inputClasses}
                                        />
                                    </Field>
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <Field
                                            label="Kata sandi baru"
                                            htmlFor="new-password"
                                            hint="Minimal 8 karakter"
                                            error={errors.password}
                                        >
                                            <input
                                                id="new-password"
                                                name="password"
                                                type="password"
                                                required
                                                autoComplete="new-password"
                                                aria-invalid={Boolean(
                                                    errors.password,
                                                )}
                                                className={inputClasses}
                                            />
                                        </Field>
                                        <Field
                                            label="Ulangi kata sandi baru"
                                            htmlFor="new-password-confirmation"
                                        >
                                            <input
                                                id="new-password-confirmation"
                                                name="password_confirmation"
                                                type="password"
                                                required
                                                autoComplete="new-password"
                                                className={inputClasses}
                                            />
                                        </Field>
                                    </div>
                                    <FormActions>
                                        <Button
                                            type="submit"
                                            disabled={processing}
                                        >
                                            {processing
                                                ? 'Menyimpan…'
                                                : 'Ganti kata sandi'}
                                        </Button>
                                    </FormActions>
                                </>
                            )}
                        </Form>
                    </Card>
                </div>

                <div className="flex flex-col gap-6">
                    <Card>
                        <div className="flex items-center gap-4 p-5">
                            <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-brand-100 text-lg font-bold text-brand-800">
                                {user ? initials(user.name) : ''}
                            </span>
                            <div className="flex min-w-0 flex-col gap-1.5">
                                <span className="truncate font-semibold text-ink-900">
                                    {user?.name}
                                </span>
                                <span>
                                    <Badge tone={isAdmin ? 'blue' : 'gray'}>
                                        {isAdmin ? 'Admin' : 'Sekretaris'}
                                    </Badge>
                                </span>
                            </div>
                        </div>
                        <div className="flex flex-col gap-3 border-t border-ink-100 px-5 py-4 text-[13px] text-ink-500">
                            <p>
                                {isAdmin
                                    ? 'Admin bisa melakukan semuanya: master data, akun pengguna, pembatalan transaksi, dan penghapusan aset.'
                                    : 'Sekretaris mencatat barang masuk dan keluar, peralatan, cek stok, dan melihat laporan.'}
                            </p>
                            {!isAdmin && (
                                <div className="flex flex-col gap-1.5">
                                    <span className="font-semibold text-ink-700">
                                        Akses tambahan dari Admin
                                    </span>
                                    {grantedPermissions.length === 0 ? (
                                        <span>
                                            Belum ada. Hubungi Admin jika Anda
                                            perlu akses lain.
                                        </span>
                                    ) : (
                                        <ul className="flex flex-wrap gap-1.5">
                                            {grantedPermissions.map((label) => (
                                                <li key={label}>
                                                    <Badge
                                                        tone="blue"
                                                        variant="soft"
                                                    >
                                                        {label}
                                                    </Badge>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            )}
                        </div>
                    </Card>

                    <Card>
                        <CardHeader
                            title="Tur & panduan"
                            description="Tur menyorot setiap menu dan menjelaskan kegunaannya."
                        />
                        <div className="flex flex-col gap-4 px-5 pb-5">
                            <Switch
                                id="settings-guide-on-login"
                                label="Tawarkan tur setiap kali login"
                                checked={showGuideOnLogin}
                                onChange={changeGuidePreference}
                            />
                            <div className="flex flex-wrap gap-2">
                                <Button
                                    variant="soft"
                                    size="sm"
                                    icon={<HelpIcon className="size-4" />}
                                    onClick={startGuidedTour}
                                >
                                    Mulai tur sekarang
                                </Button>
                                <ButtonLink
                                    href={guide.url()}
                                    variant="ghost"
                                    size="sm"
                                >
                                    Buka panduan
                                </ButtonLink>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}

function FormActions({ children }: { children: ReactNode }) {
    return (
        <div className="flex justify-end border-t border-ink-100 pt-4">
            {children}
        </div>
    );
}
