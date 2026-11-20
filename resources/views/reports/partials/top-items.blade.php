<table>
    <thead>
        <tr>
            <th class="center" style="width: 28px">No</th>
            <th>Nama barang</th>
            <th class="num">Jumlah keluar</th>
            <th class="num">Nilai</th>
        </tr>
    </thead>
    <tbody>
        @forelse ($items as $item)
            <tr>
                <td class="center">{{ $loop->iteration }}</td>
                <td>{{ $item['name'] }}</td>
                <td class="num">{{ number_format($item['quantity'], 0, ',', '.') }} {{ $item['unit'] }}</td>
                <td class="num">Rp{{ number_format(round($item['value']), 0, ',', '.') }}</td>
            </tr>
        @empty
            <tr><td colspan="4" class="empty">Tidak ada barang keluar pada periode ini.</td></tr>
        @endforelse
    </tbody>
</table>
