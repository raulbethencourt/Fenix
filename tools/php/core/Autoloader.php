<?php

namespace Core;

/**
 * class Autoloader
 * Allows to load every single class to the index
 */
class Autoloader
{
    /**
     * autoload() than the file index
     */
    public static function register()
    {
        spl_autoload_register([__CLASS__, 'autoload']);
    }

    /**
     * @param [string] $class_name Allows to generates each require of each class
     * @return string
     */
    public static function autoload($class)
    {
        if (strpos($class, __NAMESPACE__ . '\\') === 0) {
            $class = str_replace(array(__NAMESPACE__ . '\\', '\\'), array('', '/'), $class);
            require __DIR__ . '/' . $class . '.php';
        }
    }
}
