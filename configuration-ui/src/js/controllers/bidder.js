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

.controller('BidderCtrl', ['$scope', '$resource', function($scope, $resource) {

    //Resources
    var Bidder = $resource('/api/bidders/:bidderId', {bidderId:'@id'});

    //Models
    $scope.registerForm = {
        name: null,
        bidRequestUrl: null,
        pubKey: null
    };

    //Functions
    $scope.submitRegistration = function() {
        Bidder.save({}, {
            name: $scope.registerForm.name,
            bidUrl: $scope.registerForm.bidRequestUrl,
            rsaPubKey: $scope.registerForm.pubKey}
        ).$promise
        .then(function() {
                alert("Successfully registered " + $scope.registerForm.name);
            },
            function(response) {
                if(response.status === 409) {
                    alert("This bidder" + $scope.registerForm.name + " is already registered");
                } else {
                    alert("Oops! something went wrong, try again later");
                }
            }
        );
    };
}]);
