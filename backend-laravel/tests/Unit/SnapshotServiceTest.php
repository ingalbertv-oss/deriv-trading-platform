<?php

namespace Tests\Unit;

use App\DTO\CandleDTO;
use App\Enums\Timeframe;
use App\Services\Market\MarketDataProvider;
use App\Services\Market\SnapshotService;
use App\Services\Technical\IndicatorService;
use App\Services\Technical\LevelDetector;
use App\Services\Technical\StructureDetector;
use Tests\TestCase;

class SnapshotServiceTest extends TestCase
{
    public function test_snapshot_normalizes_timeframes_and_marks_unknown_freshness_without_price_timestamp(): void
    {
        $candles = [];
        for ($index = 0; $index < 40; $index++) {
            $close = 100 + $index;
            $candles[] = new CandleDTO($index, $close - 1, $close + 1, $close - 2, $close, true);
        }

        $provider = new class($candles) implements MarketDataProvider
        {
            public function __construct(private readonly array $candles) {}

            public function candles(string $symbol, Timeframe $timeframe, int $count): array
            {
                return $this->candles;
            }

            public function latestPrice(string $symbol): array
            {
                return ['value' => 140.0, 'timestamp' => null];
            }

            public function recentTicks(string $symbol, int $count): array
            {
                return [];
            }

            public function instruments(): array
            {
                return [];
            }
        };

        $snapshot = new SnapshotService($provider, new IndicatorService, new StructureDetector, new LevelDetector);
        $result = $snapshot->build('BOOM1000', ['H4'], 40, true, true);

        $this->assertSame('H4', $result['timeframes']['H4']['timeframe']);
        $this->assertSame('unknown', $result['freshness']['status']);
        $this->assertArrayHasKey('ema', $result['timeframes']['H4']['indicators']);
        $this->assertArrayHasKey('structure', $result['timeframes']['H4']);
    }
}
