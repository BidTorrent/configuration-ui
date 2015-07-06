<?php
require_once('vendor/redmap/main/src/schema.php');
require_once('vendor/redmap/main/src/drivers/mysqli.php');

class Bidders
{
    public $db;
    public $bidderSchema;
    public $filterSchema;

    static $BIDDER_FIELDS = array('name', 'bidUrl', 'rsaPubKey');
    static $FILTER_FIELDS = array('bidder', 'type');

    function __construct($db)
    {
        $this->db = $db;
        $this->bidderSchema = new RedMap\Schema
        (
            'bidders',
            array
            (
                'id'    => array (RedMap\Schema::FIELD_PRIMARY),
                'name'  => null,
                'bidUrl' => null,
                'rsaPubKey' => null,
                'sampling' => null
            )
        );
        $this->filterSchema = new RedMap\Schema
        (
            'bidders_filters',
            array
            (
                'type'    => array (RedMap\Schema::FIELD_PRIMARY),
                'bidder'  => array (RedMap\Schema::FIELD_PRIMARY),
                'mode'  => null,
                'value'  => null
            )
        );
    }

    function getAll($app)
    {
        // Get filters
        list ($filtersQuery, $filtersParams) = $this->filterSchema->get();
        $filterRows = $this->db->get_rows($filtersQuery, $filtersParams);

        $filters = array_map(function($row) { return new BidderFilter($row); }, $filterRows);
        $biddersFilters = array();
        foreach ($filters as $filter)
        {
            $bidderFilters = array();
            if (isset($biddersFilters[$filter->bidder]))
                $bidderFilters = $biddersFilters[$filter->bidder];

            array_push($bidderFilters, $filter);
            $biddersFilters[$filter->bidder] = $bidderFilters;
        }

        // Get bidders
        list ($query, $params) = $this->bidderSchema->get();
        $rows = $this->db->get_rows($query, $params);

        // Format the response
        $uiFormat = $app->request()->get('format') == 'ui';
        return array_map(function($row) use ($biddersFilters, $uiFormat)
        {
            $filters = array();
            $bidderId = (int)$row['id'];

            if (isset($biddersFilters[$bidderId]))
                $filters = $biddersFilters[$bidderId];

            $bidder = new Bidder($row, $filters);
            if ($uiFormat)
                return $bidder;

            return $this->_format($bidder);
        }, $rows);
    }

    function get($app, $id)
    {
        // Get filters
        list ($filtersQuery, $filtersParams) = $this->filterSchema->get(array ('bidder' => $id));
        $filterRows = $this->db->get_rows($filtersQuery, $filtersParams);
        $filters = array_map(function($row) { return new BidderFilter($row); }, $filterRows);

        // Get bidder
        list ($query, $params) = $this->bidderSchema->get(array ('id' => $id));
        $row = $this->db->get_first($query, $params);

        if (!isset($row))
            $app->halt(404);

        $bidder = new Bidder($row, $filters);
        if ($app->request()->get('format') == 'ui')
            return $bidder;

        return $this->_format($bidder);
    }

    // Format the bidder to match the config needed by the client script
    private function _format($bidder)
    {
        $filters = array();

        if ($bidder->sampling != 100)
            $filters['sampling'] = $bidder->sampling;

        $config = array();
        $config['id'] = $bidder->id;
        $config['bid_ep'] = $bidder->bidUrl;
        $config['key'] = $bidder->rsaPubKey;

        $filters = $this->_getFiltersConfig($bidder, array
        (
            'publisher_domain' => 'pub',
            'publisher_country' => 'pub_ctry',
            'user_country' => 'user_ctry',
            'iab_category' => 'cat'
        ));

        if (isset($filters) && count($filters) > 0)
            $config['filters'] = $filters;

        return $config;
    }

    private function _getFiltersConfig($bidder, $filterTypesAndKeys)
    {
        $config = array();
        foreach ($bidder->filters as $filter)
        {
            if (isset($filterTypesAndKeys[$filter->type]))
            {
                $key = $filterTypesAndKeys[$filter->type];
                $config[$key] = $filter->value;

                if ($filter->mode == 'inclusive')
                    $config[$key . '_wl'] = true;
            }
        }

        if ($bidder->sampling < 100)
            $config['sampling'] = $bidder->sampling;

        return $config;
    }

    function post($app)
    {
        $request = $app->request();
        $body = $request->getBody();
        $bidderWithFilters = json_decode($body, true);

        // Split bidder & its filters
        $filters = array();
        if (isset($bidderWithFilters['filters']))
        {
            $filters = $bidderWithFilters['filters'];
            unset($bidderWithFilters['filters']);
        }
        $bidder = $bidderWithFilters;

        if (!$this->_validate($bidder, bidders::$BIDDER_FIELDS))
            $app->halt(400);

        // Add bidder
        $this->db->execute('START TRANSACTION');
        list ($query, $params) = $this->bidderSchema->set(RedMap\Schema::SET_INSERT, $bidder);
        $insertedBidderId = $this->db->insert($query, $params);

        if (!isset($insertedBidderId))
        {
            $this->db->execute('ROLLBACK');
            $app->halt(409);
        }

        // Add filters
        foreach ($filters as $filter) {
            $filter['bidder'] = $insertedBidderId;

            if (isset($filter['value']))
                $filter['value'] = implode(';', $filter['value']);

            if (!$this->_validate($filter, bidders::$FILTER_FIELDS))
            {
                $this->db->execute('ROLLBACK');
                $app->halt(400);
            }

            list ($query, $params) = $this->filterSchema->set(RedMap\Schema::SET_INSERT, $filter);
            $result = $this->db->insert($query, $params);

            if (!isset($result))
            {
                $this->db->execute('ROLLBACK');
                $app->halt(409);
            }
        }

        $this->db->execute('COMMIT');
    }

    function put($app, $id)
    {
        $request = $app->request();
        $body = $request->getBody();
        $bidderWithFilters = json_decode($body, true);
        $bidderWithFilters['id'] = $id;

        // Split bidder & its filters
        $filters = array();
        if (isset($bidderWithFilters['filters']))
        {
            $filters = $bidderWithFilters['filters'];
            unset($bidderWithFilters['filters']);
        }
        $bidder = $bidderWithFilters;

        // Update bidder
        $this->db->execute('START TRANSACTION');
        list ($query, $params) = $this->bidderSchema->set(RedMap\Schema::SET_UPDATE, $bidder);
        $bidderUpdateResult = $this->db->execute($query, $params);

        if (!isset($bidderUpdateResult))
            $app->halt(500);

        if ($bidderUpdateResult == 0)
            $app->halt(404);

        // Delete bidder's filters
        list ($query, $params) = $this->filterSchema->delete(array ('bidder' => $id));
        $this->db->execute($query, $params);

        // Add new filters
        foreach ($filters as $filter) {
            $filter['bidder'] = $id;

            if (isset($filter['value']))
                $filter['value'] = implode(';', $filter['value']);

            if (!$this->_validate($filter, bidders::$FILTER_FIELDS))
            {
                $this->db->execute('ROLLBACK');
                $app->halt(400);
            }

            list ($query, $params) = $this->filterSchema->set(RedMap\Schema::SET_INSERT, $filter);
            $result = $this->db->execute($query, $params);
        }

        $this->db->execute('COMMIT');
    }

    function delete($app, $id)
    {
        // Delete bidder's filters
        list ($query, $params) = $this->filterSchema->delete(array ('bidder' => $id));
        $this->db->execute($query, $params);

        // Delete bidder
        list ($query, $params) = $this->bidderSchema->delete(array ('id' => $id));
        $result = $this->db->execute($query, $params);

        if (!isset($result) || $result == 0)
            $app->halt(404);
    }

    private function _validate($data, $fields)
    {
        $publisher = array();
        foreach ($fields as $field) {
            if (!isset($data[$field]))
                return false;
        }

        return true;
    }
}

class Bidder
{
    public $id;
    public $name;
    public $bidUrl;
    public $rsaPubKey;
    public $sampling;
    public $filters;

    function __construct($row, $filters)
    {
        $this->id = (int) $row['id'];
        $this->name = $row['name'];
        $this->bidUrl = $row['bidUrl'];
        $this->rsaPubKey = $row['rsaPubKey'];
        $this->sampling = $row['sampling'];
        $this->filters = $filters;
    }
}

class BidderFilter
{
    public $type;
    public $bidder;
    public $mode;
    public $value;

    function __construct($row)
    {
        $this->type = $row['type'];
        $this->bidder = (int) $row['bidder'];
        $this->mode = $row['mode'];
        $this->value = explode(";", $row['value']);
    }
}

?>