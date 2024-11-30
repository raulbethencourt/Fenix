<?php

namespace Core\Database;

use PDO;

class Database
{
    private $db_name;
    private $db_user;
    private $db_pass;
    private $db_host;
    private $pdo;

    public function __construct(
        $db_name,
        $db_user,
        $db_pass,
        $db_host
    ) {
        $this->db_name = $db_name;
        $this->db_user = $db_user;
        $this->db_pass = $db_pass;
        $this->db_host = $db_host;
    }

    private function getPDO(): PDO
    {
        if ($this->pdo === null) {
            $pdo = new PDO('mysql:dbname=' . $this->db_name . ';host=' . $this->db_host, $this->db_user, $this->db_pass);
            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $this->pdo = $pdo;
        }

        return $this->pdo;
    }

    /**
     * @param $statement
     * @param $class_name
     * @param  false  $one
     * @return array|mixed
     */
    public function query(
        $statement,
        $class_name = null,
        $one = false
    ) {
        $q = $this->getPDO()->query($statement);

        if (
            strpos($statement, 'UPDATE') === 0 ||
            strpos($statement, 'INSERT') === 0 ||
            strpos($statement, 'DELETE') === 0
        ) {
            return $q;
        }

        if (is_null($class_name)) {
            $q->setFetchMode(PDO::FETCH_OBJ);
        } else {
            $q->setFetchMode(PDO::FETCH_CLASS, $class_name);
        }

        if ($one) {
            $data = $q->fetch();
        } else {
            $data = $q->fetchAll();
        }

        return $data;
    }

    /**
     * @param $statement
     * @param $attributes
     * @param $class_name
     * @param  false  $one
     * @return array|mixed
     */
    public function prepare(
        $statement,
        $attributes,
        $class_name = null,
        $one = false
    ) {
        $q = $this->getPDO()->prepare($statement);
        $res = $q->execute($attributes);

        if (
            strpos($statement, 'UPDATE') === 0 ||
            strpos($statement, 'INSERT') === 0 ||
            strpos($statement, 'DELETE') === 0
        ) {
            return $res;
        }

        if (is_null($class_name)) {
            $q->setFetchMode(PDO::FETCH_OBJ);
        } else {
            $q->setFetchMode(PDO::FETCH_CLASS, $class_name);
        }

        if ($one) {
            $data = $q->fetch();
        } else {
            $data = $q->fetchAll();
        }

        return $data;
    }

    public function lasInsertId()
    {
        return $this->getPDO()->lastInsertId();
    }
}
