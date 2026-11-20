<?php

namespace App\Http\Controllers;

use App\Http\Requests\CancelStockTransactionRequest;
use App\Models\StockTransaction;
use App\Services\StockLedger;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;

class CancelStockTransactionController extends Controller
{
    /**
     * Cancel a transaction instead of editing it, so its trace stays on the stock card.
     */
    public function __invoke(CancelStockTransactionRequest $request, StockTransaction $transaction, StockLedger $ledger): RedirectResponse
    {
        $ledger->cancel($transaction, $request->validated('reason'), $request->user());

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => "Transaksi {$transaction->number} dibatalkan. Stok sudah dihitung ulang.",
        ]);

        return back();
    }
}
