<?php

namespace Database\Seeders;

use App\Models\Contact;
use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Credenciais vêm do .env (gerado pelo scripts/setup.sh) — nada hard-coded no código.
        $adminPassword = env('ADMIN_PASSWORD') ?: throw new \RuntimeException('Defina ADMIN_PASSWORD no .env');

        $admin = User::firstOrNew(['email' => env('ADMIN_EMAIL', 'admin@example.com')]);
        $admin->name = 'Administrador';
        $admin->password = $adminPassword;
        $admin->forceFill(['role' => User::ROLE_ADMIN, 'is_active' => true, 'email_verified_at' => now()])->save();

        $operator = User::firstOrNew(['email' => env('OPERATOR_EMAIL', 'operador@example.com')]);
        $operator->name = 'Operador Demo';
        $operator->password = env('OPERATOR_PASSWORD') ?: $adminPassword;
        $operator->forceFill(['role' => User::ROLE_OPERATOR, 'is_active' => true, 'email_verified_at' => now()])->save();

        // 40 contatos = 2 páginas com 20 itens por página
        if (Contact::count() === 0) {
            Contact::factory()->count(40)->create(['created_by' => $operator->id]);
        }
    }
}
