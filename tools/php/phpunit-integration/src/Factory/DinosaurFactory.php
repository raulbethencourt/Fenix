<?php

namespace App\Factory;

use App\Entity\Dinosaur;
use App\Enum\HealthStatus;
use App\Repository\DinosaurRepository;
use Zenstruck\Foundry\ModelFactory;
use Zenstruck\Foundry\Proxy;
use Zenstruck\Foundry\RepositoryProxy;

/**
 * @extends ModelFactory<Dinosaur>
 *
 * @method        Dinosaur|Proxy                     create(array|callable $attributes = [])
 * @method static Dinosaur|Proxy                     createOne(array $attributes = [])
 * @method static Dinosaur|Proxy                     find(object|array|mixed $criteria)
 * @method static Dinosaur|Proxy                     findOrCreate(array $attributes)
 * @method static Dinosaur|Proxy                     first(string $sortedField = 'id')
 * @method static Dinosaur|Proxy                     last(string $sortedField = 'id')
 * @method static Dinosaur|Proxy                     random(array $attributes = [])
 * @method static Dinosaur|Proxy                     randomOrCreate(array $attributes = [])
 * @method static DinosaurRepository|RepositoryProxy repository()
 * @method static Dinosaur[]|Proxy[]                 all()
 * @method static Dinosaur[]|Proxy[]                 createMany(int $number, array|callable $attributes = [])
 * @method static Dinosaur[]|Proxy[]                 createSequence(iterable|callable $sequence)
 * @method static Dinosaur[]|Proxy[]                 findBy(array $attributes)
 * @method static Dinosaur[]|Proxy[]                 randomRange(int $min, int $max, array $attributes = [])
 * @method static Dinosaur[]|Proxy[]                 randomSet(int $number, array $attributes = [])
 */
final class DinosaurFactory extends ModelFactory
{
    /**
     * @see https://symfony.com/bundles/ZenstruckFoundryBundle/current/index.html#factories-as-services
     *
     * @todo inject services if required
     */
    public function __construct()
    {
        parent::__construct();
    }

    /**
     * @see https://symfony.com/bundles/ZenstruckFoundryBundle/current/index.html#model-factories
     *
     * @todo add your default values here
     */
    protected function getDefaults(): array
    {
        return [
            'enclosure' => self::faker()->text(),
            'genus' => self::faker()->text(),
            'health' => self::faker()->randomElement(HealthStatus::cases()),
            'length' => self::faker()->randomNumber(),
            'name' => self::faker()->text(),
        ];
    }

    /**
     * @see https://symfony.com/bundles/ZenstruckFoundryBundle/current/index.html#initialization
     */
    protected function initialize(): self
    {
        return $this
            // ->afterInstantiate(function(Dinosaur $dinosaur): void {})
        ;
    }

    protected static function getClass(): string
    {
        return Dinosaur::class;
    }
}
