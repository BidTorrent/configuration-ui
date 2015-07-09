<?php

require 'vendor/autoload.php';
require 'bidders.php';
require 'publishers.php';
require 'users.php';

if (!file_exists('config/config.php'))
    die('config/config.php is not found');
$config = array();
include_once("config/config.php");

$app = new \Slim\Slim();
$app->config('debug', $config['debug']);

$db = new RedMap\Drivers\MySQLiDriver('UTF8');
$db->connect($config['db_user'], $config['db_password'], $config['db_name']);

$gitkitClient = Gitkit_Client::createFromFile('config/gitkit-server-config.json');
$gitkitUser = $gitkitClient->getUserInRequest();
$userId = null;
if ($gitkitUser)
    $userId = $gitkitUser->getUserId();
$users = new Users($db);

$bidders = new Bidders($db, $users);
$app->get('/bidders/', function () use ($app, $bidders) {
    $app->expires('+3 hour');
    displayResult($app, $bidders->getAll($app));
});
$app->get('/bidders/:id', function ($id) use ($app, $bidders) { 
    $app->expires('+3 hour');
    displayResult($app, $bidders->get($app, $id));
});
$app->delete('/bidders/:id', function ($id) use ($app, $bidders, $users, $userId) {
    validateUserForBidder($app, $users, $userId, $id);
    $bidders->delete($app, $userId, $id);
});
$app->put('/bidders/:id', function ($id) use ($app, $bidders, $users, $userId) {
    validateUserForBidder($app, $users, $userId, $id);
    $bidders->put($app, $id);
});
$app->post('/bidders/', function () use ($app, $bidders, $userId) {
    $bidders->post($app, $userId);
});

$publishers = new Publishers($db, $users);
$app->get('/publishers/', function () use ($app, $publishers) {
    $app->expires('+3 hour');
    displayResult($app, $publishers->getAll($app));
});
$app->get('/publishers/:id', function ($id) use ($app, $publishers) { 
    $app->expires('+3 hour');
    displayResult($app, $publishers->get($app, $id));
});
$app->delete('/publishers/:id', function ($id) use ($app, $publishers, $users, $userId) {
    validateUserForPublisher($app, $users, $userId, $id);
    $publishers->delete($app, $userId, $id);
});
$app->put('/publishers/:id', function ($id) use ($app, $publishers, $users, $userId) {
    validateUserForPublisher($app, $users, $userId, $id);
    $publishers->put($app, $id);
});
$app->post('/publishers/', function () use ($app, $publishers, $userId) {
    $publishers->post($app, $userId);
});

// Hack to know user id
$app->get('/myid/', function () use ($userId) { echo $userId; });

$app->run();

function displayResult($app, $result) {
    $app->response->headers->set('Content-Type', 'application/json');
    echo json_encode($result);
}

function validateUserForPublisher($app, $users, $userId, $publisherId) {
    if ($userId === null)
        $app->halt(401);

    if (!$users->hasAccessOnPublisher($userId, $publisherId))
        $app->halt(403);
}

function validateUserForBidder($app, $users, $userId, $bidderId) {
    if ($userId === null)
        $app->halt(401);

    if (!$users->hasAccessOnBidder($userId, $bidderId))
        $app->halt(403);
}
?>