<?php

namespace App\Policies;

use App\Enums\Permission;
use App\Models\StockTransaction;
use App\Models\User;

class StockTransactionPolicy
{
    /**
     * Admins, or users given the cancel permission, may cancel a transaction once.
     */
    public function cancel(User $user, StockTransaction $stockTransaction): bool
    {
        return $user->hasPermission(Permission::CancelTransactions) && ! $stockTransaction->isCancelled();
    }
}
