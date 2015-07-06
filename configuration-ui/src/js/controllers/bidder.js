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
        filters: [
            { type: "user_country", modeBool: false, value: [""], title: "User countries", placeholder: "FR" },
            { type: "publisher_country", modeBool: false, value: [""], title: "Publisher countries", placeholder: "ES" },
            { type: "iab_category", modeBool: false, value: [""], title: "IAB Categories", placeholder: "IAB25-3" }
        ]
    };

    //Functions
    $scope.submitRegistration = function() {
        // Keep only needed fields in filters
        var filters = $scope.registerForm.filters.slice();
        for (var i = filters.length - 1; i >= 0; i--) {
            var value = filters[i].value.cleanArray(["", null, undefined]);

            if (!filters[i].modeBool && value.length == 0)
                filters[i] = undefined;
            else {
                filters[i] = {
                    type: filters[i].type,
                    value: value,
                    mode: filters[i].modeBool ? "inclusive" : "exclusive"
                };
            }
        };
        filters.cleanArray([undefined]);

        Bidder.save({ format: "ui" }, {
            name: $scope.registerForm.name,
            bidUrl: $scope.registerForm.bidRequestUrl,
            rsaPubKey: $scope.registerForm.pubKey,
            filters: filters
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

    Array.prototype.cleanArray = function(deleteValues) {
    for (var i = 0; i < this.length; i++) {
        if (deleteValues.indexOf(this[i]) !== -1) {
            this.splice(i, 1);
                i--;
            }
        }
        return this;
    };
}]);
