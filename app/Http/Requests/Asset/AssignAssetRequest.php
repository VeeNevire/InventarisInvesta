<?php

namespace App\Http\Requests\Asset;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Validation\Rule;

class AssignAssetRequest extends AssetMovementRequest
{
    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'occurred_on' => $this->dateRules(),
            'holder_type' => ['required', Rule::in(['employee', 'room'])],
            'holder_id' => [
                $this->input('holder_type') === 'room' ? 'required' : 'required_without:new_employee_name',
                'nullable',
                'integer',
                $this->input('holder_type') === 'room'
                    ? Rule::exists('rooms', 'id')
                    : Rule::exists('employees', 'id')->where('is_active', true),
            ],
            'new_employee_name' => ['nullable', 'string', 'max:255'],
            'new_employee_division_id' => ['nullable', 'integer', 'exists:divisions,id'],
            'condition' => ['required', 'string', 'max:50'],
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
            'holder_id.required' => 'Pilih penerima aset.',
            'holder_id.required_without' => 'Pilih karyawan atau tambahkan karyawan baru.',
            'holder_id.exists' => 'Penerima tidak ditemukan atau sudah nonaktif.',
            'condition.required' => 'Isi kondisi aset saat diserahkan.',
        ];
    }
}
