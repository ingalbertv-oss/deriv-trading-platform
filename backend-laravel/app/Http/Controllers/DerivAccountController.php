<?php

namespace App\Http\Controllers;

use App\Models\DerivAccount;
use App\Services\DerivAccountService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Throwable;

class DerivAccountController extends Controller
{
    public function index(Request $request, DerivAccountService $service): JsonResponse
    {
        if ($request->boolean('sync')) {
            $service->sync($request->user());
        }

        return response()->json(['success' => true, 'data' => $this->serialize($request->user()->derivAccounts()->orderByDesc('is_default')->get())]);
    }

    public function sync(Request $request, DerivAccountService $service): JsonResponse
    {
        $count = $service->sync($request->user());
        return response()->json(['success' => true, 'data' => ['synchronized' => $count]]);
    }

    public function select(Request $request, string $derivAccountId): JsonResponse
    {
        $account = $request->user()->derivAccounts()->where('deriv_account_id', $derivAccountId)->where('is_active', true)->firstOrFail();
        DB::transaction(function () use ($request, $account): void {
            $request->user()->derivAccounts()->update(['is_default' => false]);
            $account->update(['is_default' => true]);
        });

        return response()->json(['success' => true, 'data' => $this->serialize(collect([$account->fresh()]))->first()]);
    }

    public function active(Request $request): JsonResponse
    {
        $account = $request->user()->derivAccounts()->where('is_default', true)->where('is_active', true)->first();
        return response()->json(['success' => true, 'data' => $account ? $this->serialize(collect([$account]))->first() : null]);
    }

    public function connect(Request $request, string $derivAccountId, DerivAccountService $service): JsonResponse
    {
        try {
            $url = $service->otp($request->user(), $derivAccountId);
            return response()->json(['success' => true, 'data' => ['websocketUrl' => $url, 'status' => 'otp_ready']]);
        } catch (Throwable $e) {
            report($e);
            return response()->json(['success' => false, 'message' => 'Unable to connect to Deriv account.'], 502);
        }
    }

    private function serialize($accounts): array
    {
        return collect($accounts)->map(fn (DerivAccount $account) => [
            'id' => $account->id,
            'derivAccountId' => $account->deriv_account_id,
            'accountType' => $account->account_type,
            'currency' => $account->currency,
            'groupName' => $account->group_name,
            'isDefault' => $account->is_default,
            'isActive' => $account->is_active,
        ])->values()->all();
    }
}
