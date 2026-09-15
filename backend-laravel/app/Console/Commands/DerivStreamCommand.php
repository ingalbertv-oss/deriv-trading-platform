<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Redis;
use Pawl\WebSocket\Connector;
use React\EventLoop\Factory;
use React\EventLoop\LoopInterface;
use Throwable;

class DerivStreamCommand extends Command
{
    protected $signature = 'deriv:stream {symbol : Public Deriv symbol}';

    protected $description = 'Stream public Deriv ticks into Redis with reconnect support';

    public function handle(): int
    {
        $symbol = strtoupper((string) $this->argument('symbol'));
        $loop = Factory::create();
        $connector = new Connector($loop);
        $this->connect($loop, $connector, $symbol);
        $loop->run();

        return self::SUCCESS;
    }

    private function connect(LoopInterface $loop, Connector $connector, string $symbol): void
    {
        $url = (string) config('deriv.public_ws');
        $appId = config('deriv.app_id');
        if ($appId) {
            $url .= (str_contains($url, '?') ? '&' : '?').'app_id='.urlencode((string) $appId);
        }
        $connector($url)->then(function ($connection) use ($loop, $connector, $symbol): void {
            $connection->send(json_encode(['ticks' => $symbol, 'subscribe' => 1], JSON_THROW_ON_ERROR));
            $connection->on('message', function ($message) use ($symbol): void {
                $payload = json_decode($message->getPayload(), true);
                $tick = is_array($payload) ? ($payload['tick'] ?? null) : null;
                if (! is_array($tick) || ! isset($tick['quote'], $tick['epoch'])) {
                    return;
                }
                $data = ['symbol' => $symbol, 'price' => (float) $tick['quote'], 'timestamp' => gmdate('c', (int) $tick['epoch']), 'epoch' => (int) $tick['epoch']];
                Redis::setex("market:{$symbol}:last_tick", 30, json_encode($data, JSON_THROW_ON_ERROR));
                Redis::lpush("market:{$symbol}:ticks", json_encode($data, JSON_THROW_ON_ERROR));
                Redis::ltrim("market:{$symbol}:ticks", 0, 499);
                Redis::setex("market:{$symbol}:last_update", 30, (string) $tick['epoch']);
            });
            $connection->on('close', fn () => $loop->addTimer(2, fn () => $this->connect($loop, $connector, $symbol)));
        }, function (Throwable $exception) use ($loop, $connector, $symbol): void {
            report($exception);
            $loop->addTimer(5, fn () => $this->connect($loop, $connector, $symbol));
        });
    }
}
