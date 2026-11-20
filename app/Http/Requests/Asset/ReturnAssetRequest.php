<?php

namespace App\Http\Requests\Asset;

use App\Services\AssetCustodian;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Validation\Rule;

class ReturnAssetRequest extends AssetMovementRequest
{
    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'occurred_on' => $this->dateRules(),
            'condition' => ['required', Rule::in([
                AssetCustodian::CONDITION_GOOD,
                AssetCustodian::CONDITION_NEEDS_SERVICE,
                AssetCustodian::CONDITION_BROKEN,
            ])],
            'notes' => ['nullable', 'string', 'max:500'],
        ];
    }
}
