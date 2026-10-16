<?php

namespace App\Services;

use App\Models\ActivityLog;
use App\Models\User;

class ActivityLogger
{
    public static function log(string $action, string $description, ?User $user = null, array $meta = []): ActivityLog
    {
        return ActivityLog::create([
            'user_id' => $user?->id ?? auth()->id(),
            'action' => $action,
            'description' => $description,
            'meta' => $meta ?: null,
            'ip' => request()?->ip(),
        ]);
    }
}
