<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Enums\Permission;
use App\Enums\UserRole;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $name
 * @property string $email
 * @property UserRole $role
 * @property array<int, string>|null $permissions
 * @property bool $show_guide_on_login
 * @property Carbon|null $email_verified_at
 * @property string $password
 * @property string|null $remember_token
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['name', 'email', 'role', 'permissions', 'password', 'show_guide_on_login'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    public function isAdmin(): bool
    {
        return $this->role === UserRole::Admin;
    }

    /**
     * Admins can do everything; a Sekretaris only what was ticked for them.
     */
    public function hasPermission(Permission $permission): bool
    {
        return $this->isAdmin() || in_array($permission->value, $this->permissions ?? [], true);
    }

    /**
     * Whether any Master Data page is open to this user.
     */
    public function canAccessMasterData(): bool
    {
        return $this->isAdmin() || collect(Permission::cases())
            ->contains(fn (Permission $permission): bool => $permission->isMasterData() && $this->hasPermission($permission));
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'role' => UserRole::class,
            'permissions' => 'array',
            'show_guide_on_login' => 'boolean',
        ];
    }
}
