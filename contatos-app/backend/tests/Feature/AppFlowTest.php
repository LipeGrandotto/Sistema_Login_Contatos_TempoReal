<?php

namespace Tests\Feature;

use App\Events\ContactCreated;
use App\Events\ContactDeleted;
use App\Events\RegistrationReviewed;
use App\Models\Contact;
use App\Models\RegistrationRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AppFlowTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        return User::factory()->create(['role' => 'admin', 'is_active' => true]);
    }

    private function operator(): User
    {
        return User::factory()->create(['role' => 'operator', 'is_active' => true]);
    }

    private function contactPayload(array $override = []): array
    {
        return array_merge([
            'name' => 'Maria Silva', 'email' => 'maria@example.com', 'phone' => '(62) 99999-0000',
            'company' => 'ACME', 'city' => 'Goiânia', 'state' => 'GO',
        ], $override);
    }

    public function test_guest_cannot_access_api(): void
    {
        $this->getJson('/api/contacts')->assertUnauthorized();
        $this->getJson('/api/admin/dashboard')->assertUnauthorized();
    }

    public function test_operator_cannot_access_admin_routes(): void
    {
        Sanctum::actingAs($this->operator());
        $this->getJson('/api/admin/dashboard')->assertForbidden();
        $this->getJson('/api/admin/users')->assertForbidden();
    }

    public function test_login_fails_with_generic_message_and_inactive_user_cannot_login(): void
    {
        $user = User::factory()->create(['password' => 'Str0ng!Passw0rd', 'is_active' => false]);

        $this->postJson('/api/login', ['email' => $user->email, 'password' => 'Str0ng!Passw0rd'])
            ->assertStatus(422)->assertJsonValidationErrors('email');
    }

    public function test_operator_creates_contact_and_admins_are_notified(): void
    {
        Event::fake([ContactCreated::class]);
        Sanctum::actingAs($this->operator());

        $this->postJson('/api/contacts', $this->contactPayload())->assertCreated();

        Event::assertDispatched(ContactCreated::class);
        $this->assertDatabaseHas('contacts', ['email' => 'maria@example.com']);
    }

    public function test_contact_validation_rejects_invalid_uf(): void
    {
        Sanctum::actingAs($this->operator());
        $this->postJson('/api/contacts', $this->contactPayload(['state' => 'XX']))->assertStatus(422);
    }

    public function test_contacts_are_paginated_and_scoped_by_role(): void
    {
        $op = $this->operator();
        $other = $this->operator();
        Contact::factory()->count(25)->create(['created_by' => $op->id]);
        Contact::factory()->count(5)->create(['created_by' => $other->id]);

        Sanctum::actingAs($op);
        $this->getJson('/api/contacts?per_page=20')
            ->assertOk()->assertJsonPath('total', 25)->assertJsonPath('last_page', 2)->assertJsonCount(20, 'data');

        Sanctum::actingAs($this->admin());
        $this->getJson('/api/contacts')->assertOk()->assertJsonPath('total', 30);
    }

    public function test_registration_is_anti_enumeration(): void
    {
        $existing = $this->operator();
        $payload = ['name' => 'Novo Operador', 'email' => $existing->email, 'password' => 'Str0ng!Passw0rd', 'password_confirmation' => 'Str0ng!Passw0rd'];

        $this->postJson('/api/registration-requests', $payload)->assertStatus(202)->assertJsonStructure(['channel']);
        $this->assertDatabaseCount('registration_requests', 0);
    }

    public function test_admin_approves_request_and_user_is_created(): void
    {
        Event::fake([RegistrationReviewed::class]);

        $this->postJson('/api/registration-requests', [
            'name' => 'Novo Operador', 'email' => 'novo@example.com',
            'password' => 'Str0ng!Passw0rd', 'password_confirmation' => 'Str0ng!Passw0rd',
        ])->assertStatus(202);

        $rr = RegistrationRequest::firstOrFail();
        $this->assertNotSame('Str0ng!Passw0rd', $rr->password); // armazenado como hash

        Sanctum::actingAs($this->admin());
        $this->postJson("/api/admin/registration-requests/{$rr->id}/approve")->assertOk()->assertJson(['status' => 'approved']);

        $this->assertDatabaseHas('users', ['email' => 'novo@example.com', 'role' => 'operator']);
        Event::assertDispatched(RegistrationReviewed::class);

        // segunda análise da mesma solicitação é bloqueada
        $this->postJson("/api/admin/registration-requests/{$rr->id}/approve")->assertStatus(409);
    }

    public function test_weak_password_is_rejected_on_registration(): void
    {
        $this->postJson('/api/registration-requests', [
            'name' => 'Fulano', 'email' => 'f@example.com', 'password' => '12345678', 'password_confirmation' => '12345678',
        ])->assertStatus(422)->assertJsonValidationErrors('password');
    }

    public function test_operator_can_delete_own_contact_but_not_others(): void
    {
        Event::fake([ContactDeleted::class]);
        $op = $this->operator();
        $other = $this->operator();
        $mine = Contact::factory()->create(['created_by' => $op->id]);
        $theirs = Contact::factory()->create(['created_by' => $other->id]);

        Sanctum::actingAs($op);

        $this->deleteJson("/api/contacts/{$theirs->id}")->assertNotFound();
        $this->assertDatabaseHas('contacts', ['id' => $theirs->id]);

        $this->deleteJson("/api/contacts/{$mine->id}")->assertNoContent();
        $this->assertDatabaseMissing('contacts', ['id' => $mine->id]);
        Event::assertDispatched(ContactDeleted::class);
    }

    public function test_admin_can_delete_any_contact(): void
    {
        $contact = Contact::factory()->create(['created_by' => $this->operator()->id]);

        Sanctum::actingAs($this->admin());
        $this->deleteJson("/api/contacts/{$contact->id}")->assertNoContent();
        $this->assertDatabaseMissing('contacts', ['id' => $contact->id]);
    }

    public function test_guest_cannot_delete_contact(): void
    {
        $this->deleteJson('/api/contacts/1')->assertUnauthorized();
    }
}
