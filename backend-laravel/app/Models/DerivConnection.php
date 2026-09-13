<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DerivConnection extends UuidModel
{
    protected $fillable = ['user_id', 'provider', 'deriv_user_ref', 'access_token_encrypted', 'refresh_token_encrypted', 'token_expires_at', 'scope', 'is_active'];
    protected $casts = ['token_expires_at' => 'datetime', 'is_active' => 'boolean'];

    public function user(): BelongsTo { return $this->belongsTo(User::class); }
    public function accounts(): HasMany { return $this->hasMany(DerivAccount::class); }
}
