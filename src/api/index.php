<?php

require 'vendor/autoload.php';
require 'bidders.php';

$app = new \Slim\Slim();

$bidders = new Bidders();

$app->get('/bidders', function () use ($app, $bidders) { display_result($app, $bidders->getAll()); });
$app->get('/bidders/:id', function ($id) use ($app, $bidders) { display_result($app, $bidders->get($id)); });
$app->delete('/bidders/:id', function ($id) use ($app, $bidders) { $bidders->delete($app, $id); });
$app->put('/bidders/:id', function ($id) use ($app, $bidders) { $bidders->put($app, $id); });
$app->post('/bidders/', function () use ($app, $bidders) { $bidders->post($app); });

$app->run();

function display_result($app, $result)
{
    if (!isset($result))
        $app->halt(404);

    echo json_encode($result);
}

?>