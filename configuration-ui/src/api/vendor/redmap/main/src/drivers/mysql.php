<?php

namespace RedMap\Drivers;

class MySQLDriver
{
	public function __construct ($charset, $handler = null)
	{
		$this->charset = $charset;
		$this->connection = null;
		$this->handler = $handler;
	}

	public function connect ($user, $pass, $name, $host = '127.0.0.1', $port = 3306)
	{
		$this->connection = mysql_connect ($host . ':' . $port, $user, $pass);

		if ($this->connection === false || !mysql_select_db ($name, $this->connection))
			return false;

		if ($this->charset !== null)
			mysql_set_charset ($this->charset, $this->connection);

		return true;
	}

	public function error ()
	{
		return mysql_error ($this->connection);
	}

	public function execute ($query, $params = array ())
	{
		if ($this->send ($query, $params) === false)
			return null;

		return mysql_affected_rows ($this->connection);
	}

	public function get_first ($query, $params = array (), $default = null)
	{
		$handle = $this->send ($query, $params);

		if ($handle === false || !($row = mysql_fetch_assoc ($handle)))
			return $default;

		return $row;
	}

	public function get_rows ($query, $params = array (), $default = null)
	{
		$handle = $this->send ($query, $params);

		if ($handle === false)
			return $default;

		$rows = array ();

		while (($row = mysql_fetch_assoc ($handle)))
			$rows[] = $row;

		return $rows;
	}

	public function get_value ($query, $params = array (), $default = null)
	{
		$handle = $this->send ($query, $params);

		if ($handle === false)
			return $default;

		if (($row = mysql_fetch_row ($handle)) && count ($row) >= 1)
			return $row[0];

		return $default;
	}

	public function insert ($query, $params = array ())
	{
		if ($this->send ($query, $params) === false)
			return null;

		return mysql_insert_id ($this->connection);
	}

	private function escape ($value)
	{
		if ($value === null)
			return 'NULL';

		if (is_array ($value))
		{
			$array = array ();

			foreach ($value as $v)
				$array[] = $this->escape ($v);

			return '(' . (count ($array) > 0 ? implode (',', $array) : 'NULL') . ')';
		}

		if (is_bool ($value))
			return mysql_real_escape_string ((bool)$value ? 1 : 0, $this->connection);

		if (is_int ($value))
			return mysql_real_escape_string ((int)$value, $this->connection);

		if (is_float ($value))
			return mysql_real_escape_string ((double)$value, $this->connection);

		return '\'' . mysql_real_escape_string ((string)$value, $this->connection) . '\'';
	}

	private function send ($query, $params)
	{
		for ($offset = 0; ($offset = strpos ($query, '?', $offset)) !== false; $offset += strlen ($escape))
		{
			$escape = $this->escape (array_shift ($params));
			$query = substr ($query, 0, $offset) . $escape . substr ($query, $offset + 1);
		}

		$result = mysql_query ($query, $this->connection);

		if ($result === false && $this->handler !== null)
		{
			$handler = $this->handler;
			$handler ($this, $query);
		}

		return $result;
	}
}

?>
