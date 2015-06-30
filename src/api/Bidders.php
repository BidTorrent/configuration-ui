<?php

use Luracast\Restler\RestException;

class Bidders
{
    public $db;

    static $FIELDS = array('name', 'bidUrl');

    function __construct()
    {
        $this->db = new DB_MySQL();
    }

    function index()
    {
        return $this->db->getAllBidders();
    }

    function get($id)
    {
        $result = $this->db->getBidder($id);

        if (!$result)
            throw new RestException(404);

        return $result;
    }

    function post($request_data = NULL)
    {
        $this->db->insertBidder($this->_validate($request_data));
    }

    function put($id, $request_data = NULL)
    {
        $this->db->updateBidder($id, $request_data);
    }

    function delete($id)
    {
        $this->db->deleteBidder($id);
    }

    private function _validate($data)
    {
        $bidder = array();
        foreach (bidders::$FIELDS as $field) {
            if (!isset($data[$field]))
                throw new RestException(400, "$field field missing");
            $bidder[$field] = $data[$field];
        }
        return $bidder;
    }
}

