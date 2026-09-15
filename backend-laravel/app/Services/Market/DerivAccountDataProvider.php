<?php

namespace App\Services\Market;

use Pawl\WebSocket\Connector;
use React\EventLoop\Factory;
use RuntimeException;
use Throwable;

class DerivAccountDataProvider implements AccountDataProvider
{
    public function summary(): array
    {
        $data = $this->request(['balance' => 1], 'balance');
        $balance = data_get($data, 'balance', []);

        return ['currency' => $balance['currency'] ?? null, 'balance' => isset($balance['balance']) ? (float) $balance['balance'] : null, 'generated_at' => now('UTC')->toISOString()];
    }

    public function positions(): array
    {
        $data = $this->request(['portfolio' => 1], 'portfolio');

        return ['positions' => array_map(fn (array $position): array => [
            'id' => (string) ($position['contract_id'] ?? $position['id'] ?? ''),
            'symbol' => $position['symbol'] ?? null,
            'direction' => $this->direction($position),
            'entry_price' => isset($position['buy_price']) ? (float) $position['buy_price'] : null,
            'current_price' => isset($position['bid_price']) ? (float) $position['bid_price'] : null,
            'opened_at' => isset($position['date_start']) ? gmdate('c', (int) $position['date_start']) : null,
        ], data_get($data, 'portfolio.contracts', []))];
    }

    private function direction(array $position): ?string
    {
        return isset($position['contract_type']) ? (str_contains(strtolower((string) $position['contract_type']), 'put') ? 'short' : 'long') : null;
    }

    private function request(array $payload, string $expectedType): array
    {
        $pat = (string) config('deriv.pat');
        if ($pat === '') {
            throw new RuntimeException('Deriv PAT is not configured.');
        }
        $url = (string) config('deriv.public_ws');
        $appId = config('deriv.app_id');
        if ($appId) {
            $url .= (str_contains($url, '?') ? '&' : '?').'app_id='.urlencode((string) $appId);
        }
        $loop = Factory::create();
        $result = null;
        $failure = null;
        $connector = new Connector($loop);
        $connector($url)->then(function ($connection) use (&$result, &$failure, $loop, $payload, $expectedType, $pat): void {
            $connection->send(json_encode(['authorize' => $pat], JSON_THROW_ON_ERROR));
            $connection->on('message', function ($message) use (&$result, &$failure, $loop, $connection, $payload, $expectedType): void {
                $data = json_decode($message->getPayload(), true);
                if (! is_array($data)) {
                    return;
                }
                if (isset($data['error'])) {
                    $failure = (string) ($data['error']['message'] ?? 'Deriv account request failed.');
                    $connection->close();
                    $loop->stop();

                    return;
                }
                if (($data['msg_type'] ?? null) === 'authorize') {
                    $connection->send(json_encode($payload, JSON_THROW_ON_ERROR));

                    return;
                }
                if (($data['msg_type'] ?? null) === $expectedType) {
                    $result = $data;
                    $connection->close();
                    $loop->stop();
                }
            });
        }, function (Throwable $exception) use (&$failure, $loop): void {
            $failure = $exception->getMessage();
            $loop->stop();
        });
        $loop->addTimer(15, function () use (&$failure, $loop): void {
            $failure = 'Deriv account request timed out.';
            $loop->stop();
        });
        $loop->run();
        if ($failure !== null) {
            throw new RuntimeException($failure);
        }
        if (! is_array($result)) {
            throw new RuntimeException('Empty Deriv account response.');
        }

        return $result;
    }
}
