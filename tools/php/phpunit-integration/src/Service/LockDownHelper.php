<?php

namespace App\Service;

use App\Entity\LockDown;
use App\Enum\LockDownStatus;
use App\Message\LockDownLiftedNotification;
use App\Repository\LockDownRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\Messenger\MessageBusInterface;
use Symfony\Component\Mime\Email;

class LockDownHelper
{
    public function __construct(
        private LockDownRepository $lockDownRepository,
        private EntityManagerInterface $entityManager,
        private GithubService $githubService,
        private MessageBusInterface $messageBus,
    )
    {
    }

    public function endCurrentLockDown(): void
    {
        $lockDown = $this->lockDownRepository->findMostRecent();
        if (!$lockDown) {
            throw new \LogicException('There is no lock down to end');
        }

        $lockDown->setStatus(LockDownStatus::ENDED);
        $this->entityManager->flush();

        $this->githubService->clearLockDownAlerts();
    }

    public function dinoEscaped(): void
    {
        $lockDown = new LockDown();
        $lockDown->setStatus(LockDownStatus::ACTIVE);
        $lockDown->setReason('Dino escaped... NOT good...');
        $this->entityManager->persist($lockDown);
        $this->entityManager->flush();
        $this->messageBus->dispatch(new LockDownLiftedNotification());
    }
}
