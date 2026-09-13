<?php

use App\Models\DerivAccount;
use Illuminate\Support\Facades\Broadcast;

Broadcast::routes(['middleware' => ['auth:sanctum']]);

Broadcast::channel('deriv.{userId}.account.{accountId}', function ($user, string $userId, string $accountId): bool {
    return (string) $user->id === $userId
        && DerivAccount::where('user_id', $user->id)->where('deriv_account_id', $accountId)->exists();
});

Broadcast::channel('App.Models.User.{id}', function ($user, string $id): bool {
    return (string) $user->id === $id;
});
