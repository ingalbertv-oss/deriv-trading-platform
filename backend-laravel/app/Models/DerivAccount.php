<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DerivAccount extends UuidModel
{
    protected $fillable = ['user_id', 'deriv_connection_id', 'deriv_account_id', 'account_type', 'currency', 'group_name', 'is_default', 'is_active', 'metadata_json'];
    protected $casts = ['metadata_json' => 'array', 'is_default' => 'boolean', 'is_active' => 'boolean'];

    public function user(): BelongsTo { return $this->belongsTo(User::class); }
    public function connection(): BelongsTo { return $this->belongsTo(DerivConnection::class, 'deriv_connection_id'); }
    public function wsSessions(): HasMany { return $this->hasMany(DerivWsSession::class, 'deriv_account_id'); }
}
