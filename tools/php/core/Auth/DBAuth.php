<?php

namespace Core\Auth;

use Core\Database\Database;

class DBAuth
{
    /**
     * @var Database
     */
    private Database $db;

    public function __construct(Database $db)
    {
        $this->db = $db;
    }

    public function getUserId()
    {
        if ($this->logged()) {
            return $_SESSION['auth'];
        }
        return false;
    }

    /**
     * @param $username
     * @param $password
     * @return bool
     */
    public function login($username, $password)
    {
        $user = $this->db->prepare(
            'SELECT *
                FROM users u 
                WHERE u.username = ? ',
            [$username],
            null,
            true
        );

        if ($user) {
            if ($user->password === sha1($password)) {
                $_SESSION['auth'] = $user->id;
                return true;
            }
        } 
        return false;
    }

    public function logged()
    {
        return isset($_SESSION['auth']);
    }
}
