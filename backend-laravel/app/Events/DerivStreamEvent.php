<?php

namespace App\Events;

use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class DerivStreamEvent implements ShouldBroadcastNow
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public string $userId,
        public string $accountId,
        public string $type,
        public array $data = [],
    ) {}

    public function broadcastOn(): array
    {
        return [new PrivateChannel("deriv.{$this->userId}.account.{$this->accountId}")];
    }

    public function broadcastAs(): string
    {
        return $this->type;
    }
}
