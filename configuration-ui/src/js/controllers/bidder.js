'use strict';

angular.module('btApp.bidder', ['ui.router', 'ngResource'])

.config(['$stateProvider', function($stateProvider) {
    $stateProvider
        .state('bidder', {
            url: '/bidder',
            templateUrl: 'partials/bidder.html',
            controller: 'BidderCtrl'
        })
}])

.controller('BidderCtrl', ['$scope', '$resource', 'ngNotify', function($scope, $resource, ngNotify) {

    //Resources
    var Bidder = $resource('/api/bidders/:bidderId', {bidderId:'@id'});

    //Models
    $scope.registerForm = {
        name: null,
        bidRequestUrl: null,
        pubKey: null,
        userCountriesfilterMode: "except",
        userCountriesfilterValue: undefined,
        publisherCountriesfilterMode: "except",
        publisherCountriesfilterValue: undefined,
        categoriesfilterMode: "except",
        categoriesfilterValue: undefined
    };

    //Functions
    $scope.submitRegistration = function() {
        Bidder.save({ format: "ui" }, {
            name: $scope.registerForm.name,
            bidUrl: $scope.registerForm.bidRequestUrl,
            rsaPubKey: $scope.registerForm.pubKey
        }).$promise
        .then(function() {
                ngNotify.set("Successfully registered " + $scope.registerForm.name, "success");
            },
            function(response) {
                if(response.status === 409) {
                    ngNotify.set("This bidder" + $scope.registerForm.name + " is already registered", "error");
                } else {
                    ngNotify.set("Oops! something went wrong, try again later", "error");
                }
            }
        );
    };
}]);
