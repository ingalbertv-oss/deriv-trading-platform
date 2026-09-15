<?php

namespace App\Services\Market;

use App\Enums\Timeframe;
use App\Services\Technical\IndicatorService;
use App\Services\Technical\LevelDetector;
use App\Services\Technical\StructureDetector;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Cache;

class SnapshotService
{
    public function __construct(private readonly MarketDataProvider $provider, private readonly IndicatorService $indicators, private readonly StructureDetector $structure, private readonly LevelDetector $levels) {}

    public function build(string $symbol, array $timeframes, int $count, bool $includeIndicators, bool $includeStructure): array
    {
        $cacheKey = 'snapshot:'.strtoupper($symbol).':'.implode(',', $timeframes).':'.$count.':'.(int) $includeIndicators.':'.(int) $includeStructure;

        return Cache::remember($cacheKey, now()->addMinutes(5), fn (): array => $this->buildFresh($symbol, $timeframes, $count, $includeIndicators, $includeStructure));
    }

    private function buildFresh(string $symbol, array $timeframes, int $count, bool $includeIndicators, bool $includeStructure): array
    {
        $started = microtime(true);
        $latest = $this->provider->latestPrice($symbol);
        $normalized = [];
        foreach ($timeframes as $name) {
            $timeframe = Timeframe::fromName($name);
            $candles = $this->provider->candles($symbol, $timeframe, $count);
            $normalized[$timeframe->name()] = ['timeframe' => $timeframe->name(), 'last_closed_candle_at' => $this->lastClosedAt($candles), 'current_candle' => $this->currentCandle($candles), 'candles' => array_map(fn ($candle): array => $candle->toArray(), array_slice($candles, -100))];
            if ($includeIndicators) {
                $normalized[$timeframe->name()]['indicators'] = $this->indicators->calculate($candles);
            }
            if ($includeStructure) {
                $structure = $this->structure->detect($candles);
                $normalized[$timeframe->name()]['structure'] = $structure;
                $normalized[$timeframe->name()]['levels'] = $this->levels->detect($structure);
            }
        }

        $age = $latest['timestamp'] === null ? null : max(0, CarbonImmutable::parse($latest['timestamp'])->diffInSeconds(CarbonImmutable::now('UTC')));

        return ['schema_version' => '1.0', 'generated_at' => CarbonImmutable::now('UTC')->toISOString(), 'source' => ['provider' => 'deriv', 'environment' => app()->environment(), 'latency_ms' => (int) round((microtime(true) - $started) * 1000)], 'instrument' => ['symbol' => $symbol, 'display_name' => null, 'asset_class' => 'synthetic_index'], 'market' => ['last_price' => $latest['value'], 'price_timestamp' => $latest['timestamp']], 'freshness' => ['status' => $age === null ? 'unknown' : ($age <= 30 ? 'fresh' : ($age <= 300 ? 'delayed' : 'stale')), 'age_seconds' => $age], 'timeframes' => $normalized, 'structure' => [], 'levels' => [], 'risk_metadata' => ['spread' => null, 'point_value' => null, 'contract_size' => null]];
    }

    private function lastClosedAt(array $candles): ?string
    {
        foreach (array_reverse($candles) as $candle) {
            if ($candle->closed) {
                return $candle->toArray()['timestamp'];
            }
        }

        return null;
    }

    private function currentCandle(array $candles): ?array
    {
        $candle = $candles[array_key_last($candles)] ?? null;

        return $candle?->closed ? null : $candle?->toArray();
    }
}
