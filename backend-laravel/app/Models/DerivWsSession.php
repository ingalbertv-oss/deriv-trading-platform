<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DerivWsSession extends UuidModel
{
    protected $fillable = ['user_id', 'deriv_account_id', 'status', 'socket_type', 'connected_at', 'disconnected_at', 'last_ping_at', 'last_pong_at', 'reconnect_count', 'meta_json'];
    protected $casts = ['connected_at' => 'datetime', 'disconnected_at' => 'datetime', 'last_ping_at' => 'datetime', 'last_pong_at' => 'datetime', 'meta_json' => 'array'];

    public function user(): BelongsTo { return $this->belongsTo(User::class); }
    public function account(): BelongsTo { return $this->belongsTo(DerivAccount::class, 'deriv_account_id'); }
}
