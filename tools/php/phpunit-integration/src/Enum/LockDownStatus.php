<?php

namespace App\Enum;

enum LockDownStatus: string
{
    case ACTIVE = 'active';
    case ENDED = 'ended';
    case RUN_FOR_YOUR_LIFE = 'run_for_your_life';
}
