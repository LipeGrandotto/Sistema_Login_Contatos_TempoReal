<?php

namespace App\Events;

use App\Models\RegistrationRequest;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Contracts\Events\ShouldDispatchAfterCommit;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class RegistrationRequested implements ShouldBroadcast, ShouldDispatchAfterCommit
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public RegistrationRequest $registrationRequest)
    {
    }

    public function broadcastOn(): array
    {
        return [new PrivateChannel('admin')];
    }

    public function broadcastAs(): string
    {
        return 'registration.requested';
    }

    public function broadcastWith(): array
    {
        return [
            'id' => $this->registrationRequest->id,
            'name' => $this->registrationRequest->name,
            'created_at' => $this->registrationRequest->created_at?->toIso8601String(),
        ];
    }
}
