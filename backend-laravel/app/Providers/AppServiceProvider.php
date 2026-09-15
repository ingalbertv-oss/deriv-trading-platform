<?php

namespace App\Providers;

use App\Services\Market\AccountDataProvider;
use App\Services\Market\DerivAccountDataProvider;
use App\Services\Market\DerivMarketDataProvider;
use App\Services\Market\MarketDataProvider;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(MarketDataProvider::class, DerivMarketDataProvider::class);
        $this->app->bind(AccountDataProvider::class, DerivAccountDataProvider::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        RateLimiter::for('auth', function (Request $request) {
            return Limit::perMinute(10)->by($request->ip());
        });
    }
}
