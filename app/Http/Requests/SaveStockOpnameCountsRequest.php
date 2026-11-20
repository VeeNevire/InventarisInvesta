<?php

namespace App\Http\Requests;

use App\Models\StockOpname;
use App\Models\StockOpnameLine;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class SaveStockOpnameCountsRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $opname = $this->route('opname');

        return [
            'lines' => ['present', 'array'],
            'lines.*.id' => [
                'required',
                'integer',
                Rule::exists('stock_opname_lines', 'id')->where(
                    'stock_opname_id',
                    $opname instanceof StockOpname ? $opname->id : 0,
                ),
            ],
            'lines.*.counted_stock' => ['nullable', 'integer', 'min:0', 'max:10000000'],
            'lines.*.reason' => ['nullable', 'string', 'max:255'],
        ];
    }

    /**
     * When completing, every counted line that differs from the system needs
     * a reason, so the stock card explains the adjustment.
     *
     * @return array<int, Closure(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if (! $this->routeIs('stock-opnames.complete') || $validator->errors()->isNotEmpty()) {
                    return;
                }

                $lines = collect((array) $this->input('lines', []));
                $stocks = StockOpnameLine::query()
                    ->whereIn('id', $lines->pluck('id'))
                    ->with('item:id,current_stock')
                    ->get()
                    ->mapWithKeys(fn (StockOpnameLine $line): array => [$line->id => $line->item->current_stock]);

                foreach ($lines as $index => $line) {
                    $counted = data_get($line, 'counted_stock');

                    if ($counted === null || $counted === '') {
                        continue;
                    }

                    $differs = (int) $counted !== ($stocks[(int) data_get($line, 'id')] ?? null);

                    if ($differs && blank(data_get($line, 'reason'))) {
                        $validator->errors()->add("lines.{$index}.reason", 'Tulis alasan selisihnya.');
                    }
                }
            },
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'lines.*.counted_stock.integer' => 'Isi angka bulat.',
            'lines.*.counted_stock.min' => 'Tidak boleh minus.',
        ];
    }
}
