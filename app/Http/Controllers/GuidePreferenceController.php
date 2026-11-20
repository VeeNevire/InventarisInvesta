<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class GuidePreferenceController extends Controller
{
    /**
     * Turn the tour offer after login on or off for the signed-in user.
     */
    public function __invoke(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'show_guide_on_login' => ['required', 'boolean'],
        ]);

        $request->user()?->update([
            'show_guide_on_login' => (bool) $validated['show_guide_on_login'],
        ]);

        return back();
    }
}
