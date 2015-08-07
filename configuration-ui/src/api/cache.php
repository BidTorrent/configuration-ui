<?php

/*
 * Utility class which simplifies caching of data
 */
class Cache {
	var $tempDir;
	var $app;

	function __construct($tempDir, $app) {
		$this->tempDir = $tempDir;
		if (!file_exists($tempDir))
			mkdir($tempDir);
		$this->app = $app;
	}

	/*
	* Runs a function which echo something and caches the result for a given period.
	* That cache is on multiple level
	* - locally the result is stored in a file so that subsequent calls only reads that file
	* - the browser is given HTTP headers which discourage any call for the period
	* - the browser is given a hash ETAG which allows us to return 304 in case the result was unchanged since last call
	*/
	function runWithCache(		
		$func, 				// The function to run
		$key,				// A key to identify the result to cache. same key => same cache location => same result
		$durationInSeconds,	// How much time should that item be kept in the cache
		$byPass				// A flag which bypasses the cache (usefull for configuration UIs which requires to see changes immediatly)
	) {
		$file = $this->getFileName($key);
		
		//content
		$data = "";
		if (!$byPass && file_exists($file) && time() <= filemtime($file) + $durationInSeconds)
		{
			$data = file_get_contents($file);
		} 
		else
		{
			ob_start();
			$func();
			$data = ob_get_clean();
			file_put_contents( $file, $data);
		}

		//headers
		if (!$byPass) {
			$this->app->expires('+$durationInSeconds seconds');
			$this->app->etag(sha1($data));
		}

		//dump 
		//note: Slim is supposed to ignore this echo in case the etags are equals to the one in the header)
		echo $data;
	}

	private function getFileName($key) {
		return $this->tempDir . trim(str_replace('--', '-', strtolower(str_replace(array(" ", "/", "\\"), "-", $key))), ' -');
	}
}

?>