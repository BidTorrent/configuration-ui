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
    var Bidder = $resource(
        '/api/bidders/:bidderId',
        { bidderId:'@id' },
        {
            'get': { method:'GET' },
            'save':   { method:'POST' },
            'update': { method:'PUT' },
            'delete': { method:'DELETE' }
        }
    );

    //Models
    $scope.loadForm = {
        id: undefined
    };
    $scope.filters = {
        user_country: { type: "user_country", modeBool: false, value: [""], title: "User countries", placeholder: "FR" },
        publisher_country: { type: "publisher_country", modeBool: false, value: [""], title: "Publisher countries", placeholder: "ES" },
        iab_category: { type: "iab_category", modeBool: false, value: [""], title: "IAB Categories", placeholder: "IAB25-3" }
    };
    $scope.configForm = {
        id: null,
        name: null,
        bidRequestUrl: null,
        pubKey: null,
        filters: $scope.filters
    };

    //Functions
    $scope.loadConfig = function() {
        if (!$scope.loadForm.id) {
            ngNotify.set("Enter an id to load the configuration", "error");
        }
        else {
            Bidder.get({ bidderId: $scope.loadForm.id , format: "ui" }).$promise.then(
                function(response) {
                    var filters = new Array();
                    filters.push(getFilter(response.filters, "user_country", $scope.filters.user_country));
                    filters.push(getFilter(response.filters, "publisher_country", $scope.filters.publisher_country));
                    filters.push(getFilter(response.filters, "iab_category", $scope.filters.iab_category));

                    $scope.configForm = {
                        id: response.id,
                        name: response.name,
                        bidRequestUrl: response.bidUrl,
                        pubKey: response.rsaPubKey,
                        filters: filters
                    };
                },
                function(response) {
                    if(response.status === 404) {
                        ngNotify.set("Unknown bidder " + $scope.loadForm.id, "error");
                    } else {
                        ngNotify.set("Oops! something went wrong, try again later", "error");
                    }
                }
            );
        }
    };

    $scope.submit = function() {
        // Keep only needed fields in filters
        var filters = $scope.configForm.filters.slice();
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

        var bidder = {
            name: $scope.configForm.name,
            bidUrl: $scope.configForm.bidRequestUrl,
            rsaPubKey: $scope.configForm.pubKey,
            filters: filters
        };

        if ($scope.configForm.id) {
            Bidder.update({ bidderId: $scope.loadForm.id , format: "ui" }, bidder).$promise
            .then(function() {
                    ngNotify.set("Successfully updated " + $scope.configForm.name, "success");
                },
                function(response) {
                    if (response.status === 404) {
                        ngNotify.set("Bidder " + $scope.configForm.name + " was not found", "error");
                    } else {
                        ngNotify.set("Oops! something went wrong, try again later", "error");
                    }
                }
            );
        }
        else {
            Bidder.save({ format: "ui" }, bidder).$promise
            .then(function() {
                    ngNotify.set("Successfully registered " + $scope.configForm.name, "success");
                },
                function(response) {
                    if (response.status === 409) {
                        ngNotify.set("This bidder" + $scope.configForm.name + " is already registered", "error");
                    } else {
                        ngNotify.set("Oops! something went wrong, try again later", "error");
                    }
                }
            );
        }
    };

    var getFilter = function(responseFilters, filterType, defaultFilter) {
        var filters = $.grep(responseFilters, function(filter) {
            return filter.type == filterType;
        });

        if (filters.length == 0)
            return defaultFilter;
        
        var filter = filters[0];
        filter.placeholder = defaultFilter.placeholder;
        filter.title = defaultFilter.title;
        if (filter.mode == "inclusive")
            filter.modeBool = true;
        else
            filter.modeBool = false;
        if (!filter.value)
            filter.value = defaultFilter.value;

        return filter;
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
