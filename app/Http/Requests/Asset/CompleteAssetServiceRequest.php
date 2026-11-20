<?php

namespace App\Http\Requests\Asset;

use App\Services\AssetCustodian;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Validation\Rule;

class CompleteAssetServiceRequest extends AssetMovementRequest
{
    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'occurred_on' => $this->dateRules(),
            'cost' => ['required', 'numeric', 'min:0', 'max:1000000000'],
            'condition' => ['required', Rule::in([AssetCustodian::CONDITION_GOOD, AssetCustodian::CONDITION_BROKEN])],
            'notes' => ['nullable', 'string', 'max:500'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            ...parent::messages(),
            'cost.required' => 'Isi biaya servis (boleh 0).',
        ];
    }
}
