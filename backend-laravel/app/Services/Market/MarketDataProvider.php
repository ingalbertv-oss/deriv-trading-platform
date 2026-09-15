<?php

namespace App\Services\Market;

use App\Enums\Timeframe;

interface MarketDataProvider
{
    public function candles(string $symbol, Timeframe $timeframe, int $count): array;

    public function latestPrice(string $symbol): array;

    public function recentTicks(string $symbol, int $count): array;

    public function instruments(): array;
}
