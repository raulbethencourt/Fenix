<?php

namespace Core\Table;


use Core\Database\Database;

class Table
{
    protected string $table;
    protected DataBase $db;

    public function __construct(DataBase $db)
    {
        if (is_null($this->table)) {
            $parts = explode('\\', get_class($this));
            $class_name = end($parts);
            $this->table = strtolower(str_replace('Table', '', $class_name) . 's');
        }
        $this->db = $db;
    }

    public function all()
    {
        return $this->query('SELECT * FROM ' . $this->table);
    }

    protected function query(
        string $statement,
        array $attributes = null,
        bool $one = false
    ) {
        if ($attributes) {
            return $this->db->prepare(
                $statement,
                $attributes,
                str_replace('Table', 'Entity', get_class($this)),
                $one
            );
        } else {
            return $this->db->query(
                $statement,
                str_replace('Table', 'Entity', get_class($this)),
                $one
            );
        }
    }

    public function find(int $id)
    {
        return $this->query(
            "SELECT *
            FROM {$this->table} 
            WHERE id = ?",
            [$id],
            true
        );
    }

    public function update(int $id, array $fields)
    {
        $sql_parts = [];
        $attributes = [];

        foreach ($fields as $k => $v) {
            $sql_parts[] = "$k = ?";
            $attributes[] = $v;
        }
        $attributes[] = (int)$id;
        $sql_part = implode(', ', $sql_parts);

        return $this->query(
            "UPDATE {$this->table}
            SET $sql_part
            WHERE id=?",
            $attributes,
            true
        );
    }

    public function create(array $fields)
    {
        $sql_parts = [];
        $attributes = [];

        foreach ($fields as $k => $v) {
            $sql_parts[] = "$k = ?";
            $attributes[] = $v;
        }
        $sql_part = implode(', ', $sql_parts);

        return $this->query(
            "INSERT INTO {$this->table}
            SET $sql_part",
            $attributes,
            true
        );
    }

    public function delete(int $id)
    {
        return $this->query(
            "DELETE FROM {$this->table}
            WHERE id = ?",
            [$id],
            true
        );
    }

    public function extract($key, $value)
    {
        $records = $this->all();
        $return = [];
        foreach ($records as $v) {
            $return[$v->$key] = $v->$value;
        }
        return $return;
    }
}
