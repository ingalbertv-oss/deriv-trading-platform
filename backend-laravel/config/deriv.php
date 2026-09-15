<?php

return [
    'base_url' => env('DERIV_BASE_URL', env('DERIV_API_BASE_URL', 'https://api.derivws.com')),
    'public_ws' => env('DERIV_PUBLIC_WS', env('DERIV_WS_PUBLIC_URL', 'wss://api.derivws.com/trading/v1/options/ws/public')),
    'app_id' => env('DERIV_APP_ID'),
    'pat' => env('DERIV_PAT'),
];
