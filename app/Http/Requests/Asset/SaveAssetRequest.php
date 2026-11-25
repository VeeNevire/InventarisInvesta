<?php

namespace App\Http\Requests\Asset;

use App\Enums\CategoryType;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SaveAssetRequest extends FormRequest
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
        $isNewCategory = $this->isMethod('post') && $this->boolean('new_category');

        return [
            'new_category' => ['sometimes', 'boolean'],
            'category_parent_id' => [$isNewCategory ? 'required' : 'prohibited', 'integer', Rule::exists('categories', 'id')->where('type', CategoryType::Aset->value)->whereNull('parent_id')],
            'category_name' => [$isNewCategory ? 'required' : 'prohibited', 'string', 'max:100'],
            'category_code' => [$isNewCategory ? 'required' : 'prohibited', 'string', 'min:2', 'max:5', 'alpha', Rule::unique('categories', 'code')->where('type', CategoryType::Aset->value)],
            'category_id' => [$isNewCategory ? 'nullable' : 'required', 'integer', Rule::exists('categories', 'id')->where('type', CategoryType::Aset->value)->whereNotNull('parent_id')],
            'name' => ['required', 'string', 'max:255'],
            'brand' => ['nullable', 'string', 'max:100'],
            'model' => ['nullable', 'string', 'max:100'],
            'serial_number' => ['nullable', 'string', 'max:100', Rule::unique('assets', 'serial_number')->ignore($this->route('asset'))],
            'specification' => ['nullable', 'string', 'max:1000'],
            'purchased_on' => ['required', 'date', 'before_or_equal:today'],
            'purchase_price' => ['required', 'numeric', 'min:0', 'max:100000000000'],
            'supplier_name' => ['nullable', 'string', 'max:255'],
            'is_depreciated' => ['boolean'],
            'useful_life_months' => ['nullable', 'required_if:is_depreciated,1', 'integer', 'min:1', 'max:600'],
            'residual_value' => ['nullable', 'numeric', 'min:0', 'lte:purchase_price'],
            'photo' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
            'remove_photo' => ['boolean'],
        ];
    }

    protected function prepareForValidation(): void
    {
        if ($this->filled('category_code')) {
            $this->merge(['category_code' => strtoupper(trim((string) $this->input('category_code')))]);
        }
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'category_parent_id.required' => 'Pilih kategori untuk jenis barang baru.',
            'category_parent_id.exists' => 'Pilih kategori untuk jenis barang baru.',
            'category_name.required' => 'Isi nama jenis barang baru.',
            'category_code.required' => 'Isi kode jenis barang.',
            'category_code.alpha' => 'Kode hanya boleh berisi huruf.',
            'category_code.min' => 'Kode minimal 2 huruf.',
            'category_code.max' => 'Kode maksimal 5 huruf.',
            'category_code.unique' => 'Kode ini sudah dipakai kategori atau jenis peralatan lain.',
            'category_id.required' => 'Pilih jenis barang.',
            'category_id.exists' => 'Pilih jenis barang.',
            'name.required' => 'Nama peralatan wajib diisi.',
            'serial_number.unique' => 'Nomor seri ini sudah terdaftar di peralatan lain.',
            'purchased_on.required' => 'Isi tanggal beli.',
            'purchased_on.before_or_equal' => 'Tanggal beli tidak boleh melewati hari ini.',
            'purchase_price.required' => 'Isi harga perolehan.',
            'useful_life_months.required_if' => 'Isi masa manfaat untuk menghitung penyusutan.',
            'residual_value.lte' => 'Nilai sisa tidak boleh lebih besar dari harga perolehan.',
            'photo.image' => 'Foto harus berupa gambar.',
            'photo.max' => 'Ukuran foto maksimal 5 MB.',
        ];
    }
}
