@php
    $rupiah = fn ($value) => 'Rp' . number_format(round((float) $value), 0, ',', '.');
    $number = fn ($value) => number_format((float) $value, 0, ',', '.');
    $signed = fn ($value) => $value > 0 ? '+' . number_format($value, 0, ',', '.') : ($value < 0 ? '−' . number_format(abs($value), 0, ',', '.') : '0');
    $longDate = fn ($date) => $date ? \Carbon\CarbonImmutable::parse($date)->locale('id')->translatedFormat('j F Y') : '—';
    $percent = fn ($part, $total) => $total > 0 ? number_format($part / $total * 100, 1, ',', '.') . '%' : '0%';
@endphp
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ $title }} — {{ config('app.name') }}</title>
    <style>
        @page {
            size: A4 {{ $landscape ? 'landscape' : 'portrait' }};
            margin: 16mm 14mm 18mm;

            @bottom-left {
                content: "{{ config('app.name') }} · {{ $title }}";
                font: 8pt Arial, Helvetica, sans-serif;
                color: #6b7280;
            }

            @bottom-right {
                content: "Halaman " counter(page) " dari " counter(pages);
                font: 8pt Arial, Helvetica, sans-serif;
                color: #6b7280;
            }
        }

        * { box-sizing: border-box; }

        html { color-scheme: light; }

        body {
            margin: 0;
            background: #e5e7eb;
            color: #111827;
            font: 10pt/1.45 Arial, Helvetica, sans-serif;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }

        .toolbar {
            position: sticky;
            top: 0;
            z-index: 10;
            display: flex;
            justify-content: center;
            gap: 10px;
            padding: 12px;
            background: #1f2937;
        }

        .toolbar button {
            border: 0;
            border-radius: 10px;
            padding: 10px 18px;
            font: 600 13px Arial, Helvetica, sans-serif;
            cursor: pointer;
        }

        .toolbar .primary { background: #1679c9; color: #fff; }
        .toolbar .secondary { background: #374151; color: #e5e7eb; }

        .sheet {
            width: {{ $landscape ? '297mm' : '210mm' }};
            min-height: {{ $landscape ? '210mm' : '297mm' }};
            margin: 24px auto;
            padding: 16mm 14mm;
            background: #fff;
            box-shadow: 0 10px 30px rgba(0, 0, 0, .15);
        }

        .letterhead {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            padding-bottom: 10px;
            border-bottom: 3px double #1f2937;
        }

        .brand { display: flex; align-items: center; gap: 12px; }

        .brand-mark {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 42px;
            height: 42px;
            border-radius: 10px;
            background: #1679c9;
            color: #fff;
            font: 700 15pt Arial, Helvetica, sans-serif;
        }

        .brand-name { font-size: 15pt; font-weight: 700; letter-spacing: -.01em; }
        .brand-name span { color: #1679c9; }
        .brand-tagline { font-size: 8.5pt; color: #4b5563; }

        .meta { text-align: right; font-size: 8.5pt; color: #374151; line-height: 1.6; }

        .title { margin: 18px 0 4px; text-align: center; font-size: 13pt; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; }
        .subtitle { margin: 0 0 18px; text-align: center; font-size: 9.5pt; color: #374151; }

        h2 { margin: 18px 0 8px; font-size: 10.5pt; font-weight: 700; }

        table { width: 100%; border-collapse: collapse; font-size: 9pt; }
        thead { display: table-header-group; }
        tfoot { display: table-row-group; }
        tr { break-inside: avoid; }

        th, td { padding: 5px 7px; border: 1px solid #9ca3af; vertical-align: top; }
        th { background: #e6f4fe; font-weight: 700; text-align: left; }
        td.num, th.num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
        td.center, th.center { text-align: center; }
        td.muted { color: #6b7280; }
        .total td { background: #f3f4f6; font-weight: 700; }
        .group td { background: #f8fafc; font-weight: 700; }
        .neg { color: #b91c1c; }
        .pos { color: #047857; }

        .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 4px; }
        .summary-box { border: 1px solid #9ca3af; border-radius: 6px; padding: 8px 10px; }
        .summary-box .label { font-size: 8pt; color: #4b5563; }
        .summary-box .value { font-size: 12pt; font-weight: 700; margin-top: 2px; }
        .summary-box .hint { font-size: 8pt; color: #6b7280; }

        .note { margin-top: 8px; font-size: 8pt; color: #4b5563; }

        .signatures {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            margin-top: 36px;
            break-inside: avoid;
            text-align: center;
            font-size: 9.5pt;
        }

        .signature-space { height: 64px; }
        .signature-name { font-weight: 700; text-decoration: underline; }

        .empty { padding: 14px; text-align: center; color: #6b7280; }

        @media print {
            body { background: #fff; }
            .toolbar { display: none; }
            .sheet { width: auto; min-height: 0; margin: 0; padding: 0; box-shadow: none; }
        }
    </style>
</head>
<body>
    <div class="toolbar">
        <button type="button" class="primary" onclick="window.print()">Cetak / Simpan PDF</button>
        <button type="button" class="secondary" onclick="window.close()">Tutup</button>
    </div>

    <main class="sheet">
        <header class="letterhead">
            <div class="brand">
                <div class="brand-mark">II</div>
                <div>
                    <div class="brand-name">Inventaris<span>Investa</span></div>
                    <div class="brand-tagline">Sistem Inventaris Barang &amp; Aset Perusahaan</div>
                </div>
            </div>
            <div class="meta">
                Dicetak: {{ $printedAt->translatedFormat('j F Y, H.i') }}<br>
                Oleh: {{ $printedBy ?? '—' }}
            </div>
        </header>

        <h1 class="title">{{ $title }}</h1>
        <p class="subtitle">
            @if ($usesPeriod)
                Periode {{ $longDate($period->from) }} s.d. {{ $longDate($period->to) }}
            @else
                Keadaan per {{ $longDate($printedAt) }}
            @endif
        </p>

        @if ($report === 'ringkasan')
            @php($summary = $data['summary'])
            @php($usage = $data['usage'])

            <div class="summary-grid">
                <div class="summary-box">
                    <div class="label">Barang masuk</div>
                    <div class="value">{{ $rupiah($summary['incoming_value']) }}</div>
                    <div class="hint">{{ $summary['incoming_count'] }} transaksi</div>
                </div>
                <div class="summary-box">
                    <div class="label">Barang keluar</div>
                    <div class="value">{{ $rupiah($summary['outgoing_value']) }}</div>
                    <div class="hint">{{ $summary['outgoing_count'] }} transaksi</div>
                </div>
                <div class="summary-box">
                    <div class="label">Selisih cek stok</div>
                    <div class="value">{{ $rupiah($summary['adjustment_value']) }}</div>
                    <div class="hint">{{ $summary['adjustment_count'] }} penyesuaian</div>
                </div>
                <div class="summary-box">
                    <div class="label">Nilai persediaan</div>
                    <div class="value">{{ $rupiah($summary['inventory_value']) }}</div>
                    <div class="hint">{{ $summary['item_count'] }} jenis barang</div>
                </div>
            </div>

            <h2>A. Pemakaian barang per divisi</h2>
            @include('reports.partials.divisions', ['divisions' => $usage['divisions'], 'total' => $usage['total']])

            <h2>B. Barang paling banyak keluar</h2>
            @include('reports.partials.top-items', ['items' => $usage['top_items']])

            <p class="note">Stok kritis saat ini: {{ $summary['low_stock_count'] }} barang. Nilai barang dihitung dengan harga rata-rata.</p>
        @endif

        @if ($report === 'mutasi')
            @php($rows = $data['rows'])
            <table>
                <thead>
                    <tr>
                        <th class="center" style="width: 28px">No</th>
                        <th style="width: 70px">Kode</th>
                        <th>Nama barang</th>
                        <th>Kategori</th>
                        <th class="center">Satuan</th>
                        <th class="num">Stok awal</th>
                        <th class="num">Masuk</th>
                        <th class="num">Keluar</th>
                        <th class="num">Penyesuaian</th>
                        <th class="num">Stok akhir</th>
                        <th class="num">Nilai keluar</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach ($rows as $row)
                        <tr>
                            <td class="center">{{ $loop->iteration }}</td>
                            <td>{{ $row['code'] }}</td>
                            <td>{{ $row['name'] }}</td>
                            <td>{{ $row['category'] }}</td>
                            <td class="center">{{ $row['unit'] }}</td>
                            <td class="num">{{ $number($row['opening']) }}</td>
                            <td class="num">{{ $row['incoming'] ? $number($row['incoming']) : '–' }}</td>
                            <td class="num">{{ $row['outgoing'] ? $number($row['outgoing']) : '–' }}</td>
                            <td class="num {{ $row['adjustment'] < 0 ? 'neg' : ($row['adjustment'] > 0 ? 'pos' : '') }}">{{ $row['adjustment'] ? $signed($row['adjustment']) : '–' }}</td>
                            <td class="num"><strong>{{ $number($row['closing']) }}</strong></td>
                            <td class="num">{{ $row['outgoing_value'] ? $rupiah($row['outgoing_value']) : '–' }}</td>
                        </tr>
                    @endforeach
                </tbody>
                <tfoot>
                    <tr class="total">
                        <td colspan="6">Jumlah ({{ count($rows) }} barang)</td>
                        <td class="num">{{ $number(collect($rows)->sum('incoming')) }}</td>
                        <td class="num">{{ $number(collect($rows)->sum('outgoing')) }}</td>
                        <td class="num">{{ $signed(collect($rows)->sum('adjustment')) }}</td>
                        <td></td>
                        <td class="num">{{ $rupiah(collect($rows)->sum('outgoing_value')) }}</td>
                    </tr>
                </tfoot>
            </table>
            <p class="note">Stok akhir = stok awal + masuk − keluar ± penyesuaian. Jumlah tiap kolom dalam satuan masing-masing barang. Transaksi yang dibatalkan tidak dihitung.</p>
        @endif

        @if ($report === 'pemakaian')
            <h2>A. Rekap per divisi</h2>
            @include('reports.partials.divisions', ['divisions' => $data['divisions'], 'total' => $data['total']])

            <h2>B. Rincian per karyawan</h2>
            <table>
                <thead>
                    <tr>
                        <th class="center" style="width: 28px">No</th>
                        <th>Nama karyawan</th>
                        <th>Divisi</th>
                        <th class="num">Transaksi</th>
                        <th class="num">Nilai barang</th>
                    </tr>
                </thead>
                <tbody>
                    @forelse ($data['employees'] as $employee)
                        <tr>
                            <td class="center">{{ $loop->iteration }}</td>
                            <td>{{ $employee['name'] }}</td>
                            <td>{{ $employee['division'] }}</td>
                            <td class="num">{{ $employee['transactions'] }}</td>
                            <td class="num">{{ $rupiah($employee['value']) }}</td>
                        </tr>
                    @empty
                        <tr><td colspan="5" class="empty">Tidak ada barang keluar pada periode ini.</td></tr>
                    @endforelse
                </tbody>
            </table>

            <h2>C. Barang paling banyak keluar</h2>
            @include('reports.partials.top-items', ['items' => $data['top_items']])
        @endif

        @if ($report === 'persediaan')
            <h2>A. Rekap per kategori</h2>
            <table>
                <thead>
                    <tr>
                        <th class="center" style="width: 28px">No</th>
                        <th>Kategori</th>
                        <th class="num">Jenis barang</th>
                        <th class="num">Nilai</th>
                        <th class="num">Porsi</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach ($data['categories'] as $category)
                        <tr>
                            <td class="center">{{ $loop->iteration }}</td>
                            <td>{{ $category['name'] }}</td>
                            <td class="num">{{ $category['items'] }}</td>
                            <td class="num">{{ $rupiah($category['value']) }}</td>
                            <td class="num">{{ $percent($category['value'], $data['total']) }}</td>
                        </tr>
                    @endforeach
                </tbody>
                <tfoot>
                    <tr class="total">
                        <td colspan="3">Total nilai persediaan</td>
                        <td class="num">{{ $rupiah($data['total']) }}</td>
                        <td class="num">100%</td>
                    </tr>
                </tfoot>
            </table>

            <h2>B. Rincian per barang</h2>
            <table>
                <thead>
                    <tr>
                        <th class="center" style="width: 28px">No</th>
                        <th style="width: 70px">Kode</th>
                        <th>Nama barang</th>
                        <th>Kategori</th>
                        <th class="num">Stok</th>
                        <th class="num">Harga rata-rata</th>
                        <th class="num">Nilai</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach ($data['items'] as $item)
                        <tr>
                            <td class="center">{{ $loop->iteration }}</td>
                            <td>{{ $item['code'] }}</td>
                            <td>{{ $item['name'] }}</td>
                            <td>{{ $item['category'] }}</td>
                            <td class="num">{{ $number($item['stock']) }} {{ $item['unit'] }}</td>
                            <td class="num">{{ $rupiah($item['average_price']) }}</td>
                            <td class="num">{{ $rupiah($item['value']) }}</td>
                        </tr>
                    @endforeach
                </tbody>
                <tfoot>
                    <tr class="total">
                        <td colspan="6">Total</td>
                        <td class="num">{{ $rupiah($data['total']) }}</td>
                    </tr>
                </tfoot>
            </table>
        @endif

        @if ($report === 'aset')
            <h2>A. Aset yang sedang dipakai</h2>
            <table>
                <thead>
                    <tr>
                        <th class="center" style="width: 28px">No</th>
                        <th style="width: 90px">Kode aset</th>
                        <th>Nama aset</th>
                        <th>Kategori</th>
                        <th style="width: 90px">Sejak</th>
                        <th class="num">Harga perolehan</th>
                    </tr>
                </thead>
                <tbody>
                    @php($counter = 0)
                    @forelse ($data['holders'] as $holder)
                        <tr class="group">
                            <td colspan="5">
                                {{ $holder['type'] === 'room' ? 'Ruangan' : 'Karyawan' }}: {{ $holder['name'] }}@if ($holder['detail']) ({{ $holder['detail'] }})@endif
                            </td>
                            <td class="num">{{ $rupiah($holder['value']) }}</td>
                        </tr>
                        @foreach ($holder['assets'] as $asset)
                            @php($counter++)
                            <tr>
                                <td class="center">{{ $counter }}</td>
                                <td>{{ $asset['code'] }}</td>
                                <td>{{ $asset['name'] }}</td>
                                <td>{{ $asset['category'] }}</td>
                                <td>{{ $longDate($asset['since']) }}</td>
                                <td class="num">{{ $rupiah($asset['price']) }}</td>
                            </tr>
                        @endforeach
                    @empty
                        <tr><td colspan="6" class="empty">Tidak ada aset yang sedang dipakai.</td></tr>
                    @endforelse
                </tbody>
            </table>

            <h2>B. Aset tanpa pemegang</h2>
            <table>
                <thead>
                    <tr>
                        <th class="center" style="width: 28px">No</th>
                        <th style="width: 90px">Kode aset</th>
                        <th>Nama aset</th>
                        <th>Kategori</th>
                        <th>Status</th>
                        <th class="num">Harga perolehan</th>
                    </tr>
                </thead>
                <tbody>
                    @forelse ($data['unassigned'] as $asset)
                        <tr>
                            <td class="center">{{ $loop->iteration }}</td>
                            <td>{{ $asset['code'] }}</td>
                            <td>{{ $asset['name'] }}</td>
                            <td>{{ $asset['category'] }}</td>
                            <td>{{ $asset['status'] }}</td>
                            <td class="num">{{ $rupiah($asset['price']) }}</td>
                        </tr>
                    @empty
                        <tr><td colspan="6" class="empty">Semua aset sedang dipakai.</td></tr>
                    @endforelse
                </tbody>
                <tfoot>
                    <tr class="total">
                        <td colspan="5">Total harga perolehan seluruh aset aktif</td>
                        <td class="num">{{ $rupiah($data['total_value']) }}</td>
                    </tr>
                </tfoot>
            </table>
            <p class="note">
                Jumlah aset:
                @foreach ($data['status_counts'] as $label => $count)
                    {{ $label }} {{ $count }}@if (! $loop->last), @endif
                @endforeach
            </p>
        @endif

        <section class="signatures">
            <div>
                Dibuat oleh,
                <div class="signature-space"></div>
                <div class="signature-name">{{ $printedBy ?? '........................' }}</div>
            </div>
            <div>
                Mengetahui,
                <div class="signature-space"></div>
                <div>( ........................................ )</div>
            </div>
        </section>
    </main>

    <script>
        window.addEventListener('load', () => setTimeout(() => window.print(), 300));
    </script>
</body>
</html>
