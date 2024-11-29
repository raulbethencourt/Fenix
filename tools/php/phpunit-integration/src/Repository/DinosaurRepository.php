<?php

namespace App\Repository;

use App\Entity\Dinosaur;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Dinosaur>
 *
 * @method Dinosaur|null find($id, $lockMode = null, $lockVersion = null)
 * @method Dinosaur|null findOneBy(array $criteria, array $orderBy = null)
 * @method Dinosaur[]    findAll()
 * @method Dinosaur[]    findBy(array $criteria, array $orderBy = null, $limit = null, $offset = null)
 */
class DinosaurRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Dinosaur::class);
    }

    public function save(Dinosaur $dinosaur, bool $flush = false): void
    {
        $this->getEntityManager()->persist($dinosaur);

        if ($flush) {
            $this->getEntityManager()->flush();
        }
    }
}
