<?php

namespace Tests\Feature;

use Tests\TestCase;

class HttpRequestLoggingTest extends TestCase
{
    public function test_api_response_returns_a_generated_request_id(): void
    {
        $response = $this->getJson('/api/health');

        $response->assertOk()->assertHeader('X-Request-Id');
    }

    public function test_valid_request_id_is_preserved_for_correlation(): void
    {
        $requestId = 'frontend-test-request-123';

        $response = $this->withHeader('X-Request-Id', $requestId)->getJson('/api/health');

        $response->assertOk()->assertHeader('X-Request-Id', $requestId);
    }
}
