'use strict';

var btApp = angular.module('btApp', [
    'templates-release',
    'ui.router',
    'ngNotify',
    'ngSanitize',
    'LocalStorageModule',
    'smoothScroll',
    'btApp.bidder',
    'btApp.publisher',
    'btApp.publisherStats',
    'btApp.widgets.phloader'
])
.config(['$stateProvider', '$urlRouterProvider', '$locationProvider', 'localStorageServiceProvider', function($stateProvider, $urlRouterProvider, $locationProvider, localStorageServiceProvider) {
    $locationProvider.html5Mode({
        enabled: true,
        requireBase: false
    });

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
.controller('NavbarCtrl', ['$scope', '$http', 'ngNotify', 'UserService', function ($scope, $http, ngNotify, UserService) {
    $scope.userConnected = UserService.isConnected;
    $scope.myBiddersLoading = true;
    $scope.myPublishersLoading = true;

    var loadBidders = function () {
        return $http.get('/api/mybidders').then(function(listBidders) {
            $scope.listBidders = listBidders.data;
        }, function(error) {
            ngNotify.set("Cannot load the list of bidders linked to your account", "error");
        });
    };

    var loadPublishers = function () {
        return $http.get('/api/mypublishers').then(function(listPublishers) {
            $scope.listPublishers = listPublishers.data;
        }, function(error) {
            ngNotify.set("Cannot load the list of publishers linked to your account", "error");
        });
    };

    var loadAccounts = function () {
        loadBidders().finally(function() {
            $scope.myBiddersLoading = false;
        });
        loadPublishers().finally(function() {
            $scope.myPublishersLoading = false;
        });
    };

    // if the user is connected load his accounts
    if (UserService.isConnected) {
        loadAccounts();
    }
}])
.factory('UserService', ['$rootScope', '$http', 'localStorageService', 'ngNotify', function($rootScope, $http, localStorageService, ngNotify) {
    var currentAccount = localStorageService.get('gitkit::currentAccount');

    var UserService = {};
    UserService.isConnected = !!currentAccount;
    UserService.getName = function() {
        if(currentAccount)
            return currentAccount.displayName;
        return null;
    }

    return UserService;
}])
.run(['$rootScope', '$state', 'ngNotify', function($rootScope, $state, ngNotify) {
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

    // initialise gitkit
    $rootScope.$on('$stateChangeSuccess',
    function(event, toState, toParams, fromState, fromParams) {
        // remove previous login button
        var div = document.getElementById("navbar-login");
        div.innerHTML = "";

        // add new login button with correct url
        window.google.identitytoolkit.signInButton(
            '#navbar-login', // accepts any CSS selector
            {
              widgetUrl: "/api/gitkit.php?signInSuccessUrl=" + ($state.href(toState.name, toParams) || "/"),
              signOutUrl: "/",
              popupMode: true
            }
        );

		// hide the menu
		$("#navbar-collapse").collapse('hide');
    });


}]);
