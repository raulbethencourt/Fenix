<?php

namespace App\Command;

use App\Service\LockDownHelper;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputArgument;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

#[AsCommand(
    name: 'app:lockdown:start',
    description: 'Add a short description for your command',
)]
class LockdownStartCommand extends Command
{
    public function __construct(private LockDownHelper $lockDownHelper)
    {
        parent::__construct();
    }

    protected function configure(): void
    {
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);

        $this->lockDownHelper->dinoEscaped();
        $io->caution('Lockdown started!!!!!!');

        return Command::SUCCESS;
    }
}
