<?php

namespace App\Http\Controllers\Api\Gpt;

use App\Http\Controllers\Controller;
use App\Services\Market\AccountDataProvider;
use Illuminate\Http\JsonResponse;
use Throwable;

class AccountController extends Controller
{
    public function __construct(private readonly AccountDataProvider $provider) {}

    public function summary(): JsonResponse
    {
        return $this->read(fn (): array => $this->provider->summary());
    }

    public function positions(): JsonResponse
    {
        return $this->read(fn (): array => $this->provider->positions());
    }

    private function read(\Closure $operation): JsonResponse
    {
        try {
            return response()->json($operation());
        } catch (Throwable $exception) {
            report($exception);

            return response()->json(['error' => ['code' => 'DERIV_AUTH_ERROR', 'message' => 'Unable to retrieve account data.', 'retryable' => true]], 502);
        }
    }
}
