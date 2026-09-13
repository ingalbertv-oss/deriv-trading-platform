<?php

namespace App\Services;

use App\Models\User;
use Pawl\WebSocket\Connector;
use React\EventLoop\Factory;
use RuntimeException;
use Throwable;

class DerivRequestService
{
    public function __construct(private readonly DerivAccountService $accounts) {}

    /** Execute one request over a fresh OTP-authenticated Deriv socket. */
    public function request(User $user, string $accountId, array $payload, string $expectedType): array
    {
        $url = $this->accounts->otp($user, $accountId);
        $loop = Factory::create();
        $connector = new Connector($loop);
        $result = null;
        $failure = null;
        $timer = null;

        $connector($url)->then(
            function ($connection) use (&$timer, &$result, &$failure, $loop, $payload, $expectedType): void {
                $connection->send(json_encode($payload, JSON_THROW_ON_ERROR));
                $connection->on('message', function ($message) use (&$timer, &$result, &$failure, $loop, $connection, $expectedType): void {
                    $data = json_decode($message->getPayload(), true);
                    if (! is_array($data)) return;
                    if (isset($data['error'])) {
                        $failure = (string) ($data['error']['message'] ?? 'Deriv request failed.');
                    } elseif (($data['msg_type'] ?? null) === $expectedType) {
                        $result = $data;
                    } else {
                        return;
                    }
                    if ($timer) $loop->cancelTimer($timer);
                    $connection->close();
                    $loop->stop();
                });
            },
            function (Throwable $error) use (&$failure, $loop): void {
                $failure = $error->getMessage();
                $loop->stop();
            },
        );

        $timer = $loop->addTimer(15, function () use (&$failure, $loop): void {
            $failure = 'Deriv WebSocket request timed out.';
            $loop->stop();
        });
        $loop->run();

        if ($failure !== null) throw new RuntimeException($failure);
        if (! is_array($result)) throw new RuntimeException('Empty Deriv response.');
        return $result;
    }
}
