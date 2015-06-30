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

        return $this->db->get_rows($query, $params);
    }

    function get($id)
    {
        list ($query, $params) = $this->schema->get(array ('id' => $id));

        return $this->db->get_first($query, $params);
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

?>