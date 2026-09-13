<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WatchlistSymbol extends UuidModel
{
    public $timestamps = false;
    protected $fillable = ['watchlist_id', 'symbol', 'sort_order', 'created_at'];
    protected $casts = ['created_at' => 'datetime'];

    public function watchlist(): BelongsTo { return $this->belongsTo(Watchlist::class); }
}
