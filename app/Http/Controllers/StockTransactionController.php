<?php

namespace App\Http\Controllers;

use App\Enums\StockTransactionType;
use App\Http\Resources\StockTransactionResource;
use App\Models\StockTransaction;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class StockTransactionController extends Controller
{
    /**
     * History of every stock transaction, newest first.
     */
    public function index(Request $request): Response
    {
        $filters = [
            'search' => $request->string('search')->trim()->value(),
            'type' => $request->string('type')->value(),
            'status' => $request->string('status')->value(),
        ];

        $transactions = StockTransaction::query()
            ->with(['lines.item', 'employee.division', 'supplier', 'recorder', 'canceller'])
            ->when(StockTransactionType::tryFrom($filters['type']), fn (Builder $query, StockTransactionType $type) => $query->where('type', $type))
            ->when($filters['status'] === 'aktif', fn (Builder $query) => $query->whereNull('cancelled_at'))
            ->when($filters['status'] === 'dibatalkan', fn (Builder $query) => $query->whereNotNull('cancelled_at'))
            ->when($filters['search'], fn (Builder $query, string $search) => $query->where(
                fn (Builder $query) => $query->where('number', 'like', "%{$search}%")
                    ->orWhere('purpose', 'like', "%{$search}%")
                    ->orWhere('reference', 'like', "%{$search}%")
                    ->orWhere('pic_name', 'like', "%{$search}%")
                    ->orWhereRelation('employee', 'name', 'like', "%{$search}%")
                    ->orWhereRelation('supplier', 'name', 'like', "%{$search}%")
                    ->orWhereHas('lines.item', fn (Builder $query) => $query->where('name', 'like', "%{$search}%")),
            ))
            ->latest('transacted_on')
            ->latest('id')
            ->paginate(15)
            ->withQueryString();

        $counts = StockTransaction::query()
            ->active()
            ->selectRaw('type, COUNT(*) as total')
            ->groupBy('type')
            ->pluck('total', 'type');

        return Inertia::render('transactions/index', [
            'transactions' => StockTransactionResource::collection($transactions->getCollection())->resolve(),
            'pagination' => [
                'current_page' => $transactions->currentPage(),
                'last_page' => $transactions->lastPage(),
                'total' => $transactions->total(),
                'from' => $transactions->firstItem(),
                'to' => $transactions->lastItem(),
                'prev_url' => $transactions->previousPageUrl(),
                'next_url' => $transactions->nextPageUrl(),
            ],
            'filters' => $filters,
            'typeCounts' => collect(StockTransactionType::cases())->mapWithKeys(fn (StockTransactionType $type): array => [
                $type->value => (int) ($counts[$type->value] ?? 0),
            ]),
            'canCancel' => $request->user()?->isAdmin() ?? false,
        ]);
    }
}
