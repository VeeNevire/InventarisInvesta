<?php

namespace App\Http\Requests\Asset;

use Illuminate\Contracts\Validation\ValidationRule;

class SendAssetToServiceRequest extends AssetMovementRequest
{
    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'occurred_on' => $this->dateRules(),
            'vendor' => ['required', 'string', 'max:255'],
            'issue' => ['required', 'string', 'max:500'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            ...parent::messages(),
            'vendor.required' => 'Tulis tempat servisnya.',
            'issue.required' => 'Tulis keluhan atau kerusakannya.',
        ];
    }
}
