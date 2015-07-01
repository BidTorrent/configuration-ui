'use strict';

var btApp = angular.module('btApp', [
    'ui.router',
    'oauth',
    'btApp.bidder',
    'btApp.publisher'
]).
config(['$stateProvider', '$urlRouterProvider', '$locationProvider', function($stateProvider, $urlRouterProvider, $locationProvider) {
    // For any unmatched url, redirect to /state1
    $urlRouterProvider.otherwise('/');

    // Now set up the states
    $stateProvider
        .state('home', {
            url: '/',
            templateUrl: 'partials/home.html'
        })
}])
.controller('HeaderController', ['$scope', '$location', function HeaderController($scope, $location) {
    $scope.isActive = function(viewLocation) {
        return viewLocation === $location.path();
    };
}]);
