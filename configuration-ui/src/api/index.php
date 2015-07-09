<?php

require 'vendor/autoload.php';
require 'bidders.php';
require 'publishers.php';

if (!file_exists('config/config.php'))
	die('config/config.php is not found');
$config = array();
include_once("config/config.php");

$app = new \Slim\Slim();
$app->config('debug', $config['debug']);

$db = new RedMap\Drivers\MySQLiDriver('UTF8');
$db->connect($config['db_user'], $config['db_password'], $config['db_name']);

$bidders = new Bidders($db);
$app->get('/bidders/', function () use ($app, $bidders) { display_result($app, $bidders->getAll($app)); });
$app->get('/bidders/:id', function ($id) use ($app, $bidders) { 
	$app->expires('+3 hour');
	display_result($app, $bidders->get($app, $id)); 
});
$app->delete('/bidders/:id', function ($id) use ($app, $bidders) { $bidders->delete($app, $id); });
$app->put('/bidders/:id', function ($id) use ($app, $bidders) { $bidders->put($app, $id); });
$app->post('/bidders/', function () use ($app, $bidders) { $bidders->post($app); });

$publishers = new Publishers($db);
$app->get('/publishers/', function () use ($app, $publishers) { display_result($app, $publishers->getAll($app)); });
$app->get('/publishers/:id', function ($id) use ($app, $publishers) { 
	$app->expires('+3 hour');
	display_result($app, $publishers->get($app, $id)); 
});
$app->delete('/publishers/:id', function ($id) use ($app, $publishers) { $publishers->delete($app, $id); });
$app->put('/publishers/:id', function ($id) use ($app, $publishers) { $publishers->put($app, $id); });
$app->post('/publishers/', function () use ($app, $publishers) { $publishers->post($app); });

$app->run();

function display_result($app, $result)
{
    $app->response->headers->set('Content-Type', 'application/json');
    echo json_encode($result);
}

?>