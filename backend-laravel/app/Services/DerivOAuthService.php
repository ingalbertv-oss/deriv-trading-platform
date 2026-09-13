<?php

namespace App\Services;

use App\Models\DerivConnection;
use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use RuntimeException;

class DerivOAuthService
{
    private const STATE_TTL = 600;

    public function authorizationUrl(User $user): string
    {
        $verifier = rtrim(strtr(base64_encode(random_bytes(64)), '+/', '-_'), '=');
        $challenge = rtrim(strtr(base64_encode(hash('sha256', $verifier, true)), '+/', '-_'), '=');
        $state = Str::random(64);

        Cache::put("deriv:oauth:{$state}", [
            'user_id' => $user->id,
            'code_verifier' => $verifier,
        ], now()->addSeconds(self::STATE_TTL));

        return rtrim(config('services.deriv.auth_base_url'), '/').'/oauth2/auth?'.http_build_query([
            'response_type' => 'code',
            'client_id' => config('services.deriv.client_id'),
            'redirect_uri' => config('services.deriv.oauth_redirect_uri'),
            'scope' => 'trade',
            'state' => $state,
            'code_challenge' => $challenge,
            'code_challenge_method' => 'S256',
        ], '', '&', PHP_QUERY_RFC3986);
    }

    public function handleCallback(string $code, string $state): DerivConnection
    {
        $flow = Cache::pull("deriv:oauth:{$state}");
        if (! is_array($flow) || empty($flow['user_id']) || empty($flow['code_verifier'])) {
            throw new RuntimeException('Invalid or expired OAuth state.');
        }

        $response = Http::asForm()
            ->acceptJson()
            ->post(rtrim(config('services.deriv.auth_base_url'), '/').'/oauth2/token', [
                'grant_type' => 'authorization_code',
                'client_id' => config('services.deriv.client_id'),
                'code' => $code,
                'code_verifier' => $flow['code_verifier'],
                'redirect_uri' => config('services.deriv.oauth_redirect_uri'),
            ]);

        if ($response->failed() || ! $response->json('access_token')) {
            throw new RuntimeException('Deriv token exchange failed.');
        }

        $expiresIn = $response->integer('expires_in');

        return DerivConnection::create([
            'user_id' => $flow['user_id'],
            'provider' => 'deriv',
            'access_token_encrypted' => encrypt($response->string('access_token')),
            'refresh_token_encrypted' => $response->json('refresh_token')
                ? encrypt((string) $response->json('refresh_token'))
                : null,
            'token_expires_at' => $expiresIn ? now()->addSeconds($expiresIn) : null,
            'scope' => $response->string('scope') ?: 'trade',
            'is_active' => true,
        ]);
    }
}
