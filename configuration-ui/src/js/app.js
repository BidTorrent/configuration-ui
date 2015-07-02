'use strict';

var btApp = angular.module('btApp', [
    'ui.router',
    'oauth',
    'ngNotify',
    'smoothScroll',
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
}])
.run(['ngNotify', function(ngNotify) {
    // Navbar configuration
    $(".navbar-fixed-top").autoHidingNavbar({
        // see specifications here : https://github.com/istvan-ujjmeszaros/bootstrap-autohidingnavbar
    });

    //NgNotify configuration
    ngNotify.config({
        theme: 'pure',
        position: 'bottom',
        duration: 3000,
        type: 'info',
        sticky: false,
        html: false
    });
}]);
