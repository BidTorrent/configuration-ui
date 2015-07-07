'use strict';

angular.module('btApp.publisher', ['ui.router', 'ngResource'])

.config(['$stateProvider', function($stateProvider) {
    $stateProvider
        .state('publisher', {
            url: '/publisher/:publisherId',
            templateUrl: 'partials/publisher.html',
            controller: 'PublisherCtrl'
        })
}])

.controller('PublisherCtrl', ['$scope', '$q', '$resource', '$stateParams', 'ngNotify', 'smoothScroll', function($scope, $q, $resource, $stateParams, ngNotify, smoothScroll) {

    //Resources
    var Publisher = $resource(
        '/api/publishers/:publisherId',
        { publisherId:'@id' },
        {
            'get': { method:'GET' },
            'save':   { method:'POST' },
            'update': { method:'PUT' },
            'delete': { method:'DELETE' }
        });

    //Models
    $scope.defaultDomainFilter = { type: "domain", mode: false, value: [""], title: "Advertiser domains", placeholder: "www.adv1.fr" };
    $scope.defaultCategoryFilter = { type: "iab_category", mode: false, value: [""], title: "IAB catagories", placeholder: "IAB-23" };

    $scope.publisherId = $stateParams.publisherId;

    $scope.registerForm = {
        name: null //domain
    };

    $scope.staticConfigForm = {
        isTypeWebsite: true,
        name: undefined,
        country: undefined,
        timeout: undefined,
        secured: false,
        domainFilter: angular.copy($scope.defaultDomainFilter),
        categoryFilter: angular.copy($scope.defaultCategoryFilter),
        imp: [{ html_id: null, width: null, height: null, floor: null }]
    };

    $scope.dynConfigForm = {
        auction: null,
        bidders: null,
        config: null,
    }

    //Functions
    $scope.submitRegistration = function() {
        Publisher.save({ format: "ui" }, { name: $scope.registerForm.name }).$promise
        .then(function() {
                ngNotify.set("Successfully registered " + $scope.registerForm.name, "success");
            },
            function(response) {
                if(response.status === 409) {
                    ngNotify.set("This publisher " + $scope.registerForm.name + " is already registered", "error");
                } else {
                    ngNotify.set("Oops! something went wrong, try again later", "error");
                }
            }
        );
    };

    $scope.downloadConfig = function(element) {
        var app;
        var website;

        var globalConfig = {
            publisher: {
                id: hashCode($scope.staticConfigForm.name),
                name: $scope.staticConfigForm.name,
                country: $scope.staticConfigForm.country
            }
        };

        if ($scope.staticConfigForm.isTypeWebsite)
            website = globalConfig;
        else
            app = globalConfig;

        var config = {
            app: app,
            site: website,
            badv: $scope.staticConfigForm.blacklistedDomains ? $scope.staticConfigForm.blacklistedDomains.split(";") : [],
            bcat: $scope.staticConfigForm.blacklistedCategories ? $scope.staticConfigForm.blacklistedCategories.split(";") : [],
            cur: $scope.staticConfigForm.currency,
            imp: {
                banner: {

                },
                //bidFloor: $scope.staticConfigForm.floor,
                secure: $scope.staticConfigForm.secured
            },
            timeout: $scope.staticConfigForm.timeout
        };

        var json = "text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(config));
        var element = document.getElementById('downloadFile');
        element.setAttribute("href", "data:" + json);
        element.setAttribute("download", "data.json");
        element.click();
    };

    $scope.loadConfig = function() {
        var deferred = $q.defer();

        if (!$scope.publisherId) {
            deferred.reject("Enter an id to load the configuration", "error");
            return deferred.promise;
        }

        Publisher.get({ publisherId: $scope.publisherId , format: "ui" }).$promise.then(
            function(response) {
                var domainFilter = getFilter(response.filters, angular.copy($scope.defaultDomainFilter));
                var categoryFilter = getFilter(response.filters, angular.copy($scope.defaultCategoryFilter));

                $scope.staticConfigForm = {
                    isTypeWebsite: response.type == "website",
                    name: response.name,
                    country: response.country,
                    timeout: response.timeout,
                    secured: response.secured,
                    domainFilter: domainFilter,
                    categoryFilter: categoryFilter,
                    imp: response.imp
                };
                $scope.publisherId = response.id;
            },
            function(response) {
                if(response.status === 404) {
                    ngNotify.set("Unknown publisher " + $scope.publisherId, "error");
                } else {
                    ngNotify.set("Oops! something went wrong, try again later", "error");
                }
            }
        );
        return deferred.promise;
    };

    $scope.scrollToScript = function() {
        var generatedScript = document.getElementById('generatedScript');
        smoothScroll(generatedScript);
    }

    $scope.saveConfig = function(element) {
        // hide modal
        //$('#loginModal').modal('hide');

        var filters = new Array();
        validateAndAddFilter(filters, $scope.staticConfigForm.domainFilter);
        validateAndAddFilter(filters, $scope.staticConfigForm.categoryFilter);

        var imp = angular.copy($scope.staticConfigForm.imp);
        imp = imp.cleanArray(["", null, undefined]);

        var publisher = {
            name: $scope.staticConfigForm.name,
            type: $scope.staticConfigForm.isTypeWebsite ? "website" : "inapp",
            country: $scope.staticConfigForm.country,
            timeout: $scope.staticConfigForm.timeout,
            secured: $scope.staticConfigForm.secured,
            filters: filters,
            imp: imp
        };

        // save the configuration
        if ($scope.publisherId) {
            Publisher.update({ publisherId: $scope.publisherId , format: "ui" }, publisher).$promise
            .then(function() {
                    ngNotify.set("Successfully updated config for " + $scope.staticConfigForm.name, "success");
                    $scope.scrollToScript();
                },
                function(response) {
                    if (response.status === 404) {
                        ngNotify.set("Publisher " + $scope.staticConfigForm.name + " was not found", "error");
                    } else {
                        ngNotify.set("Oops! something went wrong, try again later", "error");
                    }
                }
            );
        }
        else {
            Publisher.save({ format: "ui" }, publisher).$promise
            .then(function() {
                    ngNotify.set("Successfully saved config on BidTorrent.io", "success");
                    $scope.scrollToScript();
                },
                function(response) {
                    if (response.status === 409) {
                        ngNotify.set("This publisher " + $scope.staticConfigForm.name + " is already registered", "error");
                    } else {
                        ngNotify.set("Oops! something went wrong, try again later", "error");
                    }
                }
            );
        }
    }

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

    $scope.isVirtuallyEmpty = function(array) {
        for (var i = 0; i < array.length; i++) {
            if (array[i] !== "" && array[i] !== null && array[i] !== undefined)
                return true
        }
        return false;
    }

    // Validation methods
    $scope.isStrictPositiveInt = function(value) {
        return !isNaN(value) &&
               parseInt(Number(value)) == value &&
               !isNaN(parseInt(value, 10)) &&
               value > 0;
    }

    var hashCode = function(str) {
        var hash = 0;
        if (!str || str.length == 0) return hash;
        for (var i = 0; i < str.length; i++) {
            var char = str.charCodeAt(i);
            hash = ((hash<<5)-hash)+char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return hash;
    };

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

    $scope.loadConfig().finally(
    function(response) {
        return; // TODO: end loader if there is a loader
    });
}]);
