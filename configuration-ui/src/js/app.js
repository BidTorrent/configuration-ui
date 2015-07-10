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
    $scope.listBidders = [];
    // Get the list of bidders
    UserService.getListBidders.then(function(listBidders) {
        $scope.listBidders = listBidders.data;
    }, function(error) {
        ngNotify.set("Cannot load the list of bidders linked to your account", "error");
    });

    $scope.publisherList = [];
    //Get the list of publishers
    UserService.getListPublishers.then(function(listPublishers) {
        $scope.listPublishers = listPublishers.data;
    }, function(error) {
        ngNotify.set("Cannot load the list of publishers linked to your account", "error");
    });

    $scope.userConnected = UserService.isConnected;
}])
.factory('UserService', ['$rootScope', '$http', 'localStorageService', 'ngNotify', function($rootScope, $http, localStorageService, ngNotify) {
    var currentAccount = localStorageService.get('gitkit::currentAccount');

    var User = {};
    User.isConnected = !!currentAccount;
    User.getName = function() {
        if(currentAccount)
            return currentAccount.displayName;
        return null;
    }

    User.getListBidders = $http.get('http://bin.bidtorrent.io/api/mybidders');

    User.getListPublishers = $http.get('http://bin.bidtorrent.io/api/mypublishers');

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
