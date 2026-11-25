<?php

namespace App\Http\Requests\Master;

use App\Enums\CategoryType;
use App\Models\Category;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class SaveCategoryRequest extends FormRequest
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
            'type' => ['required', Rule::enum(CategoryType::class)],
            'parent_id' => ['nullable', 'integer', Rule::exists('categories', 'id')->where('type', $this->input('type'))->whereNull('parent_id')],
            'code' => [
                'required',
                'string',
                'min:2',
                'max:5',
                'alpha',
                Rule::unique('categories', 'code')
                    ->where('type', $this->input('type'))
                    ->ignore($this->route('category')),
            ],
            'name' => ['required', 'string', 'max:100'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'code.required' => 'Kode kategori wajib diisi.',
            'code.alpha' => 'Kode hanya boleh berisi huruf.',
            'code.min' => 'Kode minimal 2 huruf.',
            'code.max' => 'Kode maksimal 5 huruf.',
            'code.unique' => 'Kode ini sudah dipakai kategori lain.',
            'name.required' => 'Nama kategori wajib diisi.',
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge(['code' => strtoupper(trim((string) $this->input('code')))]);
    }

    /**
     * The code is part of every item or asset code in the category, and the
     * type decides where it is used, so neither may change once it is in use.
     *
     * @return array<int, Closure(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $category = $this->route('category');

                if ($category instanceof Category && $this->filled('parent_id') && ((int) $this->input('parent_id') === $category->id || $category->children()->exists())) {
                    $validator->errors()->add('parent_id', 'Kategori induk tidak valid atau kategori ini sudah memiliki jenis barang.');
                }

                if (! $category instanceof Category || ($category->items()->doesntExist() && $category->assets()->doesntExist() && $category->children()->doesntExist())) {
                    return;
                }

                if ($this->input('code') !== $category->code) {
                    $validator->errors()->add('code', 'Kode tidak bisa diubah karena sudah dipakai di kode perlengkapan atau peralatan.');
                }

                if (($this->filled('parent_id') ? (int) $this->input('parent_id') : null) !== $category->parent_id) {
                    $validator->errors()->add('parent_id', 'Kategori tidak bisa dipindah karena kodenya sudah dipakai di kode perlengkapan atau peralatan.');
                }

                if ($this->input('type') !== $category->type->value) {
                    $validator->errors()->add('type', 'Kelompok tidak bisa diubah karena kategori ini sudah dipakai.');
                }
            },
        ];
    }
}
