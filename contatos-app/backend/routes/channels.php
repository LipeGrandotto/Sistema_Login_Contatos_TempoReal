<?php

use App\Models\User;
use Illuminate\Support\Facades\Broadcast;

// Canal privado: somente administradores ativos podem assinar.
Broadcast::channel('admin', fn (User $user) => $user->is_active && $user->isAdmin());

// Obs.: o canal "registration.{channel}" é público de propósito (o solicitante ainda
// não tem conta). O nome contém 48 caracteres aleatórios (capability) e o payload só
// leva o status da análise — nunca credenciais. Ver docs/ARQUITETURA.md.
