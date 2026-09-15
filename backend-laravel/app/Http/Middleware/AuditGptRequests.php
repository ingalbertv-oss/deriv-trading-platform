<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class AuditGptRequests
{
    public function handle(Request $request, Closure $next): Response
    {
        $startedAt = hrtime(true);
        $response = $next($request);
        $body = json_decode((string) $response->getContent(), true);

        Log::info('GPT market request audited', [
            'request_id' => $request->attributes->get('request_id'),
            'endpoint' => $request->path(),
            'symbol' => $request->route('symbol'),
            'timeframes' => $request->query('timeframes'),
            'response_time_ms' => round((hrtime(true) - $startedAt) / 1_000_000, 2),
            'data_timestamp' => data_get($body, 'market.price_timestamp', data_get($body, 'current_price.timestamp')),
            'status' => $response->getStatusCode(),
        ]);

        return $response;
    }
}
