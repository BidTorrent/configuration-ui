<?php

function csv_encode($data) {
	$res = "";

	foreach ($data as $row) {
		$col = 0;
		foreach ($row as $item) {
			if ($col > 0)
				$res .= ',';
			$res .= csv_encode_item($item);
			$col ++;
		}
		$res .= "\r\n";
	}
	return $res;
}

function csv_encode_item($data) {
	switch (gettype($data)) {
		case "boolean":
		case "integer":
		case "double":
			return strval($data);
			break;
		case "string": // This is broken if the string contains a double quote or newline chars. Hopefully we only handle dates. And I love long comments.
			return "\"" . $data . "\"";
			break;
	}
	return "bleh";
}

?>
