<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/health', function () {
    return response()->json([
        'status' => 'ok',
        'service' => 'deriv-laravel-api',
        'timestamp' => now()->toISOString(),
    ]);
});

Route::prefix('auth')->group(function () {
    Route::get('/me', function (Request $request) {
        return response()->json(['user' => $request->user()]);
    })->middleware('auth:sanctum');
});

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', fn (Request $request) => $request->user());
});
