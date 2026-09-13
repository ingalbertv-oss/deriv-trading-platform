<?php

namespace App\Http\Controllers;

use App\Services\DerivRequestService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Throwable;

class DerivTradeController extends Controller
{
    public function proposal(Request $request, DerivRequestService $deriv): JsonResponse
    {
        $data = $request->validate([
            'contract_type' => ['required', 'string', 'max:40'],
            'currency' => ['nullable', 'string', 'size:3'],
            'symbol' => ['required', 'string', 'max:64'],
            'stake' => ['required', 'numeric', 'gt:0', 'max:100000'],
            'duration' => ['required', 'integer', 'gt:0'],
            'duration_unit' => ['required', 'in:t,s,m,h,d'],
            'basis' => ['nullable', 'in:stake,payout'],
        ]);

        try {
            $account = $this->activeAccount($request);
            $response = $deriv->request($request->user(), $account->deriv_account_id, [
                'proposal' => 1,
                'contract_type' => $data['contract_type'],
                'currency' => $data['currency'] ?? 'USD',
                'underlying_symbol' => $data['symbol'],
                'amount' => $data['stake'],
                'basis' => $data['basis'] ?? 'stake',
                'duration' => $data['duration'],
                'duration_unit' => $data['duration_unit'],
                'subscribe' => 0,
            ], 'proposal');
            return response()->json(['success' => true, 'data' => $response]);
        } catch (Throwable $e) {
            report($e);
            return response()->json(['success' => false, 'message' => 'Deriv proposal request failed.'], 502);
        }
    }

    public function buy(Request $request, DerivRequestService $deriv): JsonResponse
    {
        if (! config('services.deriv.trading_enabled', false)) return $this->disabled();
        $data = $request->validate(['buyId' => ['required', 'string', 'max:200'], 'price' => ['required', 'numeric', 'gt:0', 'max:100000']]);
        return $this->tradeRequest($request, $deriv, ['buy' => $data['buyId'], 'price' => $data['price']], 'buy');
    }

    public function sell(Request $request, DerivRequestService $deriv): JsonResponse
    {
        if (! config('services.deriv.trading_enabled', false)) return $this->disabled();
        $data = $request->validate(['contractId' => ['required', 'integer', 'min:1'], 'price' => ['nullable', 'numeric', 'min:0', 'max:100000']]);
        return $this->tradeRequest($request, $deriv, ['sell' => $data['contractId'], 'price' => $data['price'] ?? 0], 'sell');
    }

    public function subscribePosition(Request $request, DerivRequestService $deriv): JsonResponse
    {
        $data = $request->validate(['contractId' => ['nullable', 'integer', 'min:1']]);
        $payload = ['proposal_open_contract' => 1, 'subscribe' => 0];
        if (isset($data['contractId'])) $payload['contract_id'] = $data['contractId'];
        return $this->tradeRequest($request, $deriv, $payload, 'proposal_open_contract');
    }

    private function tradeRequest(Request $request, DerivRequestService $deriv, array $payload, string $type): JsonResponse
    {
        try {
            $account = $this->activeAccount($request);
            $response = $deriv->request($request->user(), $account->deriv_account_id, $payload, $type);
            return response()->json(['success' => true, 'data' => $response]);
        } catch (Throwable $e) {
            report($e);
            return response()->json(['success' => false, 'message' => 'Deriv trading request failed.'], 502);
        }
    }

    private function activeAccount(Request $request)
    {
        return $request->user()->derivAccounts()->where('is_default', true)->where('is_active', true)->firstOrFail();
    }

    private function disabled(): JsonResponse
    {
        return response()->json(['success' => false, 'message' => 'Trading is disabled in this environment.'], 423);
    }
}
