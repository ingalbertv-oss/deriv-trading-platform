<?php

namespace App\DTO;

use Carbon\CarbonImmutable;

final readonly class MarketSnapshotDTO
{
    public function __construct(
        public string $symbol,
        public ?float $lastPrice,
        public CarbonImmutable $generatedAt,
        public array $timeframes,
        public array $indicators,
        public array $structure,
        public array $levels,
    ) {}

    public function toArray(): array
    {
        return [
            'schema_version' => '1.0',
            'generated_at' => $this->generatedAt->toISOString(),
            'instrument' => ['symbol' => $this->symbol, 'display_name' => null, 'asset_class' => 'synthetic_index'],
            'market' => ['last_price' => $this->lastPrice],
            'timeframes' => $this->timeframes,
            'structure' => $this->structure,
            'levels' => $this->levels,
        ];
    }
}
