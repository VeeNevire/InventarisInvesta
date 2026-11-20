<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreOutgoingTransactionRequest extends FormRequest
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
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'transacted_on' => ['required', 'date', 'before_or_equal:today'],
            'employee_id' => ['nullable', 'required_without:new_employee_name', 'integer', 'exists:employees,id'],
            'new_employee_name' => ['nullable', 'required_without:employee_id', 'string', 'max:255'],
            'new_employee_division_id' => ['nullable', 'integer', 'exists:divisions,id'],
            'pic_name' => ['required', 'string', 'max:255'],
            'purpose' => ['required', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:500'],
            'lines' => ['required', 'array', 'min:1', 'max:50'],
            'lines.*.item_id' => ['required', 'integer', 'distinct', 'exists:items,id'],
            'lines.*.quantity' => ['required', 'integer', 'min:1', 'max:1000000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'transacted_on.before_or_equal' => 'Tanggal tidak boleh melewati hari ini.',
            'employee_id.required_without' => 'Pilih penerima barang atau tambahkan karyawan baru.',
            'new_employee_name.required_without' => 'Pilih penerima barang atau tambahkan karyawan baru.',
            'pic_name.required' => 'Tulis nama PIC yang mengeluarkan barang.',
            'purpose.required' => 'Tulis keperluannya.',
            'lines.required' => 'Tambahkan minimal satu barang.',
            'lines.min' => 'Tambahkan minimal satu barang.',
            'lines.*.item_id.distinct' => 'Barang ini sudah ada di daftar.',
            'lines.*.quantity.required' => 'Isi jumlahnya.',
            'lines.*.quantity.min' => 'Jumlah minimal 1.',
        ];
    }
}
