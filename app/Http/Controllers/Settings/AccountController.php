<?php

namespace App\Http\Controllers\Settings;

use App\Enums\Permission;
use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\UpdateProfileRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AccountController extends Controller
{
    /**
     * Show the signed-in user's own account settings.
     */
    public function edit(Request $request): Response
    {
        $user = $request->user();

        return Inertia::render('settings', [
            'grantedPermissions' => $user->isAdmin() ? [] : collect(Permission::cases())
                ->filter(fn (Permission $permission): bool => $user->hasPermission($permission))
                ->map(fn (Permission $permission): string => $permission->label())
                ->values()
                ->all(),
        ]);
    }

    /**
     * Update the signed-in user's name and email.
     */
    public function update(UpdateProfileRequest $request): RedirectResponse
    {
        $request->user()->update($request->validated());

        $this->toast('Profil diperbarui.');

        return back();
    }
}
