<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreUserRequest;
use App\Models\User;
use App\Services\ActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class UserController extends Controller
{
    public function index()
    {
        return User::query()
            ->select('id', 'name', 'email', 'role', 'is_active', 'last_login_at', 'created_at')
            ->orderBy('name')
            ->paginate(20);
    }

    public function store(StoreUserRequest $request): JsonResponse
    {
        $data = $request->validated();

        $user = new User(['name' => $data['name'], 'email' => $data['email'], 'password' => $data['password']]);
        $user->forceFill(['role' => $data['role'], 'is_active' => true, 'email_verified_at' => now()])->save();

        ActivityLogger::log('user.created', "{$request->user()->name} criou o usuário {$user->name} ({$user->role})", $request->user(), ['user_id' => $user->id]);

        return response()->json($user->only('id', 'name', 'email', 'role', 'is_active'), 201);
    }

    public function setActive(Request $request, User $user): JsonResponse
    {
        $data = $request->validate(['is_active' => ['required', 'boolean']]);
        abort_if($user->id === $request->user()->id, 422, 'Você não pode desativar a si mesmo.');

        $user->forceFill(['is_active' => $data['is_active']])->save();

        if (! $user->is_active) {
            // Revoga sessões ativas imediatamente (SESSION_DRIVER=database).
            DB::table('sessions')->where('user_id', $user->id)->delete();
        }

        ActivityLogger::log('user.updated', "{$request->user()->name} ".($user->is_active ? 'reativou' : 'desativou')." {$user->name}", $request->user());

        return response()->json($user->only('id', 'is_active'));
    }
}
