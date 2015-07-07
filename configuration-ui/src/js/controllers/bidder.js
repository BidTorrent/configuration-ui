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
    $scope.configForm = {
        id: null,
        name: null,
        bidRequestUrl: null,
        pubKey: null,
        userCountryFilter: { type: "user_country", mode: false, value: [""], title: "User countries", placeholder: "FR" },
        pubCountryFilter: { type: "publisher_country", mode: false, value: [""], title: "Publisher countries", placeholder: "ES" },
        categoryFilter: { type: "iab_category", modeBool: false, value: [""], title: "IAB Categories", placeholder: "IAB25-3" }
    };

    //Functions
    $scope.loadConfig = function() {
        if (!$scope.loadForm.id) {
            ngNotify.set("Enter an id to load the configuration", "error");
        }
        else {
            Bidder.get({ bidderId: $scope.loadForm.id , format: "ui" }).$promise.then(
                function(response) {
                    var userCountryFilter = getFilter(response.filters, $scope.configForm.userCountryFilter);
                    var pubCountryFilter = getFilter(response.filters, $scope.configForm.pubCountryFilter);
                    var categoryFilter = getFilter(response.filters, $scope.configForm.categoryFilter);

                    $scope.configForm = {
                        id: response.id,
                        name: response.name,
                        bidRequestUrl: response.bidUrl,
                        pubKey: response.rsaPubKey,
                        userCountryFilter: userCountryFilter,
                        pubCountryFilter: pubCountryFilter,
                        categoryFilter : categoryFilter
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
        var filters = new Array();
        validateAndAddFilter(filters, $scope.configForm.userCountryFilter);
        validateAndAddFilter(filters, $scope.configForm.pubCountryFilter);
        validateAndAddFilter(filters, $scope.configForm.categoryFilter);

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

    var validateAndAddFilter = function(filters, filter) {
        // Remove empty values
        filter.value.cleanArray(["", null, undefined]);

        if (!filter.mode && filter.value.length == 0)
            return;

        var newFilter = {
            type: filter.type,
            mode: filter.mode ? "inclusive" : "exclusive",
            value: filter.value
        };

        filters.push(newFilter);
    }

    var getFilter = function(responseFilters, defaultFilter) {
        var filters = $.grep(responseFilters || [], function(filter) {
            return filter.type == defaultFilter.type;
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
