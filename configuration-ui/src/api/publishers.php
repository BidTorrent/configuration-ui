<?php
require_once('vendor/redmap/main/src/schema.php');
require_once('vendor/redmap/main/src/drivers/mysqli.php');

class Publishers
{
    public $db;
    public $publisherSchema;
    public $filterSchema;

    static $FIELDS = array('name', 'currency', 'type');

    function __construct()
    {
        $this->db = new RedMap\Drivers\MySQLiDriver('UTF8');
        $this->db->connect('bidtorrent', 'hack@thon', 'bidtorrent');
        $this->publisherSchema = new RedMap\Schema
        (
            'publishers',
            array
            (
                'id'    => array (RedMap\Schema::FIELD_PRIMARY),
                'name'  => null,
                'type'  => null,
                'currency'  => null,
                'country'  => null,
                'timeout'  => null,
                'secured'  => null
            )
        );
        $this->filterSchema = new RedMap\Schema
        (
            'publishers_filters',
            array
            (
                'type'    => array (RedMap\Schema::FIELD_PRIMARY),
                'publisher'  => array (RedMap\Schema::FIELD_PRIMARY),
                'mode'  => null,
                'value'  => null
            )
        );
    }

    function getAll()
    {
        // Get filters
        list ($filtersQuery, $filtersParams) = $this->filterSchema->get();
        $filterRows = $this->db->get_rows($filtersQuery, $filtersParams);

        $filters = array_map(function($row) { return new PublisherFilter($row); }, $filterRows);
        $publishersFilters = array();
        foreach ($filters as $filter)
        {
            $publisherFilters = array();
            if (isset($publishersFilters[$filter->publisher]))
                $publisherFilters = $publishersFilters[$filter->publisher];

            array_push($publisherFilters, $filter);
            $publishersFilters[$filter->publisher] = $publisherFilters;
        }

        // Get publishers
        list ($query, $params) = $this->publisherSchema->get();
        $rows = $this->db->get_rows($query, $params);

        return array_map(function($row) use ($publishersFilters)
        {
            $filters = array();
            $pubId = (int)$row['id'];

            if (isset($publishersFilters[$pubId]))
                $filters = $publishersFilters[$pubId];

            return new Publisher($row, $filters);
        }, $rows);
    }

    function get($app, $id)
    {
        // Get filters
        list ($filtersQuery, $filtersParams) = $this->filterSchema->get(array ('publisher' => $id));
        $filterRows = $this->db->get_rows($filtersQuery, $filtersParams);
        $filters = array_map(function($row) { return new PublisherFilter($row); }, $filterRows);

        // Get publisher
        list ($query, $params) = $this->publisherSchema->get(array ('id' => $id));
        $row = $this->db->get_first($query, $params);

        if (!isset($row))
            $app->halt(404);

        return new Publisher($row, $filters);
    }

    function post($app)
    {
        $request = $app->request();
        $body = $request->getBody();
        $publisherWithFilters = json_decode($body, true);

        // Split publisher & its filters
        $filters = $publisherWithFilters['filters'];
        unset($publisherWithFilters['filters']);
        $publisher = $publisherWithFilters;

        $this->_validate($app, $publisher);

        // Add publisher
        list ($query, $params) = $this->publisherSchema->set(RedMap\Schema::SET_INSERT, $publisher);
        $insertedPubId = $this->db->insert($query, $params);

        if (!isset($insertedPubId))
            $app->halt(409);

        // Add filters
        foreach ($filters as $filter) {
            $filter['publisher'] = $insertedPubId;
            list ($query, $params) = $this->filterSchema->set(RedMap\Schema::SET_INSERT, $filter);
            $result = $this->db->insert($query, $params);

            if (!isset($result))
                $app->halt(409);
        }
    }

    function put($app, $id)
    {
        $request = $app->request();
        $body = $request->getBody();
        $publisherWithFilters = json_decode($body, true);
        $publisherWithFilters['id'] = $id;

        // Split publisher & its filters
        $filters = $publisherWithFilters['filters'];
        unset($publisherWithFilters['filters']);
        $publisher = $publisherWithFilters;

        // Update publisher
        list ($query, $params) = $this->publisherSchema->set(RedMap\Schema::SET_UPDATE, $publisher);
        $result = $this->db->execute($query, $params);

        // Delete publisher's filters
        list ($query, $params) = $this->filterSchema->delete(array ('publisher' => $id));
        $this->db->execute($query, $params);

        // Add new filters
        foreach ($filters as $filter) {
            $filter['publisher'] = $id;
            list ($query, $params) = $this->filterSchema->set(RedMap\Schema::SET_INSERT, $filter);
            $result = $this->db->execute($query, $params);
        }

        if (!isset($result))
            $app->halt(500);

        if ($result == 0)
            $app->halt(404);
    }

    function delete($app, $id)
    {
        // Delete publisher's filters
        list ($query, $params) = $this->filterSchema->delete(array ('publisher' => $id));
        $this->db->execute($query, $params);

        // Delete publisher
        list ($query, $params) = $this->publisherSchema->delete(array ('id' => $id));
        $result = $this->db->execute($query, $params);

        if (!isset($result) || $result == 0)
            $app->halt(404);
    }

    private function _validate($app, $data)
    {
        $publisher = array();
        foreach (publishers::$FIELDS as $field) {
            if (!isset($data[$field]))
                $app->halt(400);
        }
    }
}

class Publisher
{
    public $id;
    public $name;
    public $type;
    public $currency;
    public $country;
    public $timeout;
    public $secured;
    public $filters;

    function __construct($row, $filters)
    {
        $this->id = (int) $row['id'];
        $this->name = $row['name'];
        $this->type = $row['type'];
        $this->currency = $row['currency'];
        $this->country = $row['country'];
        $this->timeout = isset($row['timeout']) ? (int) $row['timeout'] : 400;
        $this->secured = isset($row['secured']) ? (bool) $row['secured'] : false;
        $this->filters = $filters;
    }
}

class PublisherFilter
{
    public $type;
    public $publisher;
    public $mode;
    public $value;

    function __construct($row)
    {
        $this->type = $row['type'];
        $this->publisher = (int) $row['publisher'];
        $this->mode = $row['mode'];
        $this->value = explode(";", $row['value']);
    }
}

?>