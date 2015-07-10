'use strict';

var btApp = angular.module('btApp', [
    'ui.router',
    'ngNotify',
    'LocalStorageModule',
    'smoothScroll',
    'btApp.bidder',
    'btApp.publisher'
])
.config(['$stateProvider', '$urlRouterProvider', '$locationProvider', 'localStorageServiceProvider', function($stateProvider, $urlRouterProvider, $locationProvider, localStorageServiceProvider) {
/*    $locationProvider.html5Mode({
        enabled: true,
        requireBase: false
    });
*/
    // For any unmatched url, redirect to /state1
    $urlRouterProvider.otherwise('/');

    // Now set up the states
    $stateProvider
        .state('home', {
            url: '/',
            templateUrl: 'partials/home.html'
        })

    // remove prefix of localStorageService
    localStorageServiceProvider.setPrefix("");
}])
.controller('NavbarCtrl', ['$scope', 'UserService', function HeaderController($scope, UserService) {
    $scope.bidderList = UserService.bidderList;
    $scope.publisherList = UserService.publisherList;
}])
.factory('UserService', ['$rootScope', 'localStorageService', function($rootScope, localStorageService) {
    var currentAccount = localStorageService.get('gitkit::currentAccount');

    var User = {};
    User.isConnected = !!currentAccount;
    User.getName = function() {
        if(currentAccount)
            return currentAccount.displayName;
        return null;
    }
    User.bidderList = [{id: 4563, name: "loulou"}, {id: 3454, name: "lili"}]; //TODO
    User.publisherList = [{id: 4962, name: "momo"}]; //TODO

    return User;
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
