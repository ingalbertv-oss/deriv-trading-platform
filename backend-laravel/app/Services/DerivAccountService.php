<?php

namespace App\Services;

use App\Models\DerivAccount;
use App\Models\DerivConnection;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class DerivAccountService
{
    public function sync(User $user): int
    {
        $connection = $this->activeConnection($user);
        $response = $this->request($connection)->get('/trading/v1/options/accounts');

        if ($response->failed()) {
            throw new RuntimeException('Unable to retrieve Deriv accounts.');
        }

        $payload = $response->json();
        $accounts = data_get($payload, 'data', data_get($payload, 'accounts', $payload));
        if (isset($accounts['accounts'])) {
            $accounts = $accounts['accounts'];
        }
        if (! is_array($accounts) || ! array_is_list($accounts)) {
            throw new RuntimeException('Unexpected Deriv accounts response.');
        }

        $count = 0;
        foreach ($accounts as $raw) {
            $derivId = (string) ($raw['account_id'] ?? $raw['deriv_account_id'] ?? $raw['loginid'] ?? '');
            if ($derivId === '') {
                continue;
            }

            DerivAccount::updateOrCreate(
                ['user_id' => $user->id, 'deriv_account_id' => $derivId],
                [
                    'deriv_connection_id' => $connection->id,
                    'account_type' => (string) ($raw['account_type'] ?? 'unknown'),
                    'currency' => (string) ($raw['currency'] ?? 'USD'),
                    'group_name' => $raw['group'] ?? $raw['group_name'] ?? null,
                    'is_active' => ($raw['status'] ?? 'active') === 'active',
                    'metadata_json' => $raw,
                ],
            );
            $count++;
        }

        if (! $user->derivAccounts()->where('is_default', true)->exists()) {
            $user->derivAccounts()->where('is_active', true)->first()?->update(['is_default' => true]);
        }

        return $count;
    }

    public function otp(User $user, string $derivAccountId): string
    {
        $connection = $this->activeConnection($user);
        $account = $user->derivAccounts()->where('deriv_account_id', $derivAccountId)->where('is_active', true)->firstOrFail();

        $response = $this->request($connection)->post("/trading/v1/options/accounts/{$account->deriv_account_id}/otp");
        if ($response->failed() || ! $response->json('data.url')) {
            throw new RuntimeException('Unable to obtain Deriv WebSocket OTP.');
        }

        return (string) $response->json('data.url');
    }

    private function activeConnection(User $user): DerivConnection
    {
        $connection = $user->derivConnections()->where('is_active', true)->latest()->first();
        if (! $connection) {
            throw new RuntimeException('No active Deriv connection.');
        }
        return $connection;
    }

    private function request(DerivConnection $connection): \Illuminate\Http\Client\PendingRequest
    {
        return Http::baseUrl(rtrim(config('services.deriv.api_base_url'), '/'))
            ->acceptJson()
            ->withToken(decrypt($connection->access_token_encrypted))
            ->timeout(15)
            ->retry(2, 250);
    }
}
