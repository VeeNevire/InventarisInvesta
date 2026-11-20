<?php

namespace App\Policies;

use App\Models\StockTransaction;
use App\Models\User;

class StockTransactionPolicy
{
    /**
     * Only admins may cancel a transaction, and only once.
     */
    public function cancel(User $user, StockTransaction $stockTransaction): bool
    {
        return $user->isAdmin() && ! $stockTransaction->isCancelled();
    }
}
