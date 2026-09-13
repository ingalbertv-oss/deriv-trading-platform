<?php

namespace App\Http\Controllers;

use App\Services\DerivRequestService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Throwable;

class DerivMarketController extends Controller
{
    public function activeSymbols(Request $request, DerivRequestService $deriv): JsonResponse
    {
        return $this->execute($request, $deriv, ['active_symbols' => 'brief'], 'active_symbols');
    }

    public function tradingTimes(Request $request, DerivRequestService $deriv): JsonResponse
    {
        return $this->execute($request, $deriv, ['trading_times' => now()->format('Y-m-d')], 'trading_times');
    }

    public function ticksHistory(Request $request, DerivRequestService $deriv): JsonResponse
    {
        $data = $request->validate([
            'symbol' => ['required', 'string', 'max:64'],
            'style' => ['nullable', 'in:ticks,candles'],
            'count' => ['nullable', 'integer', 'min:1', 'max:5000'],
            'start' => ['nullable', 'integer', 'min:0'],
            'end' => ['nullable'],
            'granularity' => ['nullable', 'integer', 'min:60'],
        ]);
        $payload = [
            'ticks_history' => $data['symbol'],
            'style' => $data['style'] ?? 'ticks',
            'count' => $data['count'] ?? 100,
            'end' => $data['end'] ?? 'latest',
            'subscribe' => 0,
        ];
        foreach (['start', 'granularity'] as $key) if (isset($data[$key])) $payload[$key] = $data[$key];
        return $this->execute($request, $deriv, $payload, 'history');
    }

    public function subscribe(Request $request, DerivRequestService $deriv): JsonResponse
    {
        $data = $request->validate(['symbol' => ['required', 'string', 'max:64']]);
        return $this->execute($request, $deriv, ['ticks' => $data['symbol'], 'subscribe' => 1], 'tick');
    }

    public function unsubscribe(Request $request): JsonResponse
    {
        return response()->json(['success' => true, 'data' => null]);
    }

    private function execute(Request $request, DerivRequestService $deriv, array $payload, string $type): JsonResponse
    {
        try {
            $account = $request->user()->derivAccounts()->where('is_default', true)->where('is_active', true)->firstOrFail();
            $response = $deriv->request($request->user(), $account->deriv_account_id, $payload, $type);
            return response()->json(['success' => true, 'data' => $response]);
        } catch (Throwable $e) {
            report($e);
            return response()->json(['success' => false, 'message' => 'Deriv market request failed.'], 502);
        }
    }
}
