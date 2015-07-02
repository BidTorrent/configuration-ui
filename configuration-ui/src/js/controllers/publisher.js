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

.controller('PublisherCtrl', ['$scope', '$resource', 'ngNotify', function($scope, $resource, ngNotify) {

    //Resources
    var Publisher = $resource('/api/publishers/:publisherId', {publisherId:'@id'});

    //Models
    $scope.registerForm = {
        name: null,
        bidRequestUrl: null,
        pubKey: null
    };

    $scope.staticConfigForm = {
        type: undefined,
        domain: undefined,
        country: undefined,
        currency: undefined,
        timeout: undefined,
        //width: undefined,
        //height: undefined,
        //floor: undefined,
        secured: undefined,
        blacklistedDomains: undefined,
        blacklistedCategories: undefined
    };

    $scope.dynConfigForm = {
        auction: null,
        bidders: null,
        config: null,
        slots: [{ element: null, width: null, height: null, floor: null }]
    }

    //Functions
    $scope.submitRegistration = function() {
        Publisher.save({}, { name: $scope.registerForm.name }).$promise
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

        if ($scope.staticConfigForm.type == "inapp")
            app = globalConfig;
        else
            website = globalConfig;

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

    // Validation methods
    $scope.isStrictPositiveInt = function(value) {
        return !isNaN(value) &&
               parseInt(Number(value)) == value &&
               !isNaN(parseInt(value, 10)) &&
               value > 0;
    }

    var hashCode = function(str){
        var hash = 0;
        if (!str || str.length == 0) return hash;
        for (var i = 0; i < str.length; i++) {
            var char = str.charCodeAt(i);
            hash = ((hash<<5)-hash)+char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return hash;
    };
}]);
