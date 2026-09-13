<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Watchlist extends UuidModel
{
    protected $fillable = ['user_id', 'name', 'is_default'];
    protected $casts = ['is_default' => 'boolean'];

    public function user(): BelongsTo { return $this->belongsTo(User::class); }
    public function symbols(): HasMany { return $this->hasMany(WatchlistSymbol::class); }
}
