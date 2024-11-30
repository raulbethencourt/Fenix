<?php

namespace App\Controller;

use App\Entity\Dinosaur;
use App\Repository\DinosaurRepository;
use App\Repository\LockDownRepository;
use App\Service\GithubService;
use App\Service\LockDownHelper;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

class MainController extends AbstractController
{
    #[Route(path: '/', name: 'app_homepage', methods: ['GET'])]
    public function index(GithubService $github, DinosaurRepository $repository, LockDownRepository $lockDownRepository): Response
    {
        $dinos = $repository->findAll();

        foreach ($dinos as $dino) {
            $dino->setHealth($github->getHealthReport($dino->getName()));
        }

        return $this->render('main/index.html.twig', [
            'dinos' => $dinos,
            'isLockedDown' => $lockDownRepository->isInLockDown(),
        ]);
    }

    #[Route('/lockdown/end', name: 'app_lockdown_end', methods: ['POST'])]
    public function endLockDown(Request $request, LockDownHelper $lockDownHelper)
    {
        if (!$this->isCsrfTokenValid('end-lockdown', $request->request->get('_token'))) {
            throw $this->createAccessDeniedException('Invalid CSRF token');
        }

        $lockDownHelper->endCurrentLockDown();

        return $this->redirectToRoute('app_homepage');
    }
}
