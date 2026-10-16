<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Contact;
use App\Models\RegistrationRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function __invoke(): JsonResponse
    {
        $startOfToday = now()->startOfDay();

        $perDay = Contact::query()
            ->where('created_at', '>=', now()->subDays(13)->startOfDay())
            ->select(DB::raw('DATE(created_at) as day'), DB::raw('COUNT(*) as total'))
            ->groupBy('day')->pluck('total', 'day');

        $series = [];
        for ($i = 13; $i >= 0; $i--) {
            $day = now()->subDays($i)->toDateString();
            $series[] = ['day' => $day, 'total' => (int) ($perDay[$day] ?? 0)];
        }

        return response()->json([
            'totals' => [
                'contacts' => Contact::count(),
                'today' => Contact::where('created_at', '>=', $startOfToday)->count(),
                'last_7_days' => Contact::where('created_at', '>=', now()->subDays(6)->startOfDay())->count(),
                'operators' => User::where('role', User::ROLE_OPERATOR)->where('is_active', true)->count(),
                'pending_requests' => RegistrationRequest::where('status', RegistrationRequest::PENDING)->count(),
            ],
            'by_state' => Contact::select('state', DB::raw('COUNT(*) as total'))
                ->groupBy('state')->orderByDesc('total')->limit(10)->get(),
            'by_operator' => Contact::query()
                ->join('users', 'users.id', '=', 'contacts.created_by')
                ->select('users.name', DB::raw('COUNT(*) as total'))
                ->groupBy('users.id', 'users.name')->orderByDesc('total')->limit(10)->get(),
            'per_day' => $series,
        ]);
    }
}
