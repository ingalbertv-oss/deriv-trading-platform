<?php

namespace App\Enums;

enum Timeframe: int
{
    case M15 = 900;
    case M30 = 1800;
    case H1 = 3600;
    case H4 = 14400;
    case D1 = 86400;

    public static function fromName(string $name): self
    {
        return self::tryFromName($name) ?? throw new \InvalidArgumentException('Unsupported timeframe.');
    }

    public static function tryFromName(string $name): ?self
    {
        return match (strtoupper($name)) {
            'M15' => self::M15,
            'M30' => self::M30,
            'H1' => self::H1,
            'H4' => self::H4,
            'D1' => self::D1,
            default => null,
        };
    }

    public function name(): string
    {
        return $this->name;
    }
}
