<?php

namespace App\Http\Controllers;

use App\Models\DerivConnection;
use App\Services\DerivOAuthService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Throwable;

class DerivOAuthController extends Controller
{
    public function start(Request $request, DerivOAuthService $oauth): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => ['authorizationUrl' => $oauth->authorizationUrl($request->user())],
        ]);
    }

    public function callback(Request $request, DerivOAuthService $oauth): RedirectResponse
    {
        $frontend = rtrim(config('services.deriv.frontend_url'), '/').'/auth/deriv/callback';

        if ($request->filled('error')) {
            return redirect()->away($frontend.'?error='.rawurlencode($request->string('error_description')->value() ?: $request->string('error')->value()));
        }

        try {
            if (! $request->filled('code') || ! $request->filled('state')) {
                throw new \RuntimeException('Missing OAuth callback parameters.');
            }

            $oauth->handleCallback($request->string('code')->value(), $request->string('state')->value());
            return redirect()->away($frontend.'?status=success');
        } catch (Throwable $e) {
            report($e);
            return redirect()->away($frontend.'?error='.rawurlencode('Deriv connection failed.'));
        }
    }

    public function status(Request $request): JsonResponse
    {
        $connection = $request->user()->derivConnections()->where('is_active', true)->latest()->first();
        return response()->json(['success' => true, 'data' => [
            'connected' => (bool) $connection,
            'connectionId' => $connection?->id,
            'tokenExpiresAt' => $connection?->token_expires_at?->toISOString(),
        ]]);
    }

    public function connections(Request $request): JsonResponse
    {
        $connections = $request->user()->derivConnections()->latest()->get()->map(fn (DerivConnection $connection) => [
            'id' => $connection->id,
            'provider' => $connection->provider,
            'isActive' => $connection->is_active,
            'tokenExpiresAt' => $connection->token_expires_at?->toISOString(),
            'scope' => $connection->scope,
            'createdAt' => $connection->created_at?->toISOString(),
            'updatedAt' => $connection->updated_at?->toISOString(),
        ]);

        return response()->json(['success' => true, 'data' => $connections]);
    }

    public function disconnect(Request $request, string $id): JsonResponse
    {
        $connection = $request->user()->derivConnections()->findOrFail($id);
        $connection->update(['is_active' => false]);
        return response()->json(['success' => true, 'data' => null]);
    }
}
