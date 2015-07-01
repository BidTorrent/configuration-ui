<?php
require_once('vendor/redmap/main/src/schema.php');
require_once('vendor/redmap/main/src/drivers/mysqli.php');

class Bidders
{
    public $db;
    public $schema;

    static $FIELDS = array('name', 'bidUrl', 'rsaPubKey');

    function __construct()
    {
        $this->db = new RedMap\Drivers\MySQLiDriver('UTF8');
        $this->db->connect('bidtorrent', 'hack@thon', 'bidtorrent');
        $this->schema = new RedMap\Schema
        (
            'bidders',
            array
            (
                'id'    => array (RedMap\Schema::FIELD_PRIMARY),
                'name'  => null,
                'bidUrl' => null,
                'rsaPubKey' => null
            )
        );
    }

    function getAll()
    {
        list ($query, $params) = $this->schema->get();

        $rows = $this->db->get_rows($query, $params);

        return array_map(function($row) { return new Bidder($row); }, $rows);
    }

    function get($app, $id)
    {
        list ($query, $params) = $this->schema->get(array ('id' => $id));

        $row = $this->db->get_first($query, $params);

        if (!isset($row))
            $app->halt(404);

        return new Bidder($row);
    }

    function post($app)
    {
        $request = $app->request();
        $body = $request->getBody();
        $bidder = json_decode($body, true);

        $this->_validate($app, $bidder);

        list ($query, $params) = $this->schema->set(RedMap\Schema::SET_INSERT, $bidder);
        $result = $this->db->execute($query, $params);

        if (!isset($result) || $result == 0)
            $app->halt(409);
    }

    function put($app, $id)
    {
        $request = $app->request();
        $body = $request->getBody();
        $bidder = json_decode($body, true);
        $bidder['id'] = $id;

        list ($query, $params) = $this->schema->set(RedMap\Schema::SET_UPDATE, $bidder);
        $result = $this->db->execute($query, $params);

        if (!isset($result))
            $app->halt(500);

        if ($result == 0)
            $app->halt(404);
    }

    function delete($app, $id)
    {
        list ($query, $params) = $this->schema->delete(array ('id' => $id));

        $result = $this->db->execute($query, $params);

        if (!isset($result) || $result == 0)
            $app->halt(404);
    }

    private function _validate($app, $data)
    {
        $bidder = array();
        foreach (bidders::$FIELDS as $field) {
            if (!isset($data[$field]))
                $app->halt(400);
        }
    }
}

class Bidder
{
    public $id;
    public $name;
    public $bidUrl;
    public $rsaPubKey;

    function __construct($row)
    {
        $this->id = (int) $row['id'];
        $this->name = $row['name'];
        $this->bidUrl = $row['bidUrl'];
        $this->rsaPubKey = $row['rsaPubKey'];
    }
}

?>