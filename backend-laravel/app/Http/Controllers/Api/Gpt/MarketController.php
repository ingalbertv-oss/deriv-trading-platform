<?php

namespace App\Http\Controllers\Api\Gpt;

use App\Enums\Timeframe;
use App\Http\Controllers\Controller;
use App\Services\Market\MarketDataProvider;
use App\Services\Market\SnapshotService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Throwable;

class MarketController extends Controller
{
    public function __construct(private readonly MarketDataProvider $provider) {}

    public function instruments(): JsonResponse
    {
        try {
            return response()->json(['instruments' => $this->provider->instruments()]);
        } catch (Throwable $exception) {
            return $this->failure($exception);
        }
    }

    public function context(Request $request, string $symbol, SnapshotService $snapshots): JsonResponse
    {
        try {
            $data = $request->validate(['timeframes' => ['nullable', 'string'], 'candles' => ['nullable', 'integer', 'min:50', 'max:500'], 'include_indicators' => ['nullable', 'boolean'], 'include_structure' => ['nullable', 'boolean'], 'include_ticks' => ['nullable', 'boolean']]);
            $requestedFrames = array_values(array_filter(array_map('trim', explode(',', $data['timeframes'] ?? 'D1,H4,H1'))));
            if (array_filter($requestedFrames, fn (string $frame): bool => Timeframe::tryFromName($frame) === null) !== []) {
                return $this->error('TIMEFRAME_NOT_SUPPORTED', 'One or more timeframes are not supported.', false, 422);
            }
            $frames = array_map(fn (string $frame): string => Timeframe::fromName($frame)->name(), $requestedFrames);

            $snapshot = $snapshots->build($symbol, $frames, (int) ($data['candles'] ?? 200), (bool) ($data['include_indicators'] ?? true), (bool) ($data['include_structure'] ?? true));
            if ((bool) ($data['include_ticks'] ?? false)) {
                $snapshot['ticks'] = $this->provider->recentTicks($symbol, 100);
            }

            return response()->json($snapshot);
        } catch (Throwable $exception) {
            return $this->failure($exception);
        }
    }

    public function technicalSnapshot(string $symbol, SnapshotService $snapshots): JsonResponse
    {
        try {
            $snapshot = $snapshots->build($symbol, ['D1', 'H4'], 250, true, true);

            return response()->json([
                'symbol' => $symbol,
                'generated_at' => $snapshot['generated_at'],
                'context' => ['primary_timeframe' => 'D1', 'execution_timeframe' => 'H4'],
                'market' => $snapshot['market'],
                'D1' => $this->technicalFrame($snapshot['timeframes']['D1'] ?? []),
                'H4' => $this->technicalFrame($snapshot['timeframes']['H4'] ?? []),
                'freshness' => $snapshot['freshness'],
            ]);
        } catch (Throwable $exception) {
            return $this->failure($exception);
        }
    }

    public function candles(Request $request, string $symbol, string $timeframe): JsonResponse
    {
        try {
            $frame = Timeframe::tryFromName($timeframe);
            if ($frame === null) {
                return $this->error('TIMEFRAME_NOT_SUPPORTED', 'The requested timeframe is not supported.', false, 422);
            }
            $count = (int) $request->integer('count', 100);
            if ($count < 1 || $count > 500) {
                return $this->error('INVALID_COUNT', 'Count must be between 1 and 500.', false, 422);
            }

            return response()->json(['symbol' => $symbol, 'timeframe' => $frame->name(), 'candles' => array_map(fn ($candle): array => $candle->toArray(), $this->provider->candles($symbol, $frame, $count))]);
        } catch (Throwable $exception) {
            return $this->failure($exception);
        }
    }

    public function ticks(Request $request, string $symbol): JsonResponse
    {
        try {
            $count = (int) $request->integer('count', 100);
            if ($count < 1 || $count > 500) {
                return $this->error('INVALID_COUNT', 'Count must be between 1 and 500.', false, 422);
            }

            return response()->json(['symbol' => $symbol, 'ticks' => $this->provider->recentTicks($symbol, $count)]);
        } catch (Throwable $exception) {
            return $this->failure($exception);
        }
    }

    private function failure(Throwable $exception): JsonResponse
    {
        report($exception);

        return response()->json(['error' => ['code' => 'MARKET_DATA_UNAVAILABLE', 'message' => 'Unable to retrieve market data.', 'retryable' => true]], 502);
    }

    private function error(string $code, string $message, bool $retryable, int $status): JsonResponse
    {
        return response()->json(['error' => ['code' => $code, 'message' => $message, 'retryable' => $retryable]], $status);
    }

    private function technicalFrame(array $frame): array
    {
        $structure = $frame['structure'] ?? [];

        return [
            'trend' => $structure['trend'] ?? 'unknown',
            'last_closed_candle' => $this->lastClosedCandle($frame['candles'] ?? []),
            'structure' => $structure,
            'levels' => $frame['levels'] ?? [],
            'indicators' => $frame['indicators'] ?? [],
        ];
    }

    private function lastClosedCandle(array $candles): ?array
    {
        foreach (array_reverse($candles) as $candle) {
            if (($candle['closed'] ?? false) === true) {
                return $candle;
            }
        }

        return null;
    }
}
