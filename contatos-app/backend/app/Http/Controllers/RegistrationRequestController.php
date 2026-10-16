<?php

namespace App\Http\Controllers;

use App\Events\RegistrationRequested;
use App\Events\RegistrationReviewed;
use App\Http\Requests\StoreRegistrationRequest;
use App\Models\RegistrationRequest;
use App\Models\User;
use App\Services\ActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class RegistrationRequestController extends Controller
{
    /** Público: operador solicita acesso e recebe o "channel" para aguardar a resposta em tempo real. */
    public function store(StoreRegistrationRequest $request): JsonResponse
    {
        $data = $request->validated();
        $channel = Str::random(48); // 286 bits de entropia: funciona como capability

        $alreadyKnown = User::where('email', $data['email'])->exists()
            || RegistrationRequest::where('email', $data['email'])->where('status', RegistrationRequest::PENDING)->exists();

        // Resposta idêntica exista o e-mail ou não (anti-enumeração).
        if (! $alreadyKnown) {
            $rr = RegistrationRequest::create([
                'name' => $data['name'],
                'email' => $data['email'],
                'password' => Hash::make($data['password']), // nunca guardamos a senha em claro
                'channel' => $channel,
                'status' => RegistrationRequest::PENDING,
            ]);

            ActivityLogger::log('registration.requested', "Solicitação de acesso de {$rr->name}", null, ['request_id' => $rr->id]);
            event(new RegistrationRequested($rr));
        }

        return response()->json(['channel' => $channel], 202);
    }

    public function index(Request $request)
    {
        $status = $request->query('status');

        return RegistrationRequest::query()
            ->with('reviewer:id,name')
            ->when(in_array($status, ['pending', 'approved', 'rejected'], true), fn ($q) => $q->where('status', $status))
            ->latest('id')
            ->paginate(15);
    }

    public function approve(Request $request, RegistrationRequest $registrationRequest): JsonResponse
    {
        return $this->review($request, $registrationRequest, true);
    }

    public function reject(Request $request, RegistrationRequest $registrationRequest): JsonResponse
    {
        return $this->review($request, $registrationRequest, false);
    }

    private function review(Request $request, RegistrationRequest $target, bool $approve): JsonResponse
    {
        $admin = $request->user();

        $status = DB::transaction(function () use ($target, $approve, $admin) {
            // Lock evita duas análises simultâneas da mesma solicitação.
            $rr = RegistrationRequest::whereKey($target->id)->lockForUpdate()->firstOrFail();
            abort_if($rr->status !== RegistrationRequest::PENDING, 409, 'Solicitação já analisada.');

            $status = RegistrationRequest::REJECTED;

            if ($approve && ! User::where('email', $rr->email)->exists()) {
                $user = new User(['name' => $rr->name, 'email' => $rr->email, 'password' => $rr->password]);
                $user->forceFill(['role' => User::ROLE_OPERATOR, 'is_active' => true, 'email_verified_at' => now()])->save();
                $status = RegistrationRequest::APPROVED;
            }

            $rr->forceFill([
                'status' => $status,
                'password' => null, // descarta o hash: já foi transferido ao usuário (ou descartado)
                'reviewed_by' => $admin->id,
                'reviewed_at' => now(),
            ])->save();

            ActivityLogger::log("registration.{$status}", "{$admin->name} marcou a solicitação de {$rr->name} como {$status}", $admin, ['request_id' => $rr->id]);
            event(new RegistrationReviewed($rr->channel, $status));

            return $status;
        });

        return response()->json(['status' => $status]);
    }
}
