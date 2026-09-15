<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('candles', function (Blueprint $table): void {
            $table->id();
            $table->string('provider')->default('deriv');
            $table->string('symbol');
            $table->string('timeframe', 10);
            $table->timestamp('open_time');
            $table->double('open');
            $table->double('high');
            $table->double('low');
            $table->double('close');
            $table->boolean('is_closed')->default(true);
            $table->timestamps();
            $table->unique(['symbol', 'timeframe', 'open_time']);
        });

        Schema::create('market_snapshots', function (Blueprint $table): void {
            $table->id();
            $table->string('symbol');
            $table->timestamp('generated_at');
            $table->timestamp('data_timestamp')->nullable();
            $table->json('payload');
            $table->string('schema_version', 20)->default('1.0');
            $table->timestamps();
            $table->index(['symbol', 'generated_at']);
        });

        Schema::create('analysis_requests', function (Blueprint $table): void {
            $table->id();
            $table->string('symbol');
            $table->foreignId('snapshot_id')->nullable()->constrained('market_snapshots')->nullOnDelete();
            $table->timestamp('requested_at');
            $table->string('response_hash', 128)->nullable();
            $table->timestamps();
            $table->index(['symbol', 'requested_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('analysis_requests');
        Schema::dropIfExists('market_snapshots');
        Schema::dropIfExists('candles');
    }
};
