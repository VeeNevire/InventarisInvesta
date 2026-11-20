<table>
    <thead>
        <tr>
            <th class="center" style="width: 28px">No</th>
            <th>Divisi</th>
            <th class="num">Karyawan</th>
            <th class="num">Transaksi</th>
            <th class="num">Nilai barang</th>
            <th class="num">Porsi</th>
        </tr>
    </thead>
    <tbody>
        @forelse ($divisions as $division)
            <tr>
                <td class="center">{{ $loop->iteration }}</td>
                <td>{{ $division['name'] }}</td>
                <td class="num">{{ $division['employees'] }}</td>
                <td class="num">{{ $division['transactions'] }}</td>
                <td class="num">Rp{{ number_format(round($division['value']), 0, ',', '.') }}</td>
                <td class="num">{{ $total > 0 ? number_format($division['value'] / $total * 100, 1, ',', '.') : 0 }}%</td>
            </tr>
        @empty
            <tr><td colspan="6" class="empty">Tidak ada barang keluar pada periode ini.</td></tr>
        @endforelse
    </tbody>
    @if (count($divisions) > 0)
        <tfoot>
            <tr class="total">
                <td colspan="4">Total</td>
                <td class="num">Rp{{ number_format(round($total), 0, ',', '.') }}</td>
                <td class="num">100%</td>
            </tr>
        </tfoot>
    @endif
</table>
