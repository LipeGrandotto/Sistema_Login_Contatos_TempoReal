<?php

namespace Database\Factories;

use App\Http\Requests\StoreContactRequest;
use Illuminate\Database\Eloquent\Factories\Factory;

class ContactFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'phone' => fake()->numerify('(##) 9####-####'),
            'company' => fake()->optional(0.7)->company(),
            'city' => fake()->city(),
            'state' => fake()->randomElement(['SP', 'RJ', 'MG', 'GO', 'DF', 'BA', 'PR', 'RS']),
            'notes' => fake()->optional(0.3)->sentence(),
            'created_at' => fake()->dateTimeBetween('-13 days', 'now'),
        ];
    }
}
