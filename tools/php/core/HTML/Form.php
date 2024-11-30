<?php

namespace Core\HTML;

/**
 * Class Form
 * Allows generates entry form fast and easy 
 */
class Form
{
    /**
     * @var array data used by form
     */
    protected $data;

    /**
     * @var string Tag use to surround fields 
     */
    public $surround = 'p';

    /**
     * @param array $data data used by form
     */
    public function __construct($data = [])
    {
        $this->data = $data;
    }

    /**
     * @param string $html code Html to surround
     */
    protected function surround($html): string
    {
        return "<{$this->surround}>{$html}</{$this->surround}>";
    }

    /**
     * @param [string] $index index of value to recover
     * @return string
     */
    protected function getValue($index)
    {
        if (is_object($this->data)) {
            return $this->data->$index;
        }
        return isset($this->data[$index]) ? $this->data[$index] : null;
    }
    /**
     * @param string $name
     * @param string $label
     * @param array $options
     */
    public function input($name, $label, $options = []): string
    {
        $type = isset($options['type']) ? $options['type'] : 'text';
        return $this->surround(
            '<input type="' . $type . '" name="' . $name . 
            '" value="' . $this->getValue($name) . '">'
        );
    }

    public function textArea($name, $label, $rows, $cols, $form): string
    {
        return $this->surround(
            '<textarea rows="' . $rows . '" cols="' . $cols . 'name="' . $name . 
            ' form="' . $form . '">Nouvelle contenu...</textarea>'
        );
    }

    public function submit(): string
    {
        return $this->surround('<button type="submit">Envoyer</button>');
    }
}
