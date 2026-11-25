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

class StoreIncomingTransactionRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * Each line either points at an existing item (`item_id`) or describes a
     * brand-new item (`new_item`) that is created together with the receipt.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'transacted_on' => ['required', 'date', 'before_or_equal:today'],
            'purchased_on' => ['required', 'date', 'before_or_equal:today', 'before_or_equal:transacted_on'],
            'supplier_name' => ['required', 'string', 'max:255'],
            'pic_name' => ['required', 'string', 'max:255'],
            'receipt' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
            'notes' => ['nullable', 'string', 'max:500'],
            'lines' => ['required', 'array', 'min:1', 'max:50'],
            'lines.*.item_id' => ['nullable', 'required_without:lines.*.new_item', 'integer', 'distinct', 'exists:items,id'],
            'lines.*.new_item' => ['nullable', 'array'],
            'lines.*.new_item.name' => ['required_without:lines.*.item_id', 'nullable', 'string', 'max:255'],
            'lines.*.new_item.variant' => ['nullable', 'string', 'max:100'],
            'lines.*.new_item.category_id' => [
                'required_without:lines.*.item_id',
                'nullable',
                'integer',
                Rule::exists('categories', 'id')->where('type', CategoryType::Persediaan->value)->whereNotNull('parent_id'),
            ],
            'lines.*.new_item.unit' => ['required_without:lines.*.item_id', 'nullable', 'string', 'max:20'],
            'lines.*.new_item.location' => ['nullable', 'string', 'max:100'],
            'lines.*.new_item.minimum_stock' => ['nullable', 'integer', 'min:0', 'max:1000000'],
            'lines.*.quantity' => ['required', 'integer', 'min:1', 'max:1000000'],
            'lines.*.unit_price' => ['required', 'numeric', 'min:0', 'max:1000000000'],
            'lines.*.photo' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        ];
    }

    /**
     * Reject new items that already exist, so stock is not split over duplicates.
     *
     * @return array<int, Closure(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $seen = [];

                foreach ((array) $this->input('lines', []) as $index => $line) {
                    $name = trim((string) data_get($line, 'new_item.name', ''));

                    if ($name === '' || data_get($line, 'item_id')) {
                        continue;
                    }

                    $variant = trim((string) data_get($line, 'new_item.variant', ''));
                    $key = Str::lower($name.'|'.$variant);

                    $existing = Item::query()
                        ->whereRaw('LOWER(name) = ?', [Str::lower($name)])
                        ->whereRaw("LOWER(COALESCE(variant, '')) = ?", [Str::lower($variant)])
                        ->first();

                    if ($existing) {
                        $validator->errors()->add(
                            "lines.{$index}.new_item.name",
                            "Barang ini sudah terdaftar dengan kode {$existing->code}. Pilih dari daftar barang.",
                        );
                    } elseif (isset($seen[$key])) {
                        $validator->errors()->add("lines.{$index}.new_item.name", 'Barang baru ini ditulis dua kali.');
                    }

                    $seen[$key] = true;
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
            'transacted_on.before_or_equal' => 'Tanggal terima tidak boleh melewati hari ini.',
            'purchased_on.required' => 'Tulis tanggal pembelian barang.',
            'purchased_on.date' => 'Tanggal pembelian tidak valid.',
            'purchased_on.before_or_equal' => 'Tanggal pembelian tidak boleh setelah tanggal terima barang.',
            'supplier_name.required' => 'Tulis nama supplier atau sumber barang.',
            'pic_name.required' => 'Tulis nama PIC yang menerima barang.',
            'receipt.image' => 'Bukti nota harus berupa foto.',
            'receipt.mimes' => 'Foto nota harus JPG, PNG, atau WEBP.',
            'receipt.max' => 'Ukuran foto nota maksimal 5 MB.',
            'lines.required' => 'Tambahkan minimal satu barang.',
            'lines.min' => 'Tambahkan minimal satu barang.',
            'lines.*.item_id.distinct' => 'Barang ini sudah ada di daftar.',
            'lines.*.new_item.name.required_without' => 'Tulis nama barang baru.',
            'lines.*.new_item.category_id.required_without' => 'Pilih jenis barang baru.',
            'lines.*.new_item.unit.required_without' => 'Tulis satuan barang baru.',
            'lines.*.quantity.required' => 'Isi jumlahnya.',
            'lines.*.quantity.min' => 'Jumlah minimal 1.',
            'lines.*.unit_price.required' => 'Isi harga satuan.',
            'lines.*.photo.image' => 'Foto barang harus berupa gambar.',
            'lines.*.photo.mimes' => 'Foto barang harus JPG, PNG, atau WEBP.',
            'lines.*.photo.max' => 'Ukuran foto barang maksimal 5 MB.',
        ];
    }
}
