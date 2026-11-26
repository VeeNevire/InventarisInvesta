<?php

namespace App\Http\Requests;

use App\Enums\CategoryType;
use App\Models\Item;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class SaveItemRequest extends FormRequest
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
            'code' => ['prohibited'],
            'category_id' => ['required', 'integer', Rule::exists('categories', 'id')->where('type', CategoryType::Persediaan->value)->whereNotNull('parent_id')],
            ...self::attributeRules(),
            'photo' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
            'remove_photo' => ['boolean'],
        ];
    }

    /**
     * Rules for the descriptive item fields, shared with the Excel import.
     *
     * @return array<string, list<string>>
     */
    public static function attributeRules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'variant' => ['nullable', 'string', 'max:100'],
            'unit' => ['required', 'string', 'max:20'],
            'location' => ['nullable', 'string', 'max:100'],
            'minimum_stock' => ['required', 'integer', 'min:0', 'max:1000000'],
            'notify_low_stock' => ['boolean'],
            'description' => ['nullable', 'string', 'max:1000'],
        ];
    }

    /**
     * Messages for the shared code and attribute rules.
     *
     * @return array<string, string>
     */
    public static function attributeMessages(): array
    {
        return [
            'code.alpha_dash' => 'Kode hanya boleh berisi huruf, angka, tanda hubung, dan garis bawah.',
            'name.required' => 'Nama barang wajib diisi.',
            'unit.required' => 'Satuan wajib diisi.',
            'minimum_stock.required' => 'Isi stok minimum (boleh 0).',
        ];
    }

    /**
     * Reject a name and variant pair that another item already uses.
     *
     * @return array<int, Closure(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $current = $this->route('item');
                $currentId = $current instanceof Item ? $current->id : null;

                $existing = Item::query()
                    ->whereRaw('LOWER(name) = ?', [Str::lower(trim((string) $this->input('name')))])
                    ->whereRaw("LOWER(COALESCE(variant, '')) = ?", [Str::lower(trim((string) $this->input('variant')))])
                    ->when($currentId, fn ($query, int $id) => $query->whereKeyNot($id))
                    ->first();

                if ($existing) {
                    $validator->errors()->add('name', "Perlengkapan dengan nama dan varian ini sudah ada ({$existing->code}).");
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
            ...self::attributeMessages(),
            'code.prohibited' => 'Kode dibuat otomatis dari kategori dan subkategori.',
            'category_id.required' => 'Pilih subkategori.',
            'category_id.exists' => 'Pilih subkategori.',
            'photo.image' => 'Foto harus berupa gambar.',
            'photo.mimes' => 'Foto harus JPG, PNG, atau WEBP.',
            'photo.max' => 'Ukuran foto maksimal 5 MB.',
        ];
    }
}
