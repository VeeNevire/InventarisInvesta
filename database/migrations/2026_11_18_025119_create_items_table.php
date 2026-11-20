<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('category_id')->constrained()->restrictOnDelete();
            $table->string('code')->unique();
            $table->string('name');
            $table->string('variant')->nullable();
            $table->string('unit', 20);
            $table->string('location')->nullable();
            $table->unsignedInteger('minimum_stock')->default(0);
            $table->boolean('notify_low_stock')->default(true);
            $table->integer('current_stock')->default(0);
            $table->decimal('average_price', 15, 2)->default(0);
            $table->string('image_path')->nullable();
            $table->text('description')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('items');
    }
};
