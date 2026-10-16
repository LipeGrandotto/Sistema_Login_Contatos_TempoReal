<?php

namespace App\Http\Controllers;

use App\Services\ActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email', 'max:190'],
            'password' => ['required', 'string', 'max:255'],
        ]);

        // is_active entra na própria query: usuário desativado não loga.
        $ok = Auth::guard('web')->attempt(
            ['email' => mb_strtolower($credentials['email']), 'password' => $credentials['password'], 'is_active' => true]
        );

        if (! $ok) {
            // Mensagem genérica: não revela se o e-mail existe.
            throw ValidationException::withMessages(['email' => 'Credenciais inválidas.']);
        }

        $request->session()->regenerate(); // anti session fixation

        $user = $request->user();
        $user->forceFill(['last_login_at' => now()])->save();
        ActivityLogger::log('auth.login', "{$user->name} entrou no sistema", $user);

        return response()->json($this->payload($user));
    }

    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();
        ActivityLogger::log('auth.logout', "{$user->name} saiu do sistema", $user);

        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(['message' => 'Sessão encerrada.']);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json($this->payload($request->user()));
    }

    private function payload($user): array
    {
        return ['user' => ['id' => $user->id, 'name' => $user->name, 'email' => $user->email, 'role' => $user->role]];
    }
}
