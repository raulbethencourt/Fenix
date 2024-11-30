<?php

namespace App\Entity;

use App\Enum\LockDownStatus;
use App\Repository\LockDownRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: LockDownRepository::class)]
class LockDown
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column]
    private ?\DateTimeImmutable $createdAt = null;

    #[ORM\Column(nullable: true)]
    private ?\DateTimeImmutable $endedAt = null;

    #[ORM\Column(type: Types::STRING, enumType: LockDownStatus::class)]
    private ?LockDownStatus $status = LockDownStatus::ACTIVE;

    #[ORM\Column(type: Types::TEXT)]
    private ?string $reason = null;

    public function __construct()
    {
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getCreatedAt(): ?\DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function setCreatedAt(\DateTimeImmutable $createdAt): static
    {
        $this->createdAt = $createdAt;

        return $this;
    }

    public function getEndedAt(): ?\DateTimeImmutable
    {
        return $this->endedAt;
    }

    public function getStatus(): LockDownStatus
    {
        return $this->status;
    }

    public function setStatus(LockDownStatus $status): static
    {
        $this->status = $status;
        if ($status === LockDownStatus::ENDED) {
            $this->endedAt = new \DateTimeImmutable();
        } else {
            $this->endedAt = null;
        }

        return $this;
    }

    public function getReason(): ?string
    {
        return $this->reason;
    }

    public function setReason(string $reason): static
    {
        $this->reason = $reason;

        return $this;
    }
}
