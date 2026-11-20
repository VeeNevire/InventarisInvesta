<?php

namespace App\Http\Controllers\Master;

use App\Http\Controllers\Controller;
use App\Http\Requests\Master\SaveCategoryRequest;
use App\Models\Category;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class CategoryController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('master/categories', [
            'categories' => Category::query()
                ->with(['parent'])->withCount(['items', 'assets', 'children'])
                ->orderBy('type')
                ->orderBy('name')
                ->get()
                ->map(fn (Category $category): array => [
                    'id' => $category->id,
                    'type' => $category->type->value,
                    'code' => $category->code,
                    'name' => $category->name,
                    'parent_id' => $category->parent_id,
                    'parent_name' => $category->parent?->name,
                    'children_count' => $category->children_count,
                    'items_count' => $category->items_count,
                    'assets_count' => $category->assets_count,
                    'is_used' => $category->items_count + $category->assets_count + $category->children_count > 0,
                ]),
        ]);
    }

    public function store(SaveCategoryRequest $request): RedirectResponse
    {
        $category = Category::query()->create($request->validated());

        $this->toast("Kategori {$category->name} ditambahkan.");

        return back();
    }

    public function update(SaveCategoryRequest $request, Category $category): RedirectResponse
    {
        $category->update($request->validated());

        $this->toast("Kategori {$category->name} diperbarui.");

        return back();
    }

    public function destroy(Category $category): RedirectResponse
    {
        if ($category->items()->exists() || $category->assets()->exists() || $category->children()->exists()) {
            $this->toast("Kategori {$category->name} masih dipakai, jadi tidak bisa dihapus.", 'error');

            return back();
        }

        $category->delete();
        $this->toast("Kategori {$category->name} dihapus.");

        return back();
    }
}
