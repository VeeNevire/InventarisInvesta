<?php

use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('signed-in users can open the guide', function () {
    $this->actingAs(User::factory()->create())
        ->get(route('guide'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('guide'));
});

test('guests are sent to the login page', function () {
    $this->get(route('guide'))->assertRedirect(route('login'));
});

test('the tour is offered right after login', function () {
    $user = User::factory()->create();

    $this->post(route('login.store'), ['email' => $user->email, 'password' => 'password']);

    $this->get(route('dashboard'))
        ->assertInertia(fn (Assert $page) => $page->where('offerGuide', true));

    $this->get(route('dashboard'))
        ->assertInertia(fn (Assert $page) => $page->where('offerGuide', false));
});

test('users can turn the tour offer off', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->patch(route('guide.preference'), ['show_guide_on_login' => false])
        ->assertRedirect();

    expect($user->refresh()->show_guide_on_login)->toBeFalse();

    auth()->logout();
    $this->post(route('login.store'), ['email' => $user->email, 'password' => 'password']);

    $this->get(route('dashboard'))
        ->assertInertia(fn (Assert $page) => $page->where('offerGuide', false));
});

test('the tour preference must be a boolean', function () {
    $this->actingAs(User::factory()->create())
        ->patch(route('guide.preference'), ['show_guide_on_login' => 'kadang'])
        ->assertSessionHasErrors('show_guide_on_login');
});
