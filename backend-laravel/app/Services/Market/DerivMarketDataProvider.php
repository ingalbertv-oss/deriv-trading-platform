<?php

namespace App\Services\Market;

use App\DTO\CandleDTO;
use App\Enums\Timeframe;
use Pawl\WebSocket\Connector;
use React\EventLoop\Factory;
use RuntimeException;
use Throwable;

class DerivMarketDataProvider implements MarketDataProvider
{
    public function candles(string $symbol, Timeframe $timeframe, int $count): array
    {
        $data = $this->request(['ticks_history' => $symbol, 'style' => 'candles', 'granularity' => $timeframe->value, 'count' => $count, 'end' => 'latest']);
        $candles = data_get($data, 'candles', []);

        return array_values(array_map(fn (array $candle): CandleDTO => new CandleDTO((int) $candle['epoch'], (float) $candle['open'], (float) $candle['high'], (float) $candle['low'], (float) $candle['close'], true), $candles));
    }

    public function latestPrice(string $symbol): array
    {
        $data = $this->request(['ticks' => $symbol, 'subscribe' => 0]);
        $tick = data_get($data, 'tick', []);

        return ['value' => isset($tick['quote']) ? (float) $tick['quote'] : null, 'timestamp' => isset($tick['epoch']) ? gmdate('c', (int) $tick['epoch']) : null];
    }

    public function recentTicks(string $symbol, int $count): array
    {
        $data = $this->request(['ticks_history' => $symbol, 'style' => 'ticks', 'count' => $count, 'end' => 'latest']);
        $times = data_get($data, 'history.times', []);
        $prices = data_get($data, 'history.prices', []);

        return array_map(fn (int $index): array => ['timestamp' => gmdate('c', (int) $times[$index]), 'price' => (float) $prices[$index]], array_keys($times));
    }

    public function instruments(): array
    {
        return array_map(fn (array $instrument): array => ['symbol' => $instrument['symbol'] ?? null, 'display_name' => $instrument['display_name'] ?? null, 'type' => $instrument['market'] ?? 'unknown', 'enabled' => true], data_get($this->request(['active_symbols' => 'brief']), 'active_symbols', []));
    }

    private function request(array $payload): array
    {
        $url = (string) config('deriv.public_ws');
        $appId = config('deriv.app_id');
        if ($appId) {
            $url .= (str_contains($url, '?') ? '&' : '?').'app_id='.urlencode((string) $appId);
        }
        $loop = Factory::create();
        $result = null;
        $failure = null;
        $connector = new Connector($loop);
        $connector($url)->then(function ($connection) use (&$result, &$failure, $loop, $payload): void {
            $connection->send(json_encode($payload, JSON_THROW_ON_ERROR));
            $connection->on('message', function ($message) use (&$result, &$failure, $loop, $connection): void {
                $data = json_decode($message->getPayload(), true);
                if (! is_array($data)) {
                    return;
                }
                if (isset($data['error'])) {
                    $failure = (string) ($data['error']['message'] ?? 'Invalid Deriv response.');
                } else {
                    $result = $data;
                }
                $connection->close();
                $loop->stop();
            });
        }, function (Throwable $error) use (&$failure, $loop): void {
            $failure = $error->getMessage();
            $loop->stop();
        });
        $loop->addTimer(15, function () use (&$failure, $loop): void {
            $failure = 'Deriv market request timed out.';
            $loop->stop();
        });
        $loop->run();
        if ($failure !== null) {
            throw new RuntimeException($failure);
        }
        if (! is_array($result)) {
            throw new RuntimeException('Empty Deriv response.');
        }

        return $result;
    }
}
