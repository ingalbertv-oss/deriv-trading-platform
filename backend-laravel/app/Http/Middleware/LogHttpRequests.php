<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

class LogHttpRequests
{
    /**
     * Add a correlation id and record the outcome of each application request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $requestId = $this->requestId($request->header('X-Request-Id'));
        $startedAt = hrtime(true);

        $request->attributes->set('request_id', $requestId);

        Log::withContext([
            'request_id' => $requestId,
            'method' => $request->method(),
            'path' => $request->path(),
        ]);

        Log::info('HTTP request started');

        try {
            $response = $next($request);
        } catch (Throwable $exception) {
            Log::error('HTTP request failed', [
                'status' => Response::HTTP_INTERNAL_SERVER_ERROR,
                'duration_ms' => $this->durationInMilliseconds($startedAt),
                'exception' => $exception::class,
                'user_id' => $request->user()?->getAuthIdentifier(),
            ]);

            throw $exception;
        }

        $response->headers->set('X-Request-Id', $requestId);
        Log::info('HTTP request completed', [
            'status' => $response->getStatusCode(),
            'duration_ms' => $this->durationInMilliseconds($startedAt),
            'user_id' => $request->user()?->getAuthIdentifier(),
        ]);

        return $response;
    }

    private function requestId(?string $candidate): string
    {
        if ($candidate !== null && preg_match('/^[A-Za-z0-9._:-]{1,100}$/', $candidate) === 1) {
            return $candidate;
        }

        return (string) Str::uuid();
    }

    private function durationInMilliseconds(int $startedAt): float
    {
        return round((hrtime(true) - $startedAt) / 1_000_000, 2);
    }
}
