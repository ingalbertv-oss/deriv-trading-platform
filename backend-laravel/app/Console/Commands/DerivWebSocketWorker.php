<?php

namespace App\Console\Commands;

use App\Events\DerivStreamEvent;
use App\Models\DerivAccount;
use App\Services\DerivAccountService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Pawl\WebSocket\Connector;
use React\EventLoop\Factory;
use React\EventLoop\LoopInterface;
use Throwable;

class DerivWebSocketWorker extends Command
{
    protected $signature = 'deriv:ws {accountId : Deriv account identifier} {--user= : Optional local user UUID}';
    protected $description = 'Maintain an authenticated Deriv WebSocket and broadcast account events';

    public function handle(DerivAccountService $accounts): int
    {
        $query = DerivAccount::with('user')->where('deriv_account_id', $this->argument('accountId'));
        if ($this->option('user')) {
            $query->where('user_id', $this->option('user'));
        }
        $account = $query->first();

        if (! $account) {
            $this->error('Deriv account was not found for the requested user.');
            return self::FAILURE;
        }

        $loop = Factory::create();
        $connector = new Connector($loop);
        $this->info("Starting Deriv WebSocket worker for {$account->deriv_account_id}");
        $this->connect($loop, $connector, $accounts, $account);
        $loop->run();

        return self::SUCCESS;
    }

    private function connect(LoopInterface $loop, Connector $connector, DerivAccountService $accounts, DerivAccount $account): void
    {
        try {
            $url = $accounts->otp($account->user, $account->deriv_account_id);
        } catch (Throwable $e) {
            Log::error('Deriv OTP request failed', ['account_id' => $account->deriv_account_id, 'error' => $e->getMessage()]);
            $loop->addTimer(5, fn () => $this->connect($loop, $connector, $accounts, $account));
            return;
        }

        $connector($url)->then(
            function ($connection) use ($loop, $account): void {
                $this->broadcast($account, 'deriv.connection.status', ['status' => 'connected']);
                $connection->send(json_encode(['balance' => 1, 'subscribe' => 1, 'req_id' => 1], JSON_THROW_ON_ERROR));
                $connection->send(json_encode(['portfolio' => 1, 'subscribe' => 1, 'req_id' => 2], JSON_THROW_ON_ERROR));
                $connection->send(json_encode(['transaction' => 1, 'subscribe' => 1, 'req_id' => 3], JSON_THROW_ON_ERROR));

                $ping = $loop->addPeriodicTimer(30, function () use ($connection): void {
                    $connection->send(json_encode(['ping' => 1], JSON_THROW_ON_ERROR));
                });

                $connection->on('message', function ($message) use ($account): void {
                    $payload = json_decode($message->getPayload(), true);
                    if (is_array($payload)) {
                        $this->broadcastMessage($account, $payload);
                    }
                });

                $connection->on('close', function () use ($loop, $ping, $account, $connector, $connection): void {
                    $loop->cancelTimer($ping);
                    $this->broadcast($account, 'deriv.connection.status', ['status' => 'disconnected']);
                    $loop->addTimer(2, fn () => $this->connect($loop, $connector, app(DerivAccountService::class), $account));
                });
            },
            function (Throwable $e) use ($loop, $connector, $accounts, $account): void {
                Log::warning('Deriv WebSocket connection failed', ['account_id' => $account->deriv_account_id, 'error' => $e->getMessage()]);
                $loop->addTimer(5, fn () => $this->connect($loop, $connector, $accounts, $account));
            },
        );
    }

    private function broadcastMessage(DerivAccount $account, array $payload): void
    {
        $map = [
            'balance' => 'deriv.account.balance.updated',
            'tick' => 'deriv.market.tick',
            'ohlc' => 'deriv.market.candle',
            'portfolio' => 'deriv.account.portfolio.updated',
            'transaction' => 'deriv.account.transaction.created',
            'proposal' => 'deriv.trade.proposal',
            'buy' => 'deriv.trade.buy',
            'sell' => 'deriv.trade.sell',
            'proposal_open_contract' => 'deriv.trade.open_contract',
        ];

        $type = $payload['msg_type'] ?? null;
        if ($type && isset($map[$type])) {
            $this->broadcast($account, $map[$type], $payload[$type] ?? $payload);
        } elseif (isset($payload['error'])) {
            $this->broadcast($account, 'deriv.error', $payload['error']);
        }
    }

    private function broadcast(DerivAccount $account, string $type, mixed $data): void
    {
        DerivStreamEvent::dispatch($account->user_id, $account->deriv_account_id, $type, is_array($data) ? $data : ['value' => $data]);
    }
}
