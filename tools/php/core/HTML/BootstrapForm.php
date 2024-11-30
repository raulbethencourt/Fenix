<?php

namespace Core\HTML;

class BootstrapForm extends Form
{
    /**
     * Undocumented function
     *
     * @param [type] $index
     */
    protected function getValue($index)
    {
        $data = $this->data;
        if (is_object($data)) {
            return $data->$index;
        }
        return isset($this->data[$index]) ? $this->data[$index] : null;
    }


    /**
     * @param string $html code Html to surround
     */
    protected function surround($html): string
    {
        return '<div class="form-group">' . $html . '</div>';
    }

    /**
     * @param string $name
     * @param string $label
     * @param array $options
     */
    public function input(
        $name,
        $label,
        $options = []
    ): string {
        $type = isset($options['type']) ? $options['type'] : 'text';
        return $this->surround(
            '<label>' . $label . '</label><input type="' . $type . '" name="' . $name . '" value="' .
                $this->getValue($name) . '" class="form-control">'
        );
    }

    /**
     * @param string $name
     * @param string $label
     * @param int $rows
     * @param string $cols
     * @param string $form
     * @return string
     */
    public function textArea(
        $name,
        $label,
        $rows,
        $cols,
        $form
    ): string {
        return $this->surround(
            '<label>' . $label . '</label><textarea rows="' . $rows . '" cols="' . $cols . '" name="' . $name .
                '" form="' . $form . '" class="md-textarea form-control">' . $this->getValue($name) . '</textarea>'
        );
    }

    public function select(
        $name,
        $label,
        $options
    ) {
        $label = "<label>$label</label>";
        $input = '<select class="form-control" name="' . $name . '">';
        foreach ($options as $k => $v) {
            $attributes = '';
            if ($k == $this->getValue($name)) {
                $attributes = ' selected';
            }
            $input .= '<option value="' . $k . '"' . $attributes . '>' . $v . '</option>';
        }
        $input .= '</select>';

        return $this->surround($label . $input);
    }

    public function submit(): string
    {
        return $this->surround('<button type="submit" class="btn btn-primary">Envoyer</button>');
    }
}
