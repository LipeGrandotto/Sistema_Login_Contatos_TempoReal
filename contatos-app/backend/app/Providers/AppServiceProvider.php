<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
    }

    public function boot(): void
    {
        // Política de senha única para toda a aplicação
        Password::defaults(fn () => Password::min(10)->mixedCase()->numbers()->symbols());

        // Brute force: limita por (email + IP) e, mais frouxo, por IP
        RateLimiter::for('login', fn (Request $r) => [
            Limit::perMinute(5)->by(Str::lower((string) $r->input('email')).'|'.$r->ip()),
            Limit::perMinute(20)->by($r->ip()),
        ]);

        // Evita spam de solicitações de cadastro
        RateLimiter::for('registration', fn (Request $r) => Limit::perHour(5)->by($r->ip()));

        // Limite geral da API autenticada
        RateLimiter::for('api', fn (Request $r) => Limit::perMinute(120)->by($r->user()?->id ?: $r->ip()));
    }
}
