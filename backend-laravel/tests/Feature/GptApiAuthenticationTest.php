<?php

namespace Tests\Feature;

use Tests\TestCase;

class GptApiAuthenticationTest extends TestCase
{
    public function test_gpt_routes_require_an_independent_api_key(): void
    {
        $this->getJson('/api/v1/gpt/instruments')
            ->assertUnauthorized()
            ->assertJsonPath('error.code', 'UNAUTHORIZED');
    }

    public function test_unsupported_timeframe_is_rejected_before_provider_access(): void
    {
        config(['services.gpt.api_key' => 'test-gpt-key']);

        $this->withToken('test-gpt-key')
            ->getJson('/api/v1/gpt/candles/BOOM1000/M1')
            ->assertStatus(422)
            ->assertJsonPath('error.code', 'TIMEFRAME_NOT_SUPPORTED');
    }
}
