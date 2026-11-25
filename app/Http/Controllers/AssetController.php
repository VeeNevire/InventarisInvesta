<?php

namespace App\Http\Controllers;

use App\Enums\AssetHistoryType;
use App\Enums\AssetStatus;
use App\Enums\CategoryType;
use App\Enums\Permission;
use App\Http\Requests\Asset\SaveAssetRequest;
use App\Http\Resources\AssetHistoryResource;
use App\Http\Resources\AssetResource;
use App\Models\Asset;
use App\Models\AssetHistory;
use App\Models\Category;
use App\Models\Division;
use App\Models\Employee;
use App\Models\Room;
use App\Models\Supplier;
use App\Services\AssetCustodian;
use App\Support\AssetCodeGenerator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class AssetController extends Controller
{
    /**
     * List assets with search, status and category filters.
     */
    public function index(Request $request): Response
    {
        $filters = [
            'search' => $request->string('search')->trim()->value(),
            'status' => $request->string('status')->value(),
            'category' => $request->string('category')->value(),
        ];

        $assets = Asset::query()
            ->with(['category.parent', 'holder' => fn (MorphTo $morphTo) => $morphTo->morphWith([Employee::class => ['division']])])
            ->when($filters['search'], fn (Builder $query, string $search) => $query->where(
                fn (Builder $query) => $query->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%")
                    ->orWhere('serial_number', 'like', "%{$search}%"),
            ))
            ->when(AssetStatus::tryFrom($filters['status']), fn (Builder $query, AssetStatus $status) => $query->where('status', $status))
            ->when($filters['category'], fn (Builder $query, string $code) => $query->whereHas('category', fn (Builder $category) => $category->where('code', $code)->orWhereHas('parent', fn (Builder $parent) => $parent->where('code', $code))))
            ->orderBy('code')
            ->get();

        $statusCounts = Asset::query()
            ->selectRaw('status, COUNT(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        return Inertia::render('assets/index', [
            'assets' => AssetResource::collection($assets)->resolve(),
            'filters' => $filters,
            'categories' => Category::query()
                ->where('type', CategoryType::Aset)
                ->orderBy('name')
                ->get(['code', 'name']),
            'statusCounts' => collect(AssetStatus::cases())->mapWithKeys(fn (AssetStatus $status): array => [
                $status->value => (int) ($statusCounts[$status->value] ?? 0),
            ]),
            'summary' => [
                'total' => (int) $statusCounts->sum(),
                'total_value' => (float) Asset::query()->where('status', '!=', AssetStatus::Dihapuskan)->sum('purchase_price'),
            ],
        ]);
    }

    /**
     * Asset detail with current holder, history and depreciation.
     */
    public function show(Request $request, Asset $asset): Response
    {
        $asset->load([
            'category.parent',
            'supplier',
            'holder' => fn (MorphTo $morphTo) => $morphTo->morphWith([Employee::class => ['division']]),
        ]);

        $histories = $asset->histories()
            ->with(['holder' => fn (MorphTo $morphTo) => $morphTo->morphWith([Employee::class => ['division']])])
            ->latest('occurred_on')
            ->latest('id')
            ->get();

        $currentAssignment = $asset->holder
            ? $histories->first(fn (AssetHistory $history): bool => $history->type === AssetHistoryType::Penyerahan
                && $history->holder_type === $asset->holder_type
                && $history->holder_id === $asset->holder_id)
            : null;

        return Inertia::render('assets/show', [
            'asset' => (new AssetResource($asset))->resolve(),
            'today' => now()->toDateString(),
            'lastHistoryDate' => $histories->first()?->occurred_on->toDateString(),
            'canEdit' => $request->user()?->can(Permission::UpdateAssets->value) ?? false,
            'canDispose' => $request->user()?->can(Permission::DisposeAssets->value) ?? false,
            'employees' => $this->activeEmployees(),
            'rooms' => Room::query()->orderBy('name')->get(['id', 'name', 'floor']),
            'divisions' => Division::query()->orderBy('name')->get(['id', 'name']),
            'vendors' => Supplier::query()->orderBy('name')->pluck('name'),
            'holderSince' => $currentAssignment?->occurred_on->toDateString(),
            'histories' => AssetHistoryResource::collection($histories)->resolve(),
            'depreciation' => $asset->depreciation(),
            'serviceCost' => (float) $histories
                ->where('type', AssetHistoryType::SelesaiPerbaikan)
                ->sum('cost'),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('assets/form', [
            'asset' => null,
            ...$this->formOptions(),
        ]);
    }

    public function store(SaveAssetRequest $request, AssetCodeGenerator $codes): RedirectResponse
    {
        $supplier = $request->filled('supplier_name')
            ? Supplier::findOrCreateByName($request->string('supplier_name')->value())
            : null;

        $asset = DB::transaction(function () use ($request, $codes, $supplier): Asset {
            if ($request->boolean('new_category')) {
                $category = Category::query()->create([
                    'type' => CategoryType::Aset,
                    'parent_id' => $request->integer('category_parent_id'),
                    'name' => $request->validated('category_name'),
                    'code' => $request->validated('category_code'),
                ]);
            } else {
                $category = Category::query()->lockForUpdate()->findOrFail($request->integer('category_id'));
            }

            $asset = Asset::query()->create([
                ...$this->assetAttributes($request),
                'category_id' => $category->id,
                'code' => $codes->next($category, Carbon::parse($request->validated('purchased_on'))->year),
                'supplier_id' => $supplier?->id,
                'status' => AssetStatus::Tersedia,
                'condition' => AssetCustodian::CONDITION_GOOD,
                'image_path' => $request->file('photo')?->store('assets', 'public'),
            ]);

            $asset->histories()->create([
                'type' => AssetHistoryType::Pembelian,
                'occurred_on' => $asset->purchased_on,
                'vendor' => $supplier?->name,
                'cost' => $asset->purchase_price,
                'condition' => 'Baru',
                'recorded_by' => $request->user()?->id,
            ]);

            return $asset;
        });

        $this->toast("Peralatan {$asset->code} ditambahkan dan tersedia di gudang. Serahkan ke karyawan atau ruangan bila sudah dipakai.");

        return to_route('assets.show', $asset);
    }

    public function edit(Asset $asset): Response
    {
        $asset->load(['category.parent', 'supplier']);

        return Inertia::render('assets/form', [
            'asset' => [
                ...(new AssetResource($asset))->resolve(),
                'category_id' => $asset->category_id,
                'useful_life_months' => $asset->useful_life_months,
                'residual_value' => $asset->residual_value !== null ? (float) $asset->residual_value : null,
            ],
            ...$this->formOptions(),
        ]);
    }

    public function update(SaveAssetRequest $request, Asset $asset): RedirectResponse
    {
        $attributes = [
            ...$this->assetAttributes($request),
            'supplier_id' => $request->filled('supplier_name')
                ? Supplier::findOrCreateByName($request->string('supplier_name')->value())->id
                : null,
        ];

        if ($request->integer('category_id') !== $asset->category_id) {
            $attributes['category_id'] = $request->integer('category_id');
        }

        $oldPhoto = $asset->image_path;

        if ($request->hasFile('photo')) {
            $attributes['image_path'] = $request->file('photo')->store('assets', 'public');
        } elseif ($request->boolean('remove_photo')) {
            $attributes['image_path'] = null;
        }

        $asset->update($attributes);

        if ($oldPhoto && $oldPhoto !== $asset->image_path) {
            Storage::disk('public')->delete($oldPhoto);
        }

        $this->toast("Peralatan {$asset->code} diperbarui.");

        return to_route('assets.show', $asset);
    }

    /**
     * @return array<string, mixed>
     */
    private function assetAttributes(SaveAssetRequest $request): array
    {
        $isDepreciated = $request->boolean('is_depreciated');

        return [
            ...$request->safe()->only(['name', 'brand', 'model', 'serial_number', 'specification', 'purchased_on', 'purchase_price']),
            'is_depreciated' => $isDepreciated,
            'useful_life_months' => $isDepreciated ? $request->integer('useful_life_months') : null,
            'residual_value' => $isDepreciated ? (float) $request->input('residual_value', 0) : null,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function formOptions(): array
    {
        $codes = app(AssetCodeGenerator::class);

        return [
            'categories' => Category::query()
                ->where('type', CategoryType::Aset)
                ->orderBy('name')
                ->with('parent:id,code,name')->get(['id', 'code', 'name', 'parent_id'])
                ->map(fn (Category $category): array => [
                    'id' => $category->id,
                    'code' => $category->code,
                    'name' => $category->name,
                    'parent_id' => $category->parent_id,
                    'code_path' => $codes->typePath($category),
                    'next_sequence' => $category->parent_id ? $codes->nextSequence($category) : 1,
                ]),
            'suppliers' => Supplier::query()->orderBy('name')->pluck('name'),
            'today' => now()->toDateString(),
        ];
    }

    /**
     * @return array<int, array{id: int, name: string, division: string|null}>
     */
    private function activeEmployees(): array
    {
        return Employee::query()
            ->where('is_active', true)
            ->with('division')
            ->orderBy('name')
            ->get()
            ->map(fn (Employee $employee): array => [
                'id' => $employee->id,
                'name' => $employee->name,
                'division' => $employee->division?->name,
            ])
            ->all();
    }
}
