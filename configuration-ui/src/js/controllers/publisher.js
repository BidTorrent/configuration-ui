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

    $scope.configurationForm = {
        type: undefined,
        domain: undefined,
        country: undefined,
        currency: undefined,
        timeout: undefined,
        width: undefined,
        height: undefined,
        floor: undefined,
        secured: undefined,
        blacklistedDomains: undefined,
        blacklistedCategories: undefined
    };

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
            domain: $scope.configurationForm.domain,
            publisher: {
                id: hashCode($scope.configurationForm.domain),
                name: $scope.configurationForm.domain,
                country: $scope.configurationForm.country
            }
        };

        if ($scope.configurationForm.type == "inapp")
            app = globalConfig;
        else
            website = globalConfig;

        var config = {
            app: app,
            site: website,
            badv: $scope.configurationForm.blacklistedDomains ? $scope.configurationForm.blacklistedDomains.split(";") : [],
            bcat: $scope.configurationForm.blacklistedCategories ? $scope.configurationForm.blacklistedCategories.split(";") : [],
            cur: $scope.configurationForm.currency,
            imp: {
                banner: {

                },
                bidFloor: $scope.configurationForm.floor,
                secure: $scope.configurationForm.secured
            },
            timeout: $scope.configurationForm.timeout
        };

        var json = "text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(config));
        var element = document.getElementById('downloadFile');
        element.setAttribute("href", "data:" + json);
        element.setAttribute("download", "data.json");
        element.click();
    };

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
