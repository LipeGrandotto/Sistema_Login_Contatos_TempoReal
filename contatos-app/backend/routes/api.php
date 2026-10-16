<?php

use App\Http\Controllers\Admin\ActivityController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ContactController;
use App\Http\Controllers\RegistrationRequestController;
use Illuminate\Support\Facades\Route;

// ---------- Público (com rate limit dedicado) ----------
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:login');
Route::post('/registration-requests', [RegistrationRequestController::class, 'store'])
    ->middleware('throttle:registration');

// ---------- Autenticado ----------
Route::middleware(['auth:sanctum', 'throttle:api'])->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    // Admin vê todos; operador vê apenas os próprios (regra no controller)
    Route::get('/contacts', [ContactController::class, 'index']);
    Route::post('/contacts', [ContactController::class, 'store']);
    Route::delete('/contacts/{contact}', [ContactController::class, 'destroy']);

    // ---------- Somente administrador ----------
    Route::middleware('role:admin')->prefix('admin')->group(function () {
        Route::get('/dashboard', DashboardController::class);
        Route::get('/activity', [ActivityController::class, 'index']);

        Route::get('/registration-requests', [RegistrationRequestController::class, 'index']);
        Route::post('/registration-requests/{registrationRequest}/approve', [RegistrationRequestController::class, 'approve']);
        Route::post('/registration-requests/{registrationRequest}/reject', [RegistrationRequestController::class, 'reject']);

        Route::get('/users', [UserController::class, 'index']);
        Route::post('/users', [UserController::class, 'store']);
        Route::patch('/users/{user}/active', [UserController::class, 'setActive']);
    });
});
