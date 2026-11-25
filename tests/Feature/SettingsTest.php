<?php

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia as Assert;

test('signed-in users can open their settings', function () {
    $this->actingAs(User::factory()->create())
        ->get(route('settings.edit'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('settings'));
});

test('secretaries see the extra access an admin gave them', function () {
    $user = User::factory()->create(['permissions' => ['items.create', 'transactions.cancel']]);

    $this->actingAs($user)
        ->get(route('settings.edit'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('grantedPermissions', ['Tambah perlengkapan', 'Batalkan transaksi'])
        );
});

test('guests are sent to the login page', function () {
    $this->get(route('settings.edit'))->assertRedirect(route('login'));
});

test('users can update their own name and email', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->from(route('settings.edit'))
        ->put(route('settings.profile.update'), [
            'name' => 'Sinta Lestari',
            'email' => 'sinta@investa.test',
        ])
        ->assertRedirect(route('settings.edit'))
        ->assertSessionHasNoErrors();

    expect($user->refresh())
        ->name->toBe('Sinta Lestari')
        ->email->toBe('sinta@investa.test');
});

test('users can keep their own email when saving the profile', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->put(route('settings.profile.update'), [
            'name' => 'Nama Baru',
            'email' => $user->email,
        ])
        ->assertSessionHasNoErrors();
});

test('the profile email cannot belong to another account', function () {
    $other = User::factory()->create();

    $this->actingAs(User::factory()->create())
        ->put(route('settings.profile.update'), [
            'name' => 'Siapa',
            'email' => $other->email,
        ])
        ->assertSessionHasErrors('email');
});

test('the profile update cannot change the role', function () {
    $user = User::factory()->create();
    $originalRole = $user->role;

    $this->actingAs($user)
        ->put(route('settings.profile.update'), [
            'name' => $user->name,
            'email' => $user->email,
            'role' => 'admin',
        ]);

    expect($user->refresh()->role)->toBe($originalRole);
});

test('users can change their password with the current one', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->put(route('settings.password.update'), [
            'current_password' => 'password',
            'password' => 'kata-sandi-baru',
            'password_confirmation' => 'kata-sandi-baru',
        ])
        ->assertSessionHasNoErrors();

    expect(Hash::check('kata-sandi-baru', $user->refresh()->password))->toBeTrue();
});

test('the password is not changed when the current one is wrong', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->put(route('settings.password.update'), [
            'current_password' => 'salah-total',
            'password' => 'kata-sandi-baru',
            'password_confirmation' => 'kata-sandi-baru',
        ])
        ->assertSessionHasErrors('current_password');

    expect(Hash::check('password', $user->refresh()->password))->toBeTrue();
});

test('the new password must be confirmed', function () {
    $this->actingAs(User::factory()->create())
        ->put(route('settings.password.update'), [
            'current_password' => 'password',
            'password' => 'kata-sandi-baru',
            'password_confirmation' => 'beda',
        ])
        ->assertSessionHasErrors('password');
});
