<?php

namespace App\Entity;

use App\Enum\HealthStatus;
use App\Repository\DinosaurRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: DinosaurRepository::class)]
class Dinosaur
{
    #[ORM\Id, ORM\GeneratedValue, ORM\Column]
    private ?int $id = null;

    #[ORM\Column]
    private string $name;

    #[ORM\Column]
    private string $genus;

    #[ORM\Column]
    private int $length;

    #[ORM\Column]
    private string $enclosure;

    #[ORM\Column]
    private HealthStatus $health = HealthStatus::HEALTHY;

    public function __construct(string $name, string $genus = 'Unknown', int $length = 0, string $enclosure = 'Unknown')
    {
        $this->name = $name;
        $this->genus = $genus;
        $this->length = $length;
        $this->enclosure = $enclosure;
    }

    public function getId(): int
    {
        return $this->id;
    }

    public function getName(): string
    {
        return $this->name;
    }

    public function getGenus(): string
    {
        return $this->genus;
    }

    public function getLength(): int
    {
        return $this->length;
    }

    public function getEnclosure(): string
    {
        return $this->enclosure;
    }

    public function getSizeDescription(): string
    {
        if ($this->length >= 10) {
            return 'Large';
        }

        if ($this->length >= 5) {
            return 'Medium';
        }

        return 'Small';
    }

    public function isAcceptingVisitors(): bool
    {
        return $this->health !== HealthStatus::SICK;
    }

    public function setHealth(HealthStatus $health): void
    {
        $this->health = $health;
    }
}
