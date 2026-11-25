<?php

namespace Database\Seeders;

use App\Enums\AssetHistoryType;
use App\Enums\AssetStatus;
use App\Enums\CategoryType;
use App\Models\Asset;
use App\Models\Category;
use App\Models\Item;
use App\Services\AssetCustodian;
use App\Support\AssetCodeGenerator;
use App\Support\ItemCodeGenerator;
use Illuminate\Database\Seeder;

/**
 * The office inventory list from the INVESTA spreadsheet: categories, item
 * types, office supplies (stock 0) and one unit of each office equipment type.
 */
class OfficeCatalogSeeder extends Seeder
{
    private const YEAR = 2025;

    /**
     * Peralatan Kantor: category code => [name, [type code => type name]].
     *
     * @var array<string, array{0: string, 1: array<string, string>}>
     */
    private const EQUIPMENT = [
        'ITE' => ['Perangkat IT & Elektronik', ['LPT' => 'Laptop', 'PRT' => 'Printer', 'ELK' => 'AC']],
        'FUR' => ['Furnitur', ['MJK' => 'Meja Kerja', 'KKH' => 'Kursi Kerja Hidrolik', 'KKB' => 'Kursi Kerja Besi', 'LMK' => 'Lemari Kerja']],
    ];

    /**
     * Perlengkapan Kantor: category code => [name, [type code => [type name, unit]]].
     *
     * @var array<string, array{0: string, 1: array<string, array{0: string, 1: string}>}>
     */
    private const SUPPLIES = [
        'ATK' => ['Alat Tulis Kantor', [
            'HVS' => ['Kertas HVS', 'rim'],
            'PTH' => ['Pulpen Tinta Hitam', 'pcs'],
            'TPH' => ['Tinta Printer Hitam', 'botol'],
            'BDD' => ['Binder', 'pcs'],
            'CUT' => ['Cutter', 'pcs'],
            'ICT' => ['Isi Cutter', 'pak'],
            'ACB' => ['Amplop Cokelat A4', 'pcs'],
            'AKP' => ['Amplop Kecil Putih', 'pcs'],
        ]],
        'PKK' => ['Perlengkapan Kebersihan Kantor', [
            'TSU' => ['Tisu', 'pak'],
            'WPL' => ['Wipol', 'botol'],
            'APL' => ['Alat Pel', 'pcs'],
            'SKM' => ['Sikat Kamar Mandi', 'pcs'],
        ]],
        'PRM' => ['Promosi', [
            'GKC' => ['Gantungan Kunci', 'pcs'],
            'KAL' => ['Kalender', 'pcs'],
        ]],
    ];

    public function run(AssetCodeGenerator $assetCodes, ItemCodeGenerator $itemCodes): void
    {
        foreach (self::EQUIPMENT as $code => [$name, $types]) {
            $category = Category::query()->create(['type' => CategoryType::Aset, 'code' => $code, 'name' => $name]);

            foreach ($types as $typeCode => $typeName) {
                $itemType = $category->children()->create(['type' => CategoryType::Aset, 'code' => $typeCode, 'name' => $typeName]);

                $asset = Asset::query()->create([
                    'category_id' => $itemType->id,
                    'code' => $assetCodes->next($itemType, self::YEAR),
                    'name' => $typeName,
                    'purchased_on' => self::YEAR.'-01-01',
                    'purchase_price' => 0,
                    'status' => AssetStatus::Tersedia,
                    'condition' => AssetCustodian::CONDITION_GOOD,
                ]);

                $asset->histories()->create([
                    'type' => AssetHistoryType::Pembelian,
                    'occurred_on' => $asset->purchased_on,
                    'cost' => 0,
                    'condition' => 'Baru',
                ]);
            }
        }

        foreach (self::SUPPLIES as $code => [$name, $types]) {
            $category = Category::query()->create(['type' => CategoryType::Persediaan, 'code' => $code, 'name' => $name]);

            foreach ($types as $typeCode => [$typeName, $unit]) {
                $itemType = $category->children()->create(['type' => CategoryType::Persediaan, 'code' => $typeCode, 'name' => $typeName]);

                Item::query()->create([
                    'category_id' => $itemType->id,
                    'code' => $itemCodes->next($itemType, self::YEAR),
                    'name' => $typeName,
                    'unit' => $unit,
                ]);
            }
        }
    }
}
