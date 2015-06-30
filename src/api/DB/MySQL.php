<?php

use Luracast\Restler\RestException;

class DB_MySQL
{
    private $db;

    function __construct()
    {
        try {
            $options = array(PDO::MYSQL_ATTR_INIT_COMMAND => 'SET NAMES utf8');

            $this->db = new PDO(
                'mysql:host=localhost;dbname=bidtorrent',
                'bidtorrent',
                'hack@thon',
                $options
            );
            $this->db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

            //If you are using older version of PHP and having issues with Unicode
            //uncomment the following line
            //$this->db->exec("SET NAMES utf8");

        } catch (PDOException $e) {
            throw new RestException(501, 'MySQL: ' . $e->getMessage());
        }
    }

    function getBidder($id)
    {
        $this->db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        try {
            $sql = $this->db->prepare('SELECT * FROM bidders WHERE id = :id');
            $sql->execute(array(':id' => $id));
            return $this->id2int($sql->fetch());
        } catch (PDOException $e) {
            throw new RestException(501, 'MySQL: ' . $e->getMessage());
        }
    }

    function getAllBidders()
    {
        $this->db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        try {
            $stmt = $this->db->query('SELECT * FROM bidders');
            return $this->id2int($stmt->fetchAll());
        } catch (PDOException $e) {
            throw new RestException(501, 'MySQL: ' . $e->getMessage());
        }
    }

    function insertBidder($rec)
    {
        $sql = $this->db->prepare("INSERT INTO bidders (name, bidUrl) VALUES (:name, :bidUrl)");
        if (!$sql->execute(array(':name' => $rec['name'], ':bidUrl' => $rec['bidUrl'])))
            return FALSE;
        return $this->getBidder($this->db->lastInsertId());
    }

    function updateBidder($id, $updated)
    {
        $current = $this->getBidder($id);

        if (!$current)
            return FALSE;

        $sql = $this->db->prepare("UPDATE bidders SET name = :name, bidUrl = :bidUrl WHERE id = :id");
        if (!$sql->execute(array(
            ':id' => $id,
            ':name' => isset($updated['name']) ? $updated['name'] : $current['name'],
            ':bidUrl' => isset($updated['bidUrl']) ? $updated['bidUrl'] : $current['bidUrl'])))
        {
            return FALSE;
        }

        return $this->getBidder($id);
    }

    function deleteBidder($id)
    {
        $r = $this->getBidder($id);
        if (!$r || !$this->db->prepare('DELETE FROM bidders WHERE id = ?')->execute(array($id)))
            return FALSE;
        return $r;
    }

    private function id2int($r)
    {
        if (is_array($r)) {
            if (isset($r['id'])) {
                $r['id'] = intval($r['id']);
            } else {
                foreach ($r as &$r0) {
                    $r0['id'] = intval($r0['id']);
                }
            }
        }
        return $r;
    }
}

