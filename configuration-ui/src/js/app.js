'use strict';

var btApp = angular.module('btApp', [
    'ui.router',
    'oauth',
    'ngNotify',
    'smoothScroll',
    'btApp.bidder',
    'btApp.publisher'
])
.config(['$stateProvider', '$urlRouterProvider', '$locationProvider', function($stateProvider, $urlRouterProvider, $locationProvider) {
    // For any unmatched url, redirect to /state1
    $urlRouterProvider.otherwise('/');

    // Now set up the states
    $stateProvider
        .state('home', {
            url: '/',
            templateUrl: 'partials/home.html'
        })
}])
.controller('loginController', ['$scope', '$rootScope', '$state', '$stateParams', function HeaderController($scope, $rootScope, $state, $stateParams) {
    $scope.login = function() {
        $rootScope.userId = angular.copy($scope.modalUserId);

        // hide modal
        $('#loginModal').modal('hide');
    };
}])
.run(['$rootScope', 'ngNotify', function($rootScope, ngNotify) {
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

    $rootScope.userId = null;
}]);
