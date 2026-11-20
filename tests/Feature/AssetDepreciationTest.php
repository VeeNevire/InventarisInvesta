<?php

use App\Models\Asset;
use Carbon\CarbonImmutable;

test('straight line depreciation is calculated per elapsed month', function () {
    $asset = new Asset([
        'purchase_price' => 12_500_000,
        'residual_value' => 1_000_000,
        'useful_life_months' => 48,
        'is_depreciated' => true,
        'purchased_on' => '2025-01-14',
    ]);

    $depreciation = $asset->depreciation(CarbonImmutable::parse('2026-11-18'));

    expect($depreciation['months_elapsed'])->toBe(22)
        ->and($depreciation['monthly'])->toBe(239583.33)
        ->and($depreciation['book_value'])->toBe(7229166.67);
});

test('depreciation stops at the end of the useful life', function () {
    $asset = new Asset([
        'purchase_price' => 4_000_000,
        'residual_value' => 400_000,
        'useful_life_months' => 12,
        'is_depreciated' => true,
        'purchased_on' => '2020-01-01',
    ]);

    expect($asset->depreciation(CarbonImmutable::parse('2026-11-18'))['book_value'])->toBe(400000.0);
});

test('assets without depreciation return null', function () {
    expect((new Asset(['is_depreciated' => false]))->depreciation())->toBeNull();
});
