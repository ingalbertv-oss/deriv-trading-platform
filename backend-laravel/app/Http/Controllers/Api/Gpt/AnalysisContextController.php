<?php

namespace App\Http\Controllers\Api\Gpt;

use App\Http\Controllers\Controller;
use App\Services\Market\SnapshotService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Throwable;

class AnalysisContextController extends Controller
{
    public function show(Request $request, string $symbol, SnapshotService $snapshots): JsonResponse
    {
        try {
            $compact = $request->boolean('compact', true);
            $snapshot = $snapshots->build($symbol, ['D1', 'H4', 'H1'], $compact ? 200 : 300, true, true);
            $result = ['schema_version' => '1.0', 'symbol' => $symbol, 'generated_at' => $snapshot['generated_at'], 'current_price' => ['value' => $snapshot['market']['last_price'], 'timestamp' => $snapshot['market']['price_timestamp']]];
            foreach ($snapshot['timeframes'] as $name => $frame) {
                $structure = $frame['structure'] ?? [];
                $result[$name] = ['last_closed_candle' => $this->lastClosed($frame['candles']), 'structure' => ['trend' => $structure['trend'] ?? 'unknown', 'last_swing_high' => $this->lastPivotPrice($structure['swing_highs'] ?? []), 'last_swing_low' => $this->lastPivotPrice($structure['swing_lows'] ?? []), 'last_confirmed_break' => $structure['last_break'] ?? null], 'indicators' => $this->compactIndicators($frame['indicators'] ?? [])];
            }

            return response()->json($result);
        } catch (Throwable $exception) {
            report($exception);

            return response()->json(['error' => ['code' => 'MARKET_DATA_UNAVAILABLE', 'message' => 'Unable to build analysis context.', 'retryable' => true]], 502);
        }
    }

    private function lastClosed(array $candles): ?array
    {
        foreach (array_reverse($candles) as $candle) {
            if (($candle['closed'] ?? false) === true) {
                return $candle;
            }
        }

        return null;
    }

    private function compactIndicators(array $indicators): array
    {
        $ema = $indicators['ema'] ?? [];

        return ['atr14' => $indicators['atr']['value'] ?? null, 'rsi14' => $indicators['rsi']['value'] ?? null, 'ema20' => $ema['20'] ?? null, 'ema50' => $ema['50'] ?? null, 'ema200' => $ema['200'] ?? null];
    }

    private function lastPivotPrice(array $pivots): ?float
    {
        $pivot = $pivots[array_key_last($pivots)] ?? null;

        return $pivot === null ? null : (float) $pivot['price'];
    }
}
