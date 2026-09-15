<?php

namespace App\Services\Technical;

use App\DTO\CandleDTO;

class IndicatorService
{
    public function calculate(array $candles): array
    {
        $closes = array_map(fn (CandleDTO $candle): float => $candle->close, $candles);
        $highs = array_map(fn (CandleDTO $candle): float => $candle->high, $candles);
        $lows = array_map(fn (CandleDTO $candle): float => $candle->low, $candles);
        $period = (int) config('technical.rsi_period', 14);
        $atrPeriod = (int) config('technical.atr_period', 14);
        $result = ['ema' => [], 'rsi' => ['period' => $period, 'value' => $this->rsi($closes, $period)], 'atr' => ['period' => $atrPeriod, 'value' => $this->atr($candles, $atrPeriod)]];
        foreach (config('technical.ema_periods', [20, 50, 200]) as $emaPeriod) {
            $result['ema'][(string) $emaPeriod] = $this->ema($closes, (int) $emaPeriod);
        }
        $result['rolling'] = ['high' => $highs === [] ? null : max($highs), 'low' => $lows === [] ? null : min($lows), 'range' => $highs === [] ? null : max($highs) - min($lows)];

        return $result;
    }

    private function ema(array $values, int $period): ?float
    {
        if (count($values) < $period) {
            return null;
        }
        $ema = array_sum(array_slice($values, 0, $period)) / $period;
        $multiplier = 2 / ($period + 1);
        foreach (array_slice($values, $period) as $value) {
            $ema = (($value - $ema) * $multiplier) + $ema;
        }

        return round($ema, 8);
    }

    private function rsi(array $values, int $period): ?float
    {
        if (count($values) <= $period) {
            return null;
        }
        $gains = $losses = 0.0;
        for ($i = 1; $i <= $period; $i++) {
            $delta = $values[$i] - $values[$i - 1];
            $gains += max(0, $delta);
            $losses += max(0, -$delta);
        }
        $avgGain = $gains / $period;
        $avgLoss = $losses / $period;
        for ($i = $period + 1; $i < count($values); $i++) {
            $delta = $values[$i] - $values[$i - 1];
            $avgGain = (($avgGain * ($period - 1)) + max(0, $delta)) / $period;
            $avgLoss = (($avgLoss * ($period - 1)) + max(0, -$delta)) / $period;
        }

        return round($avgLoss == 0.0 ? 100.0 : 100 - (100 / (1 + ($avgGain / $avgLoss))), 8);
    }

    private function atr(array $candles, int $period): ?float
    {
        if (count($candles) <= $period) {
            return null;
        }
        $ranges = [];
        foreach ($candles as $i => $candle) {
            $ranges[] = $i === 0 ? $candle->high - $candle->low : max($candle->high - $candle->low, abs($candle->high - $candles[$i - 1]->close), abs($candle->low - $candles[$i - 1]->close));
        }

        return round(array_sum(array_slice($ranges, -$period)) / $period, 8);
    }
}
