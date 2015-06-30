'use strict';

var bidTorrentApp = angular.module('bidTorrentApp', ['ui.router'])
.config(function($stateProvider, $urlRouterProvider) {

    // For any unmatched url, redirect to /state1
    $urlRouterProvider.otherwise("/");

    // Now set up the states
    $stateProvider
        .state('home', {
            url: "/",
            templateUrl: "partials/home.html"
        })
        .state('publisher', {
            url: "/publisher",
            templateUrl: "partials/publisher.html"
        })
        .state('bidder', {
            url: "/bidder",
            templateUrl: "partials/bidder.html"
        })
})
.controller('HeaderController', function HeaderController($scope, $location) { 
    $scope.isActive = function (viewLocation) { 
        return viewLocation === $location.path();
    };
});
