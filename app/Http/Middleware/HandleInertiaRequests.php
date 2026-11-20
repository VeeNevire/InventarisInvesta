<?php

namespace App\Http\Middleware;

use App\Models\Item;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'auth' => [
                'user' => $request->user()?->only(['id', 'name', 'email', 'role', 'show_guide_on_login']),
                'canManageMasterData' => $request->user()?->can('manage-master-data') ?? false,
            ],
            'offerGuide' => fn (): bool => $request->session()->get('offer_guide', false) === true
                && ($request->user()->show_guide_on_login ?? false),
            'lowStockAlerts' => fn (): array => $request->user() === null ? [] : Item::query()
                ->lowStock()
                ->where('notify_low_stock', true)
                ->orderBy('current_stock')
                ->get()
                ->map(fn (Item $item): array => [
                    'code' => $item->code,
                    'name' => trim($item->name.' '.($item->variant ?? '')),
                    'unit' => $item->unit,
                    'current_stock' => $item->current_stock,
                    'minimum_stock' => $item->minimum_stock,
                ])
                ->all(),
        ];
    }
}
