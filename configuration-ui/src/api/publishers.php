<?php
require_once('vendor/redmap/main/src/schema.php');
require_once('vendor/redmap/main/src/drivers/mysqli.php');

class Publishers
{
    public $db;
    public $publisherSchema;
    public $filterSchema;
    public $slotSchema;

    static $PUBLISHER_FIELDS = array('name', 'type');
    static $FILTER_FIELDS = array('publisher', 'type');
    static $SLOT_FIELDS = array('publisher', 'html_id');

    function __construct($db)
    {
        $this->db = $db;
        $this->publisherSchema = new RedMap\Schema
        (
            'publishers',
            array
            (
                'id'    => array (RedMap\Schema::FIELD_PRIMARY),
                'name'  => null,
                'type'  => null,
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
        $this->slotSchema = new RedMap\Schema
        (
            'publishers_slots',
            array
            (
                'html_id'    => array (RedMap\Schema::FIELD_PRIMARY),
                'publisher'  => array (RedMap\Schema::FIELD_PRIMARY),
                'width'  => null,
                'height'  => null,
                'floor'  => null
            )
        );
    }

    function getAll($app)
    {
        // Get filters
        list ($filtersQuery, $filtersParams) = $this->filterSchema->get();
        $filterRows = $this->db->get_rows($filtersQuery, $filtersParams);

        $filters = array_map(function($row) { return new PublisherFilter($row); }, $filterRows);
        $publishersFilters = $this->_toDictionary($filters, function ($filter) { return $filter->publisher; });

        // Get slots
        list ($slotsQuery, $slotsParams) = $this->slotSchema->get();
        $slotRows = $this->db->get_rows($slotsQuery, $slotsParams);

        $slots = array_map(function($row) { return new PublisherSlot($row); }, $slotRows);
        $publishersSlots = $this->_toDictionary($slots, function ($slot) { return $slot->publisher; });

        // Get publishers
        list ($query, $params) = $this->publisherSchema->get();
        $rows = $this->db->get_rows($query, $params);

        // Format the response
        $uiFormat = $app->request()->get('format') == 'ui';
        return array_map(function($row) use ($publishersFilters, $publishersSlots, $uiFormat)
        {
            $filters = array();
            $slots = array();
            $pubId = (int)$row['id'];

            if (isset($publishersFilters[$pubId]))
                $filters = $publishersFilters[$pubId];

            if (isset($publishersSlots[$pubId]))
                $slots = $publishersSlots[$pubId];

            $publisher = new Publisher($row, $filters, $slots);
            if ($uiFormat)
                return $publisher;

            return $this->_format($publisher);
        }, $rows);
    }

    function get($app, $id)
    {
        // Get filters
        list ($filtersQuery, $filtersParams) = $this->filterSchema->get(array ('publisher' => $id));
        $filterRows = $this->db->get_rows($filtersQuery, $filtersParams);
        $filters = array_map(function($row) { return new PublisherFilter($row); }, $filterRows);

        // Get slots
        list ($slotsQuery, $slotsParams) = $this->slotSchema->get(array ('publisher' => $id));
        $slotRows = $this->db->get_rows($slotsQuery, $slotsParams);
        $slots = array_map(function($row) { return new PublisherSlot($row); }, $slotRows);

        // Get publisher
        list ($query, $params) = $this->publisherSchema->get(array ('id' => $id));
        $row = $this->db->get_first($query, $params);

        if (!isset($row))
            $app->halt(404);

        $publisher = new Publisher($row, $filters, $slots);
        if ($app->request()->get('format') == 'ui')
            return $publisher;

        return $this->_format($publisher);
    }

    function post($app)
    {
        list($publisher, $filters, $slots) = $this->_getRequestParameters($app);

        if (!$this->_validate($publisher, publishers::$PUBLISHER_FIELDS))
            $app->halt(400);

        // Add publisher
        $this->db->execute('START TRANSACTION');
        list ($query, $params) = $this->publisherSchema->set(RedMap\Schema::SET_INSERT, $publisher);
        $insertedPubId = $this->db->insert($query, $params);

        if (!isset($insertedPubId))
        {
            $this->db->execute('ROLLBACK');
            $app->halt(409);
        }

        // Add new filters
        array_map(function($filter) use ($app, $insertedPubId) { $this->_addFilter($app, $filter, $insertedPubId); }, $filters);

        // Add new slots
        array_map(function($slot) use ($app, $insertedPubId) { $this->_addSlot($app, $slot, $insertedPubId); }, $slots);

        $this->db->execute('COMMIT');
    }

    function put($app, $id)
    {
        list($publisher, $filters, $slots) = $this->_getRequestParameters($app);
        $publisher['id'] = $id;

        // Update publisher
        $this->db->execute('START TRANSACTION');
        list ($query, $params) = $this->publisherSchema->set(RedMap\Schema::SET_UPDATE, $publisher);
        $pubUpdateResult = $this->db->execute($query, $params);

        if (!isset($pubUpdateResult))
            $app->halt(500);

        if ($pubUpdateResult == 0)
            $app->halt(404);

        // Delete publisher's filters
        list ($query, $params) = $this->filterSchema->delete(array ('publisher' => $id));
        $this->db->execute($query, $params);

        // Delete publisher's slots
        list ($query, $params) = $this->slotSchema->delete(array ('publisher' => $id));
        $this->db->execute($query, $params);

        // Add new filters
        array_map(function($filter) use ($app, $id) { $this->_addFilter($app, $filter, $id); }, $filters);

        // Add new slots
        array_map(function($slot) use ($app, $id) { $this->_addSlot($app, $slot, $id); }, $slots);

        $this->db->execute('COMMIT');
    }

    function delete($app, $id)
    {
        // Delete publisher's filters
        list ($query, $params) = $this->filterSchema->delete(array ('publisher' => $id));
        $this->db->execute($query, $params);

        // Delete publisher's slots
        list ($query, $params) = $this->slotSchema->delete(array ('publisher' => $id));
        $this->db->execute($query, $params);

        // Delete publisher
        list ($query, $params) = $this->publisherSchema->delete(array ('id' => $id));
        $result = $this->db->execute($query, $params);

        if (!isset($result) || $result == 0)
            $app->halt(404);
    }

    // Format the publisher to match the config needed by the client script
    private function _format($publisher)
    {
        $config = array();

        if ($publisher->type == 'inapp')
            $globalConfigKey = 'app';
        else
            $globalConfigKey = 'site';

        $publisherConfig = array(
            'id' => $publisher->id,
            'name' => $publisher->name
        );
        if (isset($publisher->country))
            $publisherConfig['country'] = $publisher->country;

        $blacklistedCategories = $this->_getFilterValue($publisher->filters, 'iab_category');
        if (isset($blacklistedCategories))
            $config['bcat'] = $blacklistedCategories;

        $blacklistedDomains = $this->_getFilterValue($publisher->filters, 'domain');
        if (isset($blacklistedDomains))
            $config['badv'] = $blacklistedDomains;

        $config[$globalConfigKey] = array('publisher' => $publisherConfig);
        $config['tmax'] = $publisher->timeout;

        $config['imp'] = array_map(function($slot) use ($publisher)
        {
            $banner = array('id' => $slot->html_id);

            if (isset($slot->width))
                $banner['w'] = $slot->width;

            if (isset($slot->height))
                $banner['h'] = $slot->height;

            $slotConfig = array('bidfloor' => $slot->floor, 'banner' => $banner);

            if ($publisher->secured)
                $slotConfig['secure'] = $publisher->secured;

            return $slotConfig;
        }, $publisher->slots);

        return $config;
    }

    private function _getFilterValue($filters, $filterType)
    {
        foreach ($filters as $filter)
        {
            if ($filter->type == $filterType &&
                $filter->mode == 'exclusive') // Manage only blacklisting right now
            {
                return $filter->value;
            }
        }

        return NULL;
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

    private function _toDictionary($rows, $getKey)
    {
        $result = array();

        foreach ($rows as $row)
        {
            $key = $getKey($row);
            $value = array();

            if (isset($result[$key]))
                $value = $result[$key];

            array_push($value, $row);
            $result[$key] = $value;
        }

        return $result;
    }

    // Get from body, the json representing the publisher, its filters & its slots
    // Usage list($publisher, $filters, $slots) = _getRequestParameters($app);
    private function _getRequestParameters($app)
    {
        $request = $app->request();
        $body = $request->getBody();
        $json = json_decode($body, true);

        // Split publisher, its filters & its slots
        $filters = array();
        if (isset($json['filters']))
        {
            $filters = $json['filters'];
            unset($json['filters']);
        }
        $slots = array();
        if (isset($json['slots']))
        {
            $slots = $json['slots'];
            unset($json['slots']);
        }

        return array($json, $filters, $slots);
    }

    private function _addFilter($app, $filter, $publisherId)
    {
        $filter['publisher'] = $publisherId;

        if (isset($filter['value']))
            $filter['value'] = implode(';', $filter['value']);

        if (!$this->_validate($filter, publishers::$FILTER_FIELDS))
        {
            $this->db->execute('ROLLBACK');
            $app->halt(400);
        }

        list ($query, $params) = $this->filterSchema->set(RedMap\Schema::SET_INSERT, $filter);
        $result = $this->db->execute($query, $params);

        if (!isset($result))
        {
            $this->db->execute('ROLLBACK');
            $app->halt(409);
        }
    }

    private function _addSlot($app, $slot, $publisherId)
    {
        $slot['publisher'] = $publisherId;

        if (!$this->_validate($slot, publishers::$SLOT_FIELDS))
        {
            $this->db->execute('ROLLBACK');
            $app->halt(400);
        }

        list ($query, $params) = $this->slotSchema->set(RedMap\Schema::SET_INSERT, $slot);
        $result = $this->db->execute($query, $params);

        if (!isset($result))
        {
            $this->db->execute('ROLLBACK');
            $app->halt(409);
        }
    }
}

class Publisher
{
    public $id;
    public $name;
    public $type;
    public $country;
    public $timeout;
    public $secured;
    public $filters;
    public $slots;

    function __construct($row, $filters, $slots)
    {
        $this->id = (int) $row['id'];
        $this->name = $row['name'];
        $this->type = $row['type'];
        $this->country = $row['country'];
        $this->timeout = isset($row['timeout']) ? (int) $row['timeout'] : 400;
        $this->secured = isset($row['secured']) ? (bool) $row['secured'] : false;
        $this->filters = $filters;
        $this->slots = $slots;
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

class PublisherSlot
{
    public $publisher;
    public $html_id;
    public $width;
    public $height;
    public $floor;

    function __construct($row)
    {
        $this->publisher = (int) $row['publisher'];
        $this->html_id = $row['html_id'];
        $this->width = isset($row['width']) ? (int) $row['width'] : null;
        $this->height = isset($row['height']) ? (int) $row['height'] : null;
        $this->floor = (float) $row['floor'];
    }
}

?>