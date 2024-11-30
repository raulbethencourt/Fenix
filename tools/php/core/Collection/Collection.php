<?php

namespace Core\Collection;

use Iterator;
use ArrayAccess;
use ArrayIterator;
use IteratorAggregate;

class Collection implements IteratorAggregate, ArrayAccess
{
    private $data;

    public function __construct(array $data)
    {
        $this->data = $data;
    }

    /**
     * Get a data by key
     *
     * @param mixed $key The key data to retrieve
     */
    public function __get($key)
    {
        $index = explode('.', $key);
        return $this->getValue($index, $this->data);
    }

    /**
     * Iterative loop to get specific value
     *
     * @param array $indexes
     * @param mixed $value
     */
    private function getValue(array $indexes, $value)
    {
        $key = array_shift($indexes);

        if(empty($indexes)){
            if (!array_key_exists($key, $value)) {
                return null;
            }
            
            if(is_array($value[$key])){
                return new Collection($value[$key]);
            }
            return $value[$key];
        }
        return $this->getValue($indexes, $value[$key]);
    }

    /**
     * Assigns a value to the specified data
     *
     * @param mixed $key The data key to assign the value to
     * @param mixed $value The value to set
     */
    public function __set($key, $value)
    {
        $this->data[$key] = $value;
    }

    /**
     * Whether a key exist
     *
     * @param mixed $key An data key to check for
     */
    public function __has($key)
    {
        return array_key_exists($key, $this->data);
    }

    /**
     * To get specified key and value from complex array
     *
     * @param mixed $key
     * @param mixed $value
     */
    public function __list($key, $value): Collection
    {
        $results = [];
        foreach ($this->data as $data) {
            $results[$data[$key]] = $data[$value];
        }
        return new Collection($results);
    }

    /**
     * To get specific key from array;
     *
     * @param mixed $key
     */
    public function __extract($key): Collection
    {
        $results = [];
        foreach ($this->data as $data) {
            $results[] = $data[$key];
        }
        return new Collection($results);
    }

    /**
     * Creates join for array
     *
     * @param string $glue
     */
    public function __join($glue): string
    {
        return implode($glue, $this->data);
    }

    /**
     * Give maximal result from array
     *
     * @param mixed $key
     */
    public function __max($key = false)
    {
        if ($key) {
            return $this->__extract($key)->__max();
        }
        return max($this->data);
    }

    /**
     * Whether or not an data exists by key
     *
     * @param mixed $key An data key to check for
     * @abstracting ArrayAccess
     */
    public function __isset($key): bool
    {
        return isset($this->data[$key]);
    }

    /**
     * Unset an data by key
     *
     * @param mixed $key The key to unset
     */
    public function __unset($key)
    {
        unset($this->data[$key]);
    }

    /**
     * Assigns a value to the specified offset
     *
     * @param mixed $offset The offset to assign the value to
     * @param mixed $value The value to set
     * @abstracting ArrayAccess
     */
    public function offsetSet($offset, $value)
    {
        if (is_null($offset)) {
            $this->data[] = $value;
        } else {
            $this->data[$offset] = $value;
        }
    }

    /**
     * Whether or not an offset exists
     *
     * @param mixed $offset An offset to check for
     * @abstracting ArrayAccess
     */
    public function offsetExists($offset): bool
    {
        return isset($this->data[$offset]);
    }

    /**
     * Unset an offset
     *
     * @param mixed $offset The offset to unset
     * @abstracting ArrayAccess
     */
    public function offsetUnset($offset)
    {
        if ($this->offsetExists($offset)) {
            unset($this->data[$offset]);
        }
    }

    /**
     * Returns the value at specified offset
     *
     * @param mixed $offset The offset to retrieve
     * @return mixed
     * @abstracting ArrayAccess
     */
    public function offsetGet($offset)
    {
        return $this->offsetExists($offset) ? $this->data[$offset] : null;
    }

    /**
     * Retrieve an external iterator
     */
    public function getIterator(): Iterator
    {
        return new ArrayIterator($this->data);
    }
}
