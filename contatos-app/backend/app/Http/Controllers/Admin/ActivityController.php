<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;

class ActivityController extends Controller
{
    public function index()
    {
        return ActivityLog::query()->with('user:id,name,role')->latest('id')->paginate(30);
    }
}
