<?php

namespace RedMap\Drivers;

class MySQLiDriver
{
	public function __construct ($charset, $handler = null)
	{
		\mysqli_report (MYSQLI_REPORT_OFF);

		$this->charset = $charset;
		$this->connection = null;
		$this->handler = $handler;
	}

	public function connect ($user, $pass, $name, $host = '127.0.0.1', $port = 3306)
	{
		$this->connection = new \mysqli ($host, $user, $pass, $name, $port);

		if ($this->connection->connect_errno !== 0)
			return false;

		if ($this->charset !== null)
			$this->connection->set_charset ($this->charset);

		return true;
	}

	public function error ()
	{
		return $this->connection->error;
	}

	public function execute ($query, $params = array ())
	{
		$result = $this->send ($query, $params);

		if ($result === false)
			return null;

		return $this->connection->affected_rows >= 0 ? $this->connection->affected_rows : null;
	}

	public function get_first ($query, $params = array (), $default = null)
	{
		$result = $this->send ($query, $params);

		if ($result === false)
			return $default;

		$row = $result->fetch_assoc ();
		$result->free ();

		return $row !== null ? $row : $default;
	}

	public function get_rows ($query, $params = array (), $default = null)
	{
		$result = $this->send ($query, $params);

		if ($result === false)
			return $default;

		$rows = array ();

		while (($row = $result->fetch_assoc ()) !== null)
			$rows[] = $row;

		$result->free ();

		return $rows;
	}

	public function get_value ($query, $params = array (), $default = null)
	{
		$result = $this->send ($query, $params);

		if ($result === false)
			return $default;

		$row = $result->fetch_row ();
		$result->free ();

		if ($row !== null && count ($row) >= 1)
			return $row[0];

		return $default;
	}

	public function insert ($query, $params = array ())
	{
		$result = $this->send ($query, $params);

		if ($result === false)
			return null;

		return $this->connection->insert_id;
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
			return $this->connection->escape_string ((bool)$value ? 1 : 0);

		if (is_int ($value))
			return $this->connection->escape_string ((int)$value);

		if (is_float ($value))
			return $this->connection->escape_string ((double)$value);

		return '\'' . $this->connection->escape_string ((string)$value) . '\'';
	}

	private function send ($query, $params)
	{
		for ($offset = 0; ($offset = strpos ($query, '?', $offset)) !== false; $offset += strlen ($escape))
		{
			$escape = $this->escape (array_shift ($params));
			$query = substr ($query, 0, $offset) . $escape . substr ($query, $offset + 1);
		}

		$result = $this->connection->query ($query);

		if ($result === false && $this->handler !== null)
		{
			$handler = $this->handler;
			$handler ($this, $query);
		}

		return $result;
	}
}

?>
