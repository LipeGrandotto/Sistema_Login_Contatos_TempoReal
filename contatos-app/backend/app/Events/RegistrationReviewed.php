<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Contracts\Events\ShouldDispatchAfterCommit;
use Illuminate\Foundation\Events\Dispatchable;

/**
 * Avisa o solicitante (ainda sem login) em tempo real. Canal público com nome
 * imprevisível; o payload carrega apenas o status.
 */
class RegistrationReviewed implements ShouldBroadcast, ShouldDispatchAfterCommit
{
    use Dispatchable, InteractsWithSockets;

    public function __construct(public string $channel, public string $status)
    {
    }

    public function broadcastOn(): array
    {
        return [new Channel('registration.'.$this->channel)];
    }

    public function broadcastAs(): string
    {
        return 'registration.reviewed';
    }

    public function broadcastWith(): array
    {
        return ['status' => $this->status];
    }
}
