<?php

namespace App\Events;

use App\Models\Contact;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Contracts\Events\ShouldDispatchAfterCommit;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ContactCreated implements ShouldBroadcast, ShouldDispatchAfterCommit
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public Contact $contact)
    {
    }

    public function broadcastOn(): array
    {
        return [new PrivateChannel('admin')];
    }

    public function broadcastAs(): string
    {
        return 'contact.created';
    }

    // Payload mínimo: sem e-mail/telefone (PII) trafegando pelo WebSocket.
    public function broadcastWith(): array
    {
        $this->contact->loadMissing('creator:id,name');

        return [
            'id' => $this->contact->id,
            'name' => $this->contact->name,
            'city' => $this->contact->city,
            'state' => $this->contact->state,
            'operator' => $this->contact->creator?->name,
            'created_at' => $this->contact->created_at?->toIso8601String(),
        ];
    }
}
