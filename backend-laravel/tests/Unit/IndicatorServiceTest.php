<?php

namespace Tests\Unit;

use App\DTO\CandleDTO;
use App\Services\Technical\IndicatorService;
use Tests\TestCase;

class IndicatorServiceTest extends TestCase
{
    public function test_indicators_are_null_until_enough_candles_exist(): void
    {
        $candles = array_map(fn (int $index): CandleDTO => new CandleDTO($index, 1, 2, 0, 1.5, true), range(0, 9));
        $indicators = app(IndicatorService::class)->calculate($candles);

        $this->assertNull($indicators['ema']['20']);
        $this->assertNull($indicators['rsi']['value']);
        $this->assertNull($indicators['atr']['value']);
    }
}
