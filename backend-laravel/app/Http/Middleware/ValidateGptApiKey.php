<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ValidateGptApiKey
{
    public function handle(Request $request, Closure $next): Response
    {
        $configured = (string) config('services.gpt.api_key');
        $provided = (string) $request->bearerToken();
        if ($configured === '' || $provided === '' || ! hash_equals($configured, $provided)) {
            return response()->json(['error' => ['code' => 'UNAUTHORIZED', 'message' => 'Invalid GPT API key.', 'retryable' => false]], 401);
        }

        return $next($request);
    }
}
