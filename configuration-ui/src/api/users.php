<?php
require_once('vendor/redmap/main/src/schema.php');
require_once('vendor/redmap/main/src/drivers/mysqli.php');

class Users {
    public $db;
    public $userSchema;
    public $publisherSchema;
    public $bidderSchema;

    function __construct($db)
    {
        $this->db = $db;
        $this->userSchema = new RedMap\Schema
        (
            'users',
            array
            (
                'userId' => array (RedMap\Schema::FIELD_PRIMARY),
                'isAdmin' => null
            )
        );
        $this->publisherSchema = new RedMap\Schema
        (
            'publishers_users',
            array
            (
                'publisher' => array (RedMap\Schema::FIELD_PRIMARY),
                'user' => array (RedMap\Schema::FIELD_PRIMARY)
            )
        );
        $this->bidderSchema = new RedMap\Schema
        (
            'bidders_users',
            array
            (
                'bidder' => array (RedMap\Schema::FIELD_PRIMARY),
                'user' => array (RedMap\Schema::FIELD_PRIMARY)
            )
        );
    }

    function myPublishers($userId) {
        if ($userId === null)
            return array(false, array());

        if ($this->_isAdminUser($userId))
            return array(true, array());

        list ($query, $params) = $this->publisherSchema->get(array ('user' => $userId));
        $rows = $this->db->get_rows($query, $params);

        $publisherIds = array_map(function($row) { return (int) $row['publisher']; }, $rows);

        return array(false, $publisherIds);
    }

    function hasAccessOnPublisher($userId, $publisherId) {
        if ($userId === null)
            return false;

        if ($this->_isAdminUser($userId))
            return true;

        list ($query, $params) = $this->publisherSchema->get(array ('user' => $userId, 'publisher' => $publisherId));
        $result = $this->db->get_first($query, $params);

        if ($result === null)
            return false;

        return true;
    }

    function addUserForPublisher($userId, $publisherId) {
        list ($query, $params) = $this->publisherSchema->set(
            RedMap\Schema::SET_INSERT,
            array('user' => $userId, 'publisher' => $publisherId)
        );
        $result = $this->db->insert($query, $params);

        if ($result === null)
            return false;

        return true;
    }

    function removeUserForPublisher($userId, $publisherId) {
        list ($query, $params) = $this->publisherSchema->delete(array('user' => $userId, 'publisher' => $publisherId));
        $result = $this->db->execute($query, $params);

        if ($result === null)
            return false;

        return true;
    }

    function myBidders($userId) {
        if ($userId === null)
            return array(false, array());

        if ($this->_isAdminUser($userId))
            return array(true, array());

        list ($query, $params) = $this->bidderSchema->get(array ('user' => $userId));
        $rows = $this->db->get_rows($query, $params);

        $bidderIds = array_map(function($row) { return (int) $row['bidder']; }, $rows);
        return array(false, $bidderIds);
    }

    function hasAccessOnBidder($userId, $bidderId) {
        if ($userId === null)
            return false;

        if ($this->_isAdminUser($userId))
            return true;

        list ($query, $params) = $this->bidderSchema->get(array ('user' => $userId, 'bidder' => $bidderId));
        $result = $this->db->get_first($query, $params);

        if ($result === null)
            return false;

        return true;
    }

    function addUserForBidder($userId, $bidderId) {
        list ($query, $params) = $this->bidderSchema->set(
            RedMap\Schema::SET_INSERT,
            array('user' => $userId, 'bidder' => $bidderId)
        );
        $result = $this->db->insert($query, $params);

        if ($result === null)
            return false;

        return true;
    }

    function removeUserForBidder($userId, $bidderId) {
        list ($query, $params) = $this->bidderSchema->delete(array('user' => $userId, 'bidder' => $bidderId));
        $result = $this->db->execute($query, $params);

        if ($result === null)
            return false;

        return true;
    }

    private function _isAdminUser($userId) {
        list ($query, $params) = $this->userSchema->get(array ('userId' => $userId, 'isAdmin' => 1));
        $result = $this->db->get_first($query, $params);

        if ($result === null)
            return false;

        return true;
    }
}

?>