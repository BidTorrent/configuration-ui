'use strict';

angular.module('btApp.publisher', ['ui.router', 'ngResource'])

.config(['$stateProvider', function($stateProvider) {
    $stateProvider
        .state('publisher', {
            url: '/publisher',
            templateUrl: 'partials/publisher.html',
            controller: 'PublisherCtrl'
        })
}])

.controller('PublisherCtrl', ['$scope', '$resource', function($scope, $resource) {

    //Resources
    var Publisher = $resource('/api/publishers/:publisherId', {publisherId:'@id'});

    //Models
    $scope.registerForm = {
        name: null,
        bidRequestUrl: null,
        pubKey: null
    };

    //Functions
    $scope.submitRegistration = function() {
        Publisher.save({}, { name: $scope.registerForm.name }).$promise
        .then(function() {
                alert("Successfully registered " + $scope.registerForm.name);
            },
            function(response) {
                if(response.status === 409) {
                    alert("This publisher " + $scope.registerForm.name + " is already registered");
                } else {
                    alert("Oops! something went wrong, try again later");
                }
            }
        );
    };
}]);
