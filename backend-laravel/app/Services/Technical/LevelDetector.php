<?php

namespace App\Services\Technical;

class LevelDetector
{
    public function detect(array $structure, float $tolerance = 0.0025): array
    {
        $pivots = array_merge($structure['swing_highs'] ?? [], $structure['swing_lows'] ?? []);
        $clusters = [];
        foreach ($pivots as $pivot) {
            $price = (float) $pivot['price'];
            $match = null;
            foreach ($clusters as $index => $cluster) {
                if (abs($price - $cluster['mid']) / max(abs($cluster['mid']), 1) <= $tolerance) {
                    $match = $index;
                    break;
                }
            }
            if ($match === null) {
                $clusters[] = ['low' => $price, 'high' => $price, 'mid' => $price, 'touches' => 1, 'evidence' => ['swing_pivot']];

                continue;
            }
            $clusters[$match]['low'] = min($clusters[$match]['low'], $price);
            $clusters[$match]['high'] = max($clusters[$match]['high'], $price);
            $clusters[$match]['mid'] = ($clusters[$match]['low'] + $clusters[$match]['high']) / 2;
            $clusters[$match]['touches']++;
        }

        return array_map(function (array $cluster) use ($structure): array {
            $lastPrice = $structure['last_close'] ?? null;

            return [...$cluster, 'type' => $lastPrice !== null && $cluster['mid'] < $lastPrice ? 'support' : 'resistance'];
        }, array_values(array_filter($clusters, fn (array $cluster): bool => $cluster['touches'] >= 2)));
    }
}
