<?php

namespace App\Http\Controllers\Master;

use App\Enums\Permission;
use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Master\SaveUserRequest;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class UserController extends Controller
{
    public function index(Request $request): Response
    {
        $adminCount = User::query()->where('role', UserRole::Admin)->count();

        return Inertia::render('master/users', [
            'users' => User::query()
                ->orderBy('name')
                ->get()
                ->map(fn (User $user): array => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role->value,
                    'permissions' => $user->isAdmin() ? [] : ($user->permissions ?? []),
                    'is_current' => $user->is($request->user()),
                    'can_delete' => ! $user->is($request->user()) && ! ($user->isAdmin() && $adminCount <= 1),
                ]),
            'permissionOptions' => collect(Permission::cases())->map(fn (Permission $permission): array => [
                'value' => $permission->value,
                'label' => $permission->label(),
                'description' => $permission->description(),
                'group' => $permission->group(),
            ]),
        ]);
    }

    public function store(SaveUserRequest $request): RedirectResponse
    {
        $user = User::query()->create([
            ...$request->safe()->except('permissions'),
            'permissions' => $request->permissions(),
        ]);

        $this->toast("Akun {$user->name} dibuat.");

        return back();
    }

    public function update(SaveUserRequest $request, User $user): RedirectResponse
    {
        $user->update([
            ...collect($request->safe()->except('permissions'))->filter(
                fn (mixed $value, string $key): bool => $key !== 'password' || filled($value),
            )->all(),
            'permissions' => $request->permissions(),
        ]);

        $this->toast("Akun {$user->name} diperbarui.");

        return back();
    }

    public function destroy(Request $request, User $user): RedirectResponse
    {
        if ($user->is($request->user())) {
            $this->toast('Anda tidak bisa menghapus akun sendiri.', 'error');

            return back();
        }

        if ($user->isAdmin() && User::query()->where('role', UserRole::Admin)->count() <= 1) {
            $this->toast('Harus ada minimal satu Admin.', 'error');

            return back();
        }

        $user->delete();
        $this->toast("Akun {$user->name} dihapus.");

        return back();
    }
}
