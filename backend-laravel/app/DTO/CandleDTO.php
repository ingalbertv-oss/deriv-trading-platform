<?php

namespace App\DTO;

use Carbon\CarbonImmutable;

final readonly class CandleDTO
{
    public function __construct(
        public int $timestamp,
        public float $open,
        public float $high,
        public float $low,
        public float $close,
        public bool $closed,
    ) {}

    public function toArray(): array
    {
        return [
            'timestamp' => CarbonImmutable::createFromTimestampUTC($this->timestamp)->toISOString(),
            'open' => $this->open,
            'high' => $this->high,
            'low' => $this->low,
            'close' => $this->close,
            'closed' => $this->closed,
        ];
    }
}
