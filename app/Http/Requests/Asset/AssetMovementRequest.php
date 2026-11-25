<?php

namespace App\Http\Requests\Asset;

use App\Models\Asset;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Shared rules for recording something that happened to an asset.
 */
abstract class AssetMovementRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * The date may not be in the future, nor before the asset's last entry,
     * so the history always reads in order.
     *
     * @return list<string>
     */
    protected function dateRules(): array
    {
        $asset = $this->route('asset');
        $lastDate = $asset instanceof Asset
            ? $asset->histories()->max('occurred_on')
            : null;

        $rules = ['required', 'date', 'before_or_equal:today'];

        if ($lastDate) {
            $rules[] = 'after_or_equal:'.substr((string) $lastDate, 0, 10);
        }

        return $rules;
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'occurred_on.required' => 'Isi tanggalnya.',
            'occurred_on.before_or_equal' => 'Tanggal tidak boleh melewati hari ini.',
            'occurred_on.after_or_equal' => 'Tanggal tidak boleh sebelum catatan terakhir peralatan ini.',
        ];
    }
}
