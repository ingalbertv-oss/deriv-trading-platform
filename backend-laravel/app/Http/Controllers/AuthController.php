<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class AuthController extends Controller
{
    public function register(Request $request): JsonResponse
    {
        $data = Validator::make($request->all(), [
            'name' => ['required', 'string', 'min:2', 'max:100'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8', 'max:100'],
        ])->validate();

        $user = User::create([
            'id' => (string) \Illuminate\Support\Str::uuid(),
            'name' => $data['name'],
            'email' => strtolower($data['email']),
            'password_hash' => Hash::make($data['password']),
        ]);

        Auth::login($user);
        $request->session()->regenerate();

        return $this->userResponse($user, 201);
    }

    public function login(Request $request): JsonResponse
    {
        $data = Validator::make($request->all(), [
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ])->validate();

        $user = User::where('email', strtolower($data['email']))->first();

        if (! $user || ! $this->passwordMatches($data['password'], $user->password_hash)) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid credentials',
            ], 401);
        }

        Auth::login($user);
        $request->session()->regenerate();

        return $this->userResponse($user);
    }

    public function logout(Request $request): JsonResponse
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(['success' => true, 'data' => null]);
    }

    public function me(Request $request): JsonResponse
    {
        return $this->userResponse($request->user());
    }

    private function userResponse(User $user, int $status = 200): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'created_at' => $user->created_at?->toISOString(),
            ],
        ], $status);
    }

    private function passwordMatches(string $password, string $stored): bool
    {
        if (str_starts_with($stored, '$2y$') || str_starts_with($stored, '$argon')) {
            return Hash::check($password, $stored);
        }

        // Compatibility with the PBKDF2 format used by the Express backend:
        // salt:sha512(salt, password, 100000, 64 bytes).
        [$salt, $hash] = array_pad(explode(':', $stored, 2), 2, null);
        if (! $salt || ! $hash) {
            return false;
        }

        $candidate = hash_pbkdf2('sha512', $password, $salt, 100000, 128);
        return hash_equals($hash, $candidate);
    }
}
