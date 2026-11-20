<?php

namespace App\Http\Requests\Master;

use App\Enums\UserRole;
use App\Models\User;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\Validator;

class SaveUserRequest extends FormRequest
{
    /**
     * Access is limited to admins by the route middleware.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique('users', 'email')->ignore($this->route('user'))],
            'role' => ['required', Rule::enum(UserRole::class)],
            'password' => [$this->route('user') ? 'nullable' : 'required', 'string', Password::min(8), 'confirmed'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.required' => 'Nama wajib diisi.',
            'email.required' => 'Email wajib diisi.',
            'email.email' => 'Format email tidak valid.',
            'email.unique' => 'Email ini sudah dipakai akun lain.',
            'password.required' => 'Kata sandi wajib diisi.',
            'password.min' => 'Kata sandi minimal 8 karakter.',
            'password.confirmed' => 'Konfirmasi kata sandi tidak sama.',
        ];
    }

    /**
     * Keep at least one admin, so nobody locks the team out of master data.
     *
     * @return array<int, Closure(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $user = $this->route('user');

                if (! $user instanceof User || ! $user->isAdmin() || $this->input('role') === UserRole::Admin->value) {
                    return;
                }

                if ($user->is($this->user())) {
                    $validator->errors()->add('role', 'Anda tidak bisa menurunkan peran akun sendiri.');

                    return;
                }

                if (User::query()->where('role', UserRole::Admin)->count() <= 1) {
                    $validator->errors()->add('role', 'Harus ada minimal satu Admin.');
                }
            },
        ];
    }
}
