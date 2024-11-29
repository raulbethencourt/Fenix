<?php

namespace App\Enum;

enum HealthStatus: string
{
    case HEALTHY = 'Healthy';
    case SICK = 'Sick';
    case HUNGRY = 'Hungry';
}
