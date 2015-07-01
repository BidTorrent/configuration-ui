<?php

require 'vendor/autoload.php';
require 'bidders.php';
require 'publishers.php';

$app = new \Slim\Slim();

$bidders = new Bidders();
$app->get('/bidders/', function () use ($app, $bidders) { display_result($bidders->getAll()); });
$app->get('/bidders/:id', function ($id) use ($app, $bidders) { display_result($bidders->get($app, $id)); });
$app->delete('/bidders/:id', function ($id) use ($app, $bidders) { $bidders->delete($app, $id); });
$app->put('/bidders/:id', function ($id) use ($app, $bidders) { $bidders->put($app, $id); });
$app->post('/bidders/', function () use ($app, $bidders) { $bidders->post($app); });

$publishers = new Publishers();
$app->get('/publishers/', function () use ($app, $publishers) { display_result($publishers->getAll()); });
$app->get('/publishers/:id', function ($id) use ($app, $publishers) { display_result($publishers->get($app, $id)); });
$app->delete('/publishers/:id', function ($id) use ($app, $publishers) { $publishers->delete($app, $id); });
$app->put('/publishers/:id', function ($id) use ($app, $publishers) { $publishers->put($app, $id); });
$app->post('/publishers/', function () use ($app, $publishers) { $publishers->post($app); });

$app->run();

function display_result($result)
{
    echo json_encode($result);
}

?>