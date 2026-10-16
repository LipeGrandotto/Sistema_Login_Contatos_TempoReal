<?php

namespace App\Http\Controllers;

use App\Events\ContactCreated;
use App\Events\ContactDeleted;
use App\Http\Requests\StoreContactRequest;
use App\Models\Contact;
use App\Services\ActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ContactController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $perPage = min(max($request->integer('per_page', 20), 5), 50); // teto evita abuso
        $term = trim((string) $request->query('q', ''));

        $query = Contact::query()->with('creator:id,name')->orderByDesc('id');

        // Menor privilégio: operador enxerga somente o que ele mesmo cadastrou.
        if (! $user->isAdmin()) {
            $query->where('created_by', $user->id);
        }

        if ($term !== '') {
            $like = '%'.addcslashes($term, '%_\\').'%';
            $query->where(fn ($q) => $q->where('name', 'like', $like)->orWhere('email', 'like', $like)->orWhere('city', 'like', $like));
        }

        // Paginação no banco (LIMIT/OFFSET), nunca em memória.
        return $query->paginate($perPage);
    }

    public function store(StoreContactRequest $request): JsonResponse
    {
        $contact = new Contact($request->validated());
        $contact->created_by = $request->user()->id;
        $contact->save();

        ActivityLogger::log('contact.created', "{$request->user()->name} cadastrou o contato {$contact->name}", $request->user(), ['contact_id' => $contact->id]);
        event(new ContactCreated($contact)); // notifica administradores em tempo real

        return response()->json($contact->load('creator:id,name'), 201);
    }

    public function destroy(Request $request, Contact $contact): JsonResponse
    {
        $user = $request->user();

        // Operador só apaga os próprios. Para os demais responde 404 (não revela que o contato existe).
        abort_unless($user->isAdmin() || (int) $contact->created_by === (int) $user->id, 404);

        $contact->delete();

        ActivityLogger::log('contact.deleted', "{$user->name} excluiu o contato {$contact->name}", $user, ['contact_id' => $contact->id]);
        event(new ContactDeleted($contact->id, $user->name)); // avisa os administradores

        return response()->json(null, 204);
    }
}
