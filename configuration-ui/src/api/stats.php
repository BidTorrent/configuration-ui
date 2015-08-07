<?php

class Stats
{
	var $db;

	function __construct($db)
	{
		$this->db = $db;
	}

	function getByPublisher($publisher, $from, $to) {
		$result = array();
		$result['rows'] = array();

		$rows = $this->db->get_rows('
			SELECT
				DATE(FROM_UNIXTIME(`date`)) AS `date`,
				count(id) AS impressions,
				SUM(price) AS revenue
			FROM
				log_impressions
			WHERE
				`date` >= ?
				AND `date` < ?
				AND publisherId = ?
			GROUP BY
				DATE(FROM_UNIXTIME(`date`))
			',
			array($from, $to, $publisher)
		);
		foreach ($rows as $row) {
			$result['rows'][] = array(
				'date' => $row['date'],
				'impressions' => (int) $row['impressions'],
				'revenue' => (float) $row['revenue'],
			);
		}

		$rows = $this->db->get_rows('
			SELECT
				name
			FROM
				publishers
			WHERE
				id = ?
			',
			array($publisher)
		);

		$result['name'] = $rows[0]['name'];

		return $result;
	}
}

?>