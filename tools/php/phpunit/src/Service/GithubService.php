<?php

namespace App\Service;

use App\Enum\HealthStatus;
use Psr\Log\LoggerInterface;
use Symfony\Contracts\HttpClient\HttpClientInterface;

class GithubService
{
    public function __construct(private HttpClientInterface $httpClient, private LoggerInterface $logger)
    {
    }

    public function getHealthReport(string $dinosaurName): HealthStatus
    {
        $health = HealthStatus::HEALTHY;

        $response = $this->httpClient->request(
            method: 'GET',
            url: 'https://api.github.com/repos/SymfonyCasts/dino-park/issues'
        );

        $this->logger->info('Request Dino Issues', [
            'dino' => $dinosaurName,
            'responseStatus' => $response->getStatusCode(),
        ]);

        foreach ($response->toArray() as $issue) {
            if (str_contains($issue['title'], $dinosaurName)) {
                $health = $this->getDinoStatusFromLabels($issue['labels']);
            }
        }

        return $health;
    }

    private function getDinoStatusFromLabels(array $labels): HealthStatus
    {
        $health = null;

        foreach ($labels as $label) {
            $label = $label['name'];

            // We only care about "Status" labels
            if (!str_starts_with($label, 'Status:')) {
                continue;
            }

            // Remove the "Status:" and whitespace from the label
            $status = trim(substr($label, strlen('Status:')));

            $health = HealthStatus::tryFrom($status);

            // Determine if we know about the label - throw an exception if we don't
            if (null === $health) {
                throw new \RuntimeException(sprintf('%s is an unknown status label!', $label));
            }
        }

        return $health ?? HealthStatus::HEALTHY;
    }
}
