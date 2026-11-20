<?php

namespace App\Http\Controllers;

use App\Models\StockTransaction;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class TransactionReceiptController extends Controller
{
    /**
     * Show the receipt photo of an incoming transaction. Receipts live on the
     * private disk, so they are only reachable by signed-in users.
     */
    public function __invoke(StockTransaction $transaction): StreamedResponse
    {
        abort_unless($transaction->receipt_path && Storage::disk('local')->exists($transaction->receipt_path), 404);

        return Storage::disk('local')->response($transaction->receipt_path);
    }
}
