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

.controller('PublisherCtrl', ['$scope', '$resource', 'ngNotify', 'smoothScroll', function($scope, $resource, ngNotify, smoothScroll) {

    //Resources
    var Publisher = $resource('/api/publishers/:publisherId', {publisherId:'@id'});

    //Models
    $scope.registerForm = {
        name: null, //domain
        bidRequestUrl: null,
        pubKey: null
    };

    $scope.staticConfigForm = {
        isTypeWebsite: true,
        country: undefined,
        timeout: undefined,
        secured: false,
        domainFilter: { type: "domain", mode: false, value: [""] },
        categoryFilter: { type: "iab_category", mode: false, value: [""] },
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
            domain: $scope.staticConfigForm.domain,
            publisher: {
                id: hashCode($scope.staticConfigForm.domain),
                name: $scope.staticConfigForm.domain,
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

    $scope.scrollToScript = function() {
        var generatedScript = document.getElementById('generatedScript');
        smoothScroll(generatedScript);
    }

    $scope.saveConfig = function(element) {
        // hide modal
        $('#loginModal').modal('hide');

        var domainFilter = angular.copy($scope.staticConfigForm.domainFilter);
        domainFilter.mode = domainFilter.mode ? "inclusive" : "exclusive";

        var categoryFilter = angular.copy($scope.staticConfigForm.categoryFilter);
        categoryFilter.mode = categoryFilter.mode ? "inclusive" : "exclusive";

        var imp = angular.copy($scope.staticConfigForm.imp);

        // remove empty values in filter array
        domainFilter.value = domainFilter.value.cleanArray(["", null, undefined]);
        categoryFilter.value = categoryFilter.value.cleanArray(["", null, undefined]);
        imp = imp.cleanArray(["", null, undefined]);

        // save the configuration
        Publisher.save({ format: "ui" }, {
            name: $scope.registerForm.name,
            type: $scope.staticConfigForm.isTypeWebsite ? "website" : "inapp",
            country: $scope.staticConfigForm.country,
            timeout: $scope.staticConfigForm.timeout,
            secured: $scope.staticConfigForm.secured,
            filters: [domainFilter, categoryFilter],
            imp: imp
        }).$promise
        .then(function() {
                ngNotify.set("Successfully saved config on BidTorrent.io", "success");
                $scope.scrollToScript();
            },
            function(response) {
                ngNotify.set("Oops! something went wrong, try again later", "error");
            }
        );
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
