<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('deriv_connections', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('user_id');
            $table->string('provider')->default('deriv');
            $table->string('deriv_user_ref')->nullable();
            $table->text('access_token_encrypted');
            $table->text('refresh_token_encrypted')->nullable();
            $table->timestamp('token_expires_at')->nullable();
            $table->string('scope')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->index('user_id');
        });

        Schema::create('deriv_accounts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('user_id');
            $table->uuid('deriv_connection_id');
            $table->string('deriv_account_id');
            $table->string('account_type');
            $table->string('currency', 10);
            $table->string('group_name')->nullable();
            $table->boolean('is_default')->default(false);
            $table->boolean('is_active')->default(true);
            $table->json('metadata_json')->nullable();
            $table->timestamps();
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->foreign('deriv_connection_id')->references('id')->on('deriv_connections')->cascadeOnDelete();
            $table->unique(['user_id', 'deriv_account_id']);
            $table->index('user_id');
        });

        Schema::create('deriv_ws_sessions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('user_id');
            $table->uuid('deriv_account_id');
            $table->string('status')->default('disconnected');
            $table->string('socket_type')->default('trading');
            $table->timestamp('connected_at')->nullable();
            $table->timestamp('disconnected_at')->nullable();
            $table->timestamp('last_ping_at')->nullable();
            $table->timestamp('last_pong_at')->nullable();
            $table->unsignedInteger('reconnect_count')->default(0);
            $table->json('meta_json')->nullable();
            $table->timestamps();
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->foreign('deriv_account_id')->references('id')->on('deriv_accounts')->cascadeOnDelete();
            $table->index('user_id');
            $table->index('deriv_account_id');
        });

        Schema::create('watchlists', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('user_id');
            $table->string('name');
            $table->boolean('is_default')->default(false);
            $table->timestamps();
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->index('user_id');
        });

        Schema::create('watchlist_symbols', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('watchlist_id');
            $table->string('symbol');
            $table->integer('sort_order')->default(0);
            $table->timestamp('created_at')->useCurrent();
            $table->foreign('watchlist_id')->references('id')->on('watchlists')->cascadeOnDelete();
            $table->unique(['watchlist_id', 'symbol']);
        });

        Schema::create('market_ticks_cache', function (Blueprint $table) {
            $table->id();
            $table->string('symbol');
            $table->double('quote');
            $table->double('bid')->nullable();
            $table->double('ask')->nullable();
            $table->unsignedBigInteger('epoch');
            $table->json('raw_json');
            $table->timestamp('updated_at')->useCurrent()->useCurrentOnUpdate();
            $table->index('symbol');
        });

        Schema::create('market_candles_cache', function (Blueprint $table) {
            $table->id();
            $table->string('symbol');
            $table->unsignedInteger('granularity');
            $table->unsignedBigInteger('epoch');
            $table->double('open');
            $table->double('high');
            $table->double('low');
            $table->double('close');
            $table->json('raw_json');
            $table->timestamp('updated_at')->useCurrent()->useCurrentOnUpdate();
            $table->index(['symbol', 'granularity']);
        });

        Schema::create('account_transactions_cache', function (Blueprint $table) {
            $table->id();
            $table->uuid('user_id');
            $table->uuid('deriv_account_id');
            $table->string('reference_id')->nullable();
            $table->string('action_type')->nullable();
            $table->double('amount')->nullable();
            $table->double('balance_after')->nullable();
            $table->unsignedBigInteger('epoch')->nullable();
            $table->json('raw_json');
            $table->timestamps();
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->foreign('deriv_account_id')->references('id')->on('deriv_accounts')->cascadeOnDelete();
            $table->index(['user_id', 'deriv_account_id']);
        });

        Schema::create('audit_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('user_id')->nullable();
            $table->string('domain');
            $table->string('action');
            $table->string('level')->default('info');
            $table->text('message');
            $table->json('context_json')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->foreign('user_id')->references('id')->on('users')->nullOnDelete();
            $table->index('user_id');
            $table->index('domain');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
        Schema::dropIfExists('account_transactions_cache');
        Schema::dropIfExists('market_candles_cache');
        Schema::dropIfExists('market_ticks_cache');
        Schema::dropIfExists('watchlist_symbols');
        Schema::dropIfExists('watchlists');
        Schema::dropIfExists('deriv_ws_sessions');
        Schema::dropIfExists('deriv_accounts');
        Schema::dropIfExists('deriv_connections');
    }
};
