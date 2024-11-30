<?php

namespace App\Repository;

use App\Entity\LockDown;
use App\Enum\LockDownStatus;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<LockDown>
 *
 * @method LockDown|null find($id, $lockMode = null, $lockVersion = null)
 * @method LockDown|null findOneBy(array $criteria, array $orderBy = null)
 * @method LockDown[]    findAll()
 * @method LockDown[]    findBy(array $criteria, array $orderBy = null, $limit = null, $offset = null)
 */
class LockDownRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, LockDown::class);
    }

    public function findMostRecent(): ?LockDown
    {
        return $this->createQueryBuilder('lock_down')
            ->orderBy('lock_down.createdAt', 'DESC')
            ->setMaxResults(1)
            ->getQuery()
            ->getOneOrNullResult();
    }

    public function isInLockDown(): bool
    {
        $lockDown = $this->findMostRecent();

        if (!$lockDown) {
            return false;
        }

        return $lockDown->getStatus() !== LockDownStatus::ENDED;
    }
}
