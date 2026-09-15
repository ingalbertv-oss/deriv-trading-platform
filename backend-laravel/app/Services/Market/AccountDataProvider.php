<?php

namespace App\Services\Market;

interface AccountDataProvider
{
    public function summary(): array;

    public function positions(): array;
}
