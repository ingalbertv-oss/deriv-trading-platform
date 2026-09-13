<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\DerivAccountController;
use App\Http\Controllers\DerivAccountDataController;
use App\Http\Controllers\DerivMarketController;
use App\Http\Controllers\DerivOAuthController;
use App\Http\Controllers\DerivTradeController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/health', fn () => response()->json([
    'status' => 'ok', 'service' => 'deriv-laravel-api', 'timestamp' => now()->toISOString(),
]));

Route::prefix('auth')->middleware('throttle:auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
});
Route::get('/auth/deriv/callback', [DerivOAuthController::class, 'callback']);

Route::middleware('auth:sanctum')->group(function () {
    Route::prefix('auth')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']);
        Route::get('/deriv/start', [DerivOAuthController::class, 'start']);
        Route::get('/deriv/status', [DerivOAuthController::class, 'status']);
    });

    Route::get('/deriv/connections', [DerivOAuthController::class, 'connections']);
    Route::delete('/deriv/connections/{id}', [DerivOAuthController::class, 'disconnect']);

    Route::prefix('deriv/accounts')->group(function () {
        Route::get('/', [DerivAccountController::class, 'index']);
        Route::post('/sync', [DerivAccountController::class, 'sync']);
        Route::get('/active', [DerivAccountController::class, 'active']);
        Route::post('/{derivAccountId}/select', [DerivAccountController::class, 'select']);
        Route::post('/{derivAccountId}/ws/connect', [DerivAccountController::class, 'connect']);
    });

    Route::prefix('deriv/market')->group(function () {
        Route::get('/active-symbols', [DerivMarketController::class, 'activeSymbols']);
        Route::get('/trading-times', [DerivMarketController::class, 'tradingTimes']);
        Route::get('/ticks-history', [DerivMarketController::class, 'ticksHistory']);
        Route::post('/subscribe', [DerivMarketController::class, 'subscribe']);
        Route::post('/unsubscribe', [DerivMarketController::class, 'unsubscribe']);
    });

    Route::prefix('deriv/account')->group(function () {
        Route::get('/balance', [DerivAccountDataController::class, 'balance']);
        Route::get('/portfolio', [DerivAccountDataController::class, 'portfolio']);
        Route::get('/statement', [DerivAccountDataController::class, 'statement']);
        Route::get('/transactions', [DerivAccountDataController::class, 'transactions']);
        Route::get('/profit-table', [DerivAccountDataController::class, 'profitTable']);
    });

    Route::prefix('deriv/trade')->group(function () {
        Route::post('/proposal', [DerivTradeController::class, 'proposal']);
        Route::post('/buy', [DerivTradeController::class, 'buy']);
        Route::post('/sell', [DerivTradeController::class, 'sell']);
        Route::post('/subscribe-position', [DerivTradeController::class, 'subscribePosition']);
    });

    Route::get('/user', fn (Request $request) => $request->user());
});
