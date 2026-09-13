<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\DerivOAuthController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/health', fn () => response()->json([
    'status' => 'ok',
    'service' => 'deriv-laravel-api',
    'timestamp' => now()->toISOString(),
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
    Route::get('/user', fn (Request $request) => $request->user());
});
