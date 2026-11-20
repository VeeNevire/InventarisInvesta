<?php

namespace App\Http\Requests\Asset;

use App\Enums\Permission;
use Illuminate\Contracts\Validation\ValidationRule;

class DisposeAssetRequest extends AssetMovementRequest
{
    /**
     * Disposing is permanent, so it needs its own permission.
     */
    public function authorize(): bool
    {
        return $this->user()?->can(Permission::DisposeAssets->value) ?? false;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'occurred_on' => $this->dateRules(),
            'reason' => ['required', 'string', 'min:5', 'max:500'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            ...parent::messages(),
            'reason.required' => 'Tulis alasan penghapusan.',
            'reason.min' => 'Alasan minimal 5 karakter.',
        ];
    }
}
