<?php
require 'vendor/autoload.php';
require 'bidders.php';
require 'publishers.php';
require 'users.php';
require 'stats.php';
require 'csv.php';

define("USER_ID_CACHE_DURATION", 450);


if (!file_exists('config/config.php'))
    die('config/config.php is not found');
$config = array();
include_once("config/config.php");

$app = new \Slim\Slim();
$app->config('debug', $config['debug']);

$db = new RedMap\Drivers\MySQLiDriver('UTF8');
$db->connect($config['db_user'], $config['db_password'], $config['db_name']);

$users = new Users($db);
$bidders = new Bidders($db, $users);
$publishers = new Publishers($db, $users);
$stats = new Stats($db);
$gitkitClient = Gitkit_Client::createFromFile('config/gitkit-server-config.json');

$app->get('/bidders/', function () use ($app, $bidders) {
	$uiFormat = $app->request()->get('format') === 'ui';

	if (!$uiFormat)
		$app->expires('+3 hour');

    displayResultJson($app, $bidders->getAll($app, $uiFormat));
});
$app->get('/bidders/:id', function ($id) use ($app, $bidders) {
	$uiFormat = $app->request()->get('format') === 'ui';

	if (!$uiFormat)
		$app->expires('+3 hour');

    displayResultJson($app, $bidders->get($app, $id, $uiFormat));
});
$app->delete('/bidders/:id', function ($id) use ($app, $bidders, $users, $gitkitClient) {
    $userId = validateUserForBidder($app, $users, $gitkitClient, $id);
    $bidders->delete($app, $userId, $id);
});
$app->put('/bidders/:id', function ($id) use ($app, $bidders, $users, $gitkitClient) {
    validateUserForBidder($app, $users, $gitkitClient, $id);
    $bidders->put($app, $id);
});
$app->post('/bidders/', function () use ($app, $bidders, $users, $gitkitClient) {
    $userId = getUserId($users, $gitkitClient);
    displayResultJson($app, $bidders->post($app, $userId));
});

$app->get('/publishers/', function () use ($app, $publishers) {
	$uiFormat = $app->request()->get('format') === 'ui';

	if (!$uiFormat)
		$app->expires('+3 hour');

    displayResultJson($app, $publishers->getAll($app, $uiFormat));
});
$app->get('/publishers/:id', function ($id) use ($app, $publishers) {
	$uiFormat = $app->request()->get('format') === 'ui';

	if (!$uiFormat)
		$app->expires('+3 hour');

    displayResultJson($app, $publishers->get($app, $id, $uiFormat));
});
$app->delete('/publishers/:id', function ($id) use ($app, $publishers, $users, $gitkitClient) {
    $userId = validateUserForPublisher($app, $users, $gitkitClient, $id);
    $publishers->delete($app, $userId, $id);
});
$app->put('/publishers/:id', function ($id) use ($app, $publishers, $users, $gitkitClient) {
    validateUserForPublisher($app, $users, $gitkitClient, $id);
    $publishers->put($app, $id);
});
$app->post('/publishers/', function () use ($app, $publishers, $users, $gitkitClient) {
    $userId = getUserId($users, $gitkitClient);
    displayResultJson($app, $publishers->post($app, $userId));
});

$app->get('/mybidders/', function () use ($app, $bidders, $users, $gitkitClient) {
    $userId = getUserId($users, $gitkitClient);
    displayResultJson($app, $bidders->myBidders($userId));
});
$app->get('/mypublishers/', function () use ($app, $publishers, $users, $gitkitClient) {
    $userId = getUserId($users, $gitkitClient);
    displayResultJson($app, $publishers->myPublishers($userId));
});

// Hack to know user id
$app->get('/myid/', function () use ($users, $gitkitClient) { echo getUserId($users, $gitkitClient); });

$app->get('/stats/publishers/:publisher/:from/:to', function ($publisher, $from, $to) use ($app, $users, $gitkitClient, $stats) {
    validateUserForPublisher($app, $users, $gitkitClient, $publisher);
    displayResultJson(
        $app,
        $stats->getByPublisherDaily(
            $publisher,
            $from,
            $to
        )
    );
});
$app->get('/stats/publishers/:publisher/:from/:to/hourly', function ($publisher, $from, $to) use ($app, $users, $gitkitClient, $stats) {
    validateUserForPublisher($app, $users, $gitkitClient, $publisher);
    displayResultJson(
        $app,
        $stats->getByPublisherHourly(
            $publisher,
            $from,
            $to
        )
    );
});

$app->get('/stats/publishers-csv/:publisher/:from/:to', function ($publisher, $from, $to) use ($app, $users, $gitkitClient, $stats) {
    validateUserForPublisher($app, $users, $gitkitClient, $publisher);
    displayResultCsv(
        $app,
        $stats->getByPublisherCsv(
            $publisher,
            $from,
            $to
        )
    );
});

$app->run();

function displayResultJson($app, $result) {
    $app->response->headers->set('Content-Type', 'application/json');
    echo json_encode($result);
}

function displayResultCsv($app, $result) {
    $app->response->headers->set('Content-Type', 'text/csv');
    $app->response->headers->set('Content-Disposition', 'attachment; filename="bidtorrent-stats.csv"');

    echo csv_encode($result);
}

function validateUserForPublisher($app, $users, $gitkitClient, $publisherId) {
    $userId = getUserId($users, $gitkitClient);

    if ($userId === null)
        $app->halt(401);

    if (!$users->hasAccessOnPublisher($userId, $publisherId))
        $app->halt(403);

    return $userId;
}

function validateUserForBidder($app, $users, $gitkitClient, $bidderId) {
    $userId = getUserId($users, $gitkitClient);

    if ($userId === null)
        $app->halt(401);

    if (!$users->hasAccessOnBidder($userId, $bidderId))
        $app->halt(403);

    return $userId;
}

function getUserId($users, $gitkitClient) {
    $userId = getUserIdFromCache();
	if ($userId === null) {

		$gitkitUser = $gitkitClient->getUserInRequest();
		if ($gitkitUser)
			$userId = $gitkitUser->getUserId();
		$headers = getallheaders();
		if ($userId == null && isset($headers['Authorization'])) {
			$userId = $users->getUserIdFromApiKey($headers['Authorization']);
		}
		setUserIdInCache($userId);
    }

    return $userId;
}

function getUserIdFromCache() {
	session_start();
	if (isset($_SESSION["userId"])) {
		list($userId, $time) = $_SESSION["userId"];

		if (time() - $time < USER_ID_CACHE_DURATION)
			return $userId;
	}
	return null;
}

function setUserIdInCache($userId) {
	$_SESSION["userId"] = array($userId, time());
}


?>