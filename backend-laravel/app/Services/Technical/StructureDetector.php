<?php

namespace App\Services\Technical;

use App\DTO\CandleDTO;

class StructureDetector
{
    public function detect(array $candles): array
    {
        $left = (int) config('technical.swing.left_bars', 3);
        $right = (int) config('technical.swing.right_bars', 3);
        $highs = [];
        $lows = [];
        $total = count($candles);
        for ($index = $left; $index < $total - $right; $index++) {
            $high = $candles[$index]->high;
            $low = $candles[$index]->low;
            $isHigh = true;
            $isLow = true;
            for ($offset = 1; $offset <= $left; $offset++) {
                $isHigh = $isHigh && $high > $candles[$index - $offset]->high;
                $isLow = $isLow && $low < $candles[$index - $offset]->low;
            }
            for ($offset = 1; $offset <= $right; $offset++) {
                $isHigh = $isHigh && $high >= $candles[$index + $offset]->high;
                $isLow = $isLow && $low <= $candles[$index + $offset]->low;
            }
            if ($isHigh) {
                $highs[] = $this->pivot($candles[$index], $high);
            }
            if ($isLow) {
                $lows[] = $this->pivot($candles[$index], $low);
            }
        }
        $last = $candles[array_key_last($candles)] ?? null;
        $lastHigh = $highs[array_key_last($highs)]['price'] ?? null;
        $lastLow = $lows[array_key_last($lows)]['price'] ?? null;
        $trend = $last && $lastHigh !== null && $lastLow !== null ? ($last->close >= $lastHigh ? 'bullish' : ($last->close <= $lastLow ? 'bearish' : 'range')) : 'unknown';

        return ['trend' => $trend, 'last_close' => $last?->close, 'swing_highs' => $highs, 'swing_lows' => $lows, 'last_break' => $this->lastBreak($candles, $lastHigh, $lastLow)];
    }

    private function pivot(CandleDTO $candle, float $price): array
    {
        return ['price' => $price, 'timestamp' => $candle->toArray()['timestamp']];
    }

    private function lastBreak(array $candles, ?float $high, ?float $low): ?array
    {
        $last = $candles[array_key_last($candles)] ?? null;
        if ($last === null) {
            return null;
        }
        if ($high !== null && $last->closed && $last->close > $high) {
            return ['type' => 'BOS', 'direction' => 'bullish', 'level' => $high, 'confirmed_by_close' => true, 'algorithm_version' => '1.0'];
        }
        if ($low !== null && $last->closed && $last->close < $low) {
            return ['type' => 'BOS', 'direction' => 'bearish', 'level' => $low, 'confirmed_by_close' => true, 'algorithm_version' => '1.0'];
        }

        return null;
    }
}
