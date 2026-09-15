<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redis;

class HealthController extends Controller
{
    public function __invoke(): JsonResponse
    {
        $database = $this->checkDatabase();
        $redis = $this->checkRedis();
        $deriv = config('deriv.public_ws') !== null && config('deriv.public_ws') !== '' ? 'configured' : 'unconfigured';

        return response()->json([
            'status' => $database === 'ok' && $redis === 'ok' && $deriv === 'configured' ? 'ok' : 'degraded',
            'services' => ['database' => $database, 'redis' => $redis, 'deriv' => $deriv],
            'timestamp' => now('UTC')->toISOString(),
        ]);
    }

    private function checkDatabase(): string
    {
        try {
            DB::connection()->getPdo();

            return 'ok';
        } catch (\Throwable) {
            return 'down';
        }
    }

    private function checkRedis(): string
    {
        try {
            Redis::connection()->ping();

            return 'ok';
        } catch (\Throwable) {
            return 'down';
        }
    }
}
