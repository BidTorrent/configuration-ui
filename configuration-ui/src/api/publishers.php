<?php
require_once('vendor/redmap/main/src/schema.php');
require_once('vendor/redmap/main/src/drivers/mysqli.php');

class Publishers
{
    public $db;
    public $publisherSchema;
    public $filterSchema;
    public $slotSchema;
    public $users;

    static $PUBLISHER_FIELDS = array('name' => true, 'type' => true, 'country' => false, 'timeout' => false, 'secured' => false, 'hostConfig' => false, 'biddersUrl' => false, 'clientUrl' => false, 'impUrl' => false);
    static $FILTER_FIELDS = array('publisher' => true, 'type' => true, 'mode' => false, 'value' => false);
    static $SLOT_FIELDS = array('publisher' => true, 'html_id' => true, 'width' => false, 'height' => false, 'false' => false, 'passback' => false);

    function __construct($db, $users)
    {
        $this->db = $db;
        $this->users = $users;
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
                'secured'  => null,
                'hostConfig'  => null,
                'biddersUrl'  => null,
                'clientUrl'  => null,
				'impUrl' => null
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
                'floor'  => null,
				'passback'  => null,
            )
        );
    }

    function myPublishers($userId) {
        if ($userId === null)
            return array();

        list($allAccess, $publisherIds) = $this->users->myPublishers($userId);

        if ($allAccess) {
            list ($query, $params) = $this->publisherSchema->get();
            $rows = $this->db->get_rows($query, $params);
        }
        else {
            list ($query, $params) = $this->publisherSchema->get(array ('id|in' => $publisherIds));
            $rows = $this->db->get_rows($query, $params);
        }

        if ($rows === null)
            return array();

        return array_map(function($row) { return array('id' => (int)$row['id'], 'name' => $row['name']);}, $rows);
    }

    function getAll($app, $uiFormat)
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
        $result = array();
        foreach ($rows as $row) {
            $filters = array();
            $slots = array();
            $pubId = (int)$row['id'];

            if (isset($publishersFilters[$pubId]))
                $filters = $publishersFilters[$pubId];

            if (isset($publishersSlots[$pubId]))
                $slots = $publishersSlots[$pubId];

            $publisher = new Publisher($row, $filters, $slots);
            if ($uiFormat)
                array_push($result, $publisher);
            else
                array_push($result, $this->_format($publisher));
        }
        return $result;
    }

    function get($app, $id, $uiFormat)
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
        if ($uiFormat)
            return $publisher;

        return $this->_format($publisher);
    }

    function post($app, $userId)
    {
        if ($userId === null)
            $app->halt(401);

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
        if ($filters !== null)
        {
            foreach ($filters as $filter)
                $this->_addFilter($app, $filter, $insertedPubId);
        }

        // Add new slots
        if ($slots !== null)
        {
            foreach ($slots as $slot)
                $this->_addSlot($app, $slot, $insertedPubId);
        }

        // Add bidder<->user relation
        if (!$this->users->addUserForPublisher($userId, $insertedPubId))
        {
            $this->db->execute('ROLLBACK');
            $app->halt(500);
        }

        $this->db->execute('COMMIT');

        return array('id' => $insertedPubId);
    }

    function put($app, $id)
    {
        list($publisher, $filters, $slots) = $this->_getRequestParameters($app);
        $publisher['id'] = $id;

        // Get publisher
        list ($query, $params) = $this->publisherSchema->get(array ('id' => $id));
        $row = $this->db->get_first($query, $params);

        if (!isset($row))
            $app->halt(404);

        // Update publisher
        $this->db->execute('START TRANSACTION');
        list ($query, $params) = $this->publisherSchema->set(RedMap\Schema::SET_UPDATE, $publisher);
        $pubUpdateResult = $this->db->execute($query, $params);

        if (!isset($pubUpdateResult))
            $app->halt(500);

        // Replace filters if defined in request
        if ($filters !== null)
        {
            list ($query, $params) = $this->filterSchema->delete(array ('publisher' => $id));
            $this->db->execute($query, $params);

            foreach ($filters as $filter)
                $this->_addFilter($app, $filter, $id);
        }

        // Replace slots if defined in request
        if ($slots !== null)
        {
            list ($query, $params) = $this->slotSchema->delete(array ('publisher' => $id));
            $this->db->execute($query, $params);

            foreach ($slots as $slot)
                $this->_addSlot($app, $slot, $id);
        }

        $this->db->execute('COMMIT');
    }

    function delete($app, $userId, $id)
    {
        // Delete publisher's filters
        list ($query, $params) = $this->filterSchema->delete(array ('publisher' => $id));
        $this->db->execute($query, $params);

        // Delete publisher<->user relation
        $this->users->removeUserForPublisher($userId, $id);

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

        $config = $this->_getFiltersConfig($publisher->filters, array
        (
            'iab_category' => 'cat',
            'domain' => 'adv'
        ));

        $config[$globalConfigKey] = array(
            'publisher' => $publisherConfig,
            'id' => $publisher->id
        );
        $config['tmax'] = $publisher->timeout;

        $config['imp'] = array_map(function($slot) use ($publisher)
        {
            $banner = array('id' => $slot->html_id);

            if (isset($slot->width))
                $banner['w'] = $slot->width;

            if (isset($slot->height))
                $banner['h'] = $slot->height;

            $slotConfig = array(
                'id' => $slot->html_id,
                'bidfloor' => $slot->floor,
                'banner' => $banner
            );

            if ($publisher->secured)
                $slotConfig['secure'] = $publisher->secured;

			if ($slot->passback)
				$slotConfig['passback'] = $slot->passback;

            return $slotConfig;
        }, $publisher->imp);

        return $config;
    }

    private function _getFiltersConfig($filters, $filterTypesAndKeys)
    {
        $config = array();
        foreach ($filters as $filter)
        {
            if (isset($filterTypesAndKeys[$filter->type]))
            {
                $key = $filterTypesAndKeys[$filter->type];

                if ($filter->mode == 'inclusive')
                    $key = 'w' . $key;
                else
                    $key = 'b'. $key;

                $config[$key] = $filter->value;
            }
        }

        return $config;
    }

    private function _validate(&$data, $fields)
    {
        // Remove unknown fields from input data
        foreach ($data as $name => $value)
        {
            if (!isset($fields[$name]))
                unset($data[$name]);
        }

        // Ensure mandatory fields are set
        foreach ($fields as $name => $mandatory)
        {
            if ($mandatory && !isset($data[$name]))
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
        if (isset($json['filters']))
        {
            $filters = $json['filters'];
            unset($json['filters']);
        }
        else
            $filters = null;

        if (isset($json['imp']))
        {
            $slots = $json['imp'];
            unset($json['imp']);
        }
        else
            $slots = null;

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
    public $imp;
    public $hostConfig;
    public $biddersUrl;
    public $clientUrl;

    function __construct($row, $filters, $slots)
    {
        $this->id = (int) $row['id'];
        $this->name = $row['name'];
        $this->type = $row['type'];
        $this->country = $row['country'];
        $this->timeout = isset($row['timeout']) ? (int) $row['timeout'] : 400;
        $this->secured = isset($row['secured']) ? (bool) $row['secured'] : false;
        $this->hostConfig = (bool) $row['hostConfig'];
        $this->biddersUrl = $row['biddersUrl'];
        $this->clientUrl = $row['clientUrl'];
        $this->filters = $filters;
        $this->imp = $slots;
		$this->impUrl = $row['impUrl'];
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
	public $passback;

    function __construct($row)
    {
        $this->publisher = (int) $row['publisher'];
        $this->html_id = $row['html_id'];
        $this->width = isset($row['width']) ? (int) $row['width'] : null;
        $this->height = isset($row['height']) ? (int) $row['height'] : null;
        $this->floor = (float) $row['floor'];
		$this->passback = $row['passback'];
    }
}

?>