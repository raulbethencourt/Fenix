<?php

namespace App\Controller;

use App\Entity\Dinosaur;
use App\Service\GithubService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

class MainController extends AbstractController
{
    #[Route(path: '/', name: 'main_controller', methods: ['GET'])]
    public function index(GithubService $github): Response
    {
        $dinos = [
            new Dinosaur('Daisy', 'Velociraptor', 2, 'Paddock A'),
            new Dinosaur('Maverick','Pterodactyl', 7, 'Aviary 1'),
            new Dinosaur('Big Eaty', 'Tyrannosaurus', 15, 'Paddock C'),
            new Dinosaur('Dennis', 'Dilophosaurus', 6, 'Paddock B'),
            new Dinosaur('Bumpy', 'Triceratops', 10, 'Paddock B'),
        ];

        foreach ($dinos as $dino) {
            $dino->setHealth($github->getHealthReport($dino->getName()));
        }

        return $this->render('main/index.html.twig', [
            'dinos' => $dinos,
        ]);
    }
}
