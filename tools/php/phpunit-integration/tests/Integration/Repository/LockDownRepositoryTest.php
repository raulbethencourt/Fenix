<?php

namespace App\Tests\Integration\Repository;

use App\Entity\LockDown;
use App\Enum\LockDownStatus;
use App\Factory\LockDownFactory;
use App\Repository\LockDownRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;
use Zenstruck\Foundry\Test\Factories;
use Zenstruck\Foundry\Test\ResetDatabase;

class LockDownRepositoryTest extends KernelTestCase
{
    use ResetDatabase, Factories;

    public function testIsInLockDownReturnsFalseWithNoRows()
    {
        self::bootKernel();

        $this->assertFalse($this->getLockDownRepository()->isInLockDown());
    }

    public function testIsInLockDownReturnsTrueIfMostRecentLockDownIsActive()
    {
        self::bootKernel();

        LockDownFactory::createOne([
            'createdAt' => new \DateTimeImmutable('-1 day'),
            'status' => LockDownStatus::ACTIVE,
        ]);
        LockDownFactory::createMany(5, [
            'createdAt' => new \DateTimeImmutable('-2 day'),
            'status' => LockDownStatus::ENDED,
        ]);

        $this->assertTrue($this->getLockDownRepository()->isInLockDown());
    }

    public function testIsInLockDownReturnsFalseIfMostRecentIsNotActive()
    {
        self::bootKernel();

        LockDownFactory::createOne([
            'createdAt' => new \DateTimeImmutable('-1 day'),
            'status' => LockDownStatus::ENDED,
        ]);
        LockDownFactory::createMany(5, [
            'createdAt' => new \DateTimeImmutable('-2 days'),
            'status' => LockDownStatus::ACTIVE,
        ]);

        $this->assertFalse($this->getLockDownRepository()->isInLockDown());
    }

    private function getLockDownRepository(): LockDownRepository
    {
        return self::getContainer()->get(LockDownRepository::class);
    }
}
