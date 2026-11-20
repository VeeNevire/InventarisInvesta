<?php

namespace App\Http\Controllers;

use App\Http\Requests\UpdateItemNotificationRequest;
use App\Models\Item;
use Illuminate\Http\RedirectResponse;

class ItemNotificationController extends Controller
{
    /**
     * Turn the low-stock notification on or off for a single item.
     */
    public function update(UpdateItemNotificationRequest $request, Item $item): RedirectResponse
    {
        $item->update(['notify_low_stock' => $request->boolean('notify_low_stock')]);

        return back();
    }
}
