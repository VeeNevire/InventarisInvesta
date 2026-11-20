<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * A short note per line, e.g. the reason behind a stock-take difference.
     */
    public function up(): void
    {
        Schema::table('stock_transaction_lines', function (Blueprint $table) {
            $table->string('note')->nullable()->after('balance_after');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('stock_transaction_lines', function (Blueprint $table) {
            $table->dropColumn('note');
        });
    }
};
