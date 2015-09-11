<?php

class Stats
{
	var $db;

	function __construct($db)
	{
		$this->db = $db;
	}

	function getByPublisherDaily($publisher, $from, $to) {
		$result = array();
		$result['rows'] = array();

		$rows = $this->db->get_rows('
			SELECT
				DATE(FROM_UNIXTIME(`date`)) AS `date`,
				count(id) AS impressions,
				SUM(price) AS revenue,
				1 AS hourlyAvailable
			FROM
				log_impressions
			WHERE
				`date` >= ?
				AND `date` < ?
				AND publisherId = ?
			GROUP BY
				DATE(FROM_UNIXTIME(`date`))

			UNION ALL

			SELECT
				`date`,
				impressions,
				price AS revenue,
				0 AS hourlyAvailable
			FROM
				log_impressions_daily
			WHERE
				`date` >= FROM_UNIXTIME(?)
				AND `date` < FROM_UNIXTIME(?)
				AND publisherId = ?
			',
			array($from, $to, $publisher, $from, $to, $publisher)
		);
		foreach ($rows as $row) {
			$result['rows'][] = array(
				'date' => $row['date'],
				'impressions' => (int) $row['impressions'],
				'revenue' => (float) $row['revenue'],
				'hourlyAvailable' => (bool) $row['hourlyAvailable']
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

	function getByPublisherHourly($publisher, $from, $to) {
		$result = array();
		$result['rows'] = array();

		$rows = $this->db->get_rows('
			SELECT
				DATE_FORMAT(FROM_UNIXTIME(`date`), "%Y-%m-%d %H:00:00") AS `date`,
				count(id) AS impressions,
				SUM(price) AS revenue
			FROM
				log_impressions
			WHERE
				`date` >= ?
				AND `date` < ?
				AND publisherId = ?
			GROUP BY
				DATE_FORMAT(FROM_UNIXTIME(`date`), "%Y-%m-%d %H:00:00")
			',
			array($from, $to, $publisher)
		);
		foreach ($rows as $row) {
			$result['rows'][] = array(
				'date' => $row['date'],
				'impressions' => (int) $row['impressions'],
				'revenue' => (float) $row['revenue']
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

	function getByPublisherCsv($publisher, $from, $to) {
		$result = array();
		$head = array();
		$head[] = "Date";
		$head[] = "Impressions";
		$head[] = "Revenue (USD)";
		$result[] = $head;

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

			UNION ALL

			SELECT
				`date`,
				impressions,
				price AS revenue
			FROM
				log_impressions_daily
			WHERE
				`date` >= FROM_UNIXTIME(?)
				AND `date` < FROM_UNIXTIME(?)
				AND publisherId = ?
			',
			array($from, $to, $publisher)
		);

		$row = 0;
		foreach ($rows as $row) {
			$r = array();
			$r[] = $row['date'];
			$r[] = $row['impressions']*1;
			$r[] = $row['revenue']/1000;

			$result[] = $r;
		}

		return $result;
	}
}

?>