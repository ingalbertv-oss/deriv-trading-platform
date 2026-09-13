<?php

namespace App\Http\Controllers;

use App\Services\DerivRequestService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Throwable;

class DerivAccountDataController extends Controller
{
    public function balance(Request $request, DerivRequestService $deriv): JsonResponse { return $this->execute($request, $deriv, ['balance' => 1], 'balance'); }
    public function portfolio(Request $request, DerivRequestService $deriv): JsonResponse { return $this->execute($request, $deriv, ['portfolio' => 1], 'portfolio'); }
    public function statement(Request $request, DerivRequestService $deriv): JsonResponse { return $this->execute($request, $deriv, ['statement' => 1, 'description' => 1, 'limit' => 50], 'statement'); }
    public function transactions(Request $request, DerivRequestService $deriv): JsonResponse { return $this->execute($request, $deriv, ['transaction' => 1, 'subscribe' => 0], 'transaction'); }
    public function profitTable(Request $request, DerivRequestService $deriv): JsonResponse { return $this->execute($request, $deriv, ['profit_table' => 1, 'limit' => 50], 'profit_table'); }

    private function execute(Request $request, DerivRequestService $deriv, array $payload, string $type): JsonResponse
    {
        try {
            $account = $request->user()->derivAccounts()->where('is_default', true)->where('is_active', true)->firstOrFail();
            $response = $deriv->request($request->user(), $account->deriv_account_id, $payload, $type);
            return response()->json(['success' => true, 'data' => $response]);
        } catch (Throwable $e) {
            report($e);
            return response()->json(['success' => false, 'message' => 'Deriv account request failed.'], 502);
        }
    }
}
