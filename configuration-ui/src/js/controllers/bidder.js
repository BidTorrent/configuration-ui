'use strict';

angular.module('btApp.bidder', ['ui.router', 'ngResource'])

.config(['$stateProvider', '$urlRouterProvider', function($stateProvider, $urlRouterProvider) {
    $stateProvider
        .state('bidder', {
            url: '/bidder/:bidderId',
            templateUrl: '/partials/bidder.html',
            controller: 'BidderCtrl'
        })

    $urlRouterProvider.when('/bidder', '/bidder/');
}])

.run(['$rootScope', '$stateParams', '$state', function($rootScope, $stateParams, $state) {
    $rootScope.$on('$stateChangeStart',
    function(evt, toState, toParams, fromState, fromParams) {
        if (toState.name == 'bidder')
            if (($stateParams.bidderId == null || angular.isUndefined($stateParams.bidderId)) &&
                !($rootScope.userId == null ||  angular.isUndefined($rootScope.userId))) {
                evt.preventDefault();
                $stateParams.bidderId = $rootScope.userId;
                $state.transitionTo('bidder', { bidderId : $rootScope.userId });
            }
    });
}])

.controller('BidderCtrl', ['$scope', '$q', '$resource', '$stateParams', '$state', 'ngNotify', 'smoothScroll', function($scope, $q, $resource, $stateParams, $state, ngNotify, smoothScroll) {
    //Resources
    var Bidder = $resource(
        'api/bidders/:bidderId',
        { bidderId:'@id' },
        {
            'get': { method:'GET' },
            'save':   { method:'POST' },
            'update': { method:'PUT' },
            'delete': { method:'DELETE' }
        }
    );

    //Models
    $scope.bidderId = $stateParams.bidderId;

    $scope.defaultCategoryFilter =
    {
        type: "iab_category",
        modeBool: false,
        value: [""],
        title: "IAB categories",
        placeholder: "IAB-23",
        link: { title: "see OpenRTB specs", href: "http://www.iab.net/media/file/OpenRTB_API_Specification_Version2.0_FINAL.PDF" }
    };
    $scope.defaultUserCountryFilter =
    {
        type: "user_country",
        modeBool: false,
        value: [""],
        title: "User countries",
        placeholder: "FR",
        link: { title: "ISO 3166-2", href: "https://www.iso.org/obp/ui/#search"}
    };
    $scope.defaultPubCountryFilter =
    {
        type: "publisher_country",
        modeBool: false,
        value: [""],
        title: "Publisher countries",
        placeholder: "ES",
        link: { title: "ISO 3166-2", href: "https://www.iso.org/obp/ui/#search"}
    };
    $scope.configForm = {
        name: null,
        bidRequestUrl: null,
        pubKey: null,
        userCountryFilter: angular.copy($scope.defaultUserCountryFilter),
        pubCountryFilter: angular.copy($scope.defaultPubCountryFilter),
        categoryFilter: angular.copy($scope.defaultCategoryFilter)
    };

    //Functions
    $scope.loadConfig = function() {
        var deferred = $q.defer();

        if (!$scope.bidderId) {
            deferred.reject("Enter an id to load the configuration", "error");
            return deferred.promise;
        }
        Bidder.get({ bidderId: $scope.bidderId , format: "ui" }).$promise.then(
            function(response) {
                var userCountryFilter = getFilter(response.filters, angular.copy($scope.defaultUserCountryFilter));
                var pubCountryFilter = getFilter(response.filters, angular.copy($scope.defaultPubCountryFilter));
                var categoryFilter = getFilter(response.filters, angular.copy($scope.defaultCategoryFilter));

                $scope.configForm = {
                    name: response.name,
                    bidRequestUrl: response.bidUrl,
                    pubKey: response.rsaPubKey,
                    userCountryFilter: userCountryFilter,
                    pubCountryFilter: pubCountryFilter,
                    categoryFilter : categoryFilter
                };
                deferred.resolve(response);
            },
            function(response) {
                if(response.status === 404) {
                    deferred.reject("Unknown bidder " + $scope.bidderId);
                    ngNotify.set("Unknown bidder " + $scope.bidderId, "error");
                } else {
                    deferred.reject("Oops! something went wrong, try again later");
                    ngNotify.set("Oops! something went wrong, try again later", "error");
                }
            }
        );
        return deferred.promise;
    };

    $scope.submit = function() {
        if (!$scope.configForm.name) {
            ngNotify.set("Enter a name", "error");
            $scope.scrollToGlobalInfo();
            return;
        }

        if (!$scope.validUrl($scope.configForm.bidRequestUrl)) {
            ngNotify.set("Enter a valid bid request URL", "error");
            $scope.scrollToGlobalInfo();
            return;
        }

        if (!$scope.configForm.pubKey) {
            ngNotify.set("Enter a RSA public key", "error");
            $scope.scrollToGlobalInfo();
            return;
        }

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

        if ($scope.bidderId) {
            Bidder.update({ bidderId: $scope.bidderId , format: "ui" }, bidder).$promise
            .then(function() {
                    ngNotify.set("Successfully updated " + $scope.configForm.name, "success");
                },
                function(response) {
                    if (response.status === 404) {
                        ngNotify.set("Bidder " + $scope.configForm.name + " was not found", "error");
                    } else if (response.status === 401) {
                        ngNotify.set("You have to login in order to perform this action", "error");
                    } else if (response.status === 403) {
                        ngNotify.set("You are not allowed to perform this action", "error");
                    } else {
                        ngNotify.set("Oops! something went wrong, try again later", "error");
                    }
                }
            );
        }
        else {
            Bidder.save({ format: "ui" }, bidder).$promise
            .then(function() {
                    $state.go('bidder', { bidderId: response.id});
                    ngNotify.set("Successfully registered " + $scope.configForm.name, "success");
                },
                function(response) {
                    if (response.status === 409) {
                        ngNotify.set("This bidder " + $scope.configForm.name + " is already registered", "error");
                    } else if (response.status === 401) {
                        ngNotify.set("You have to login in order to perform this action", "error");
                    } else if (response.status === 403) {
                        ngNotify.set("You are not allowed to perform this action", "error");
                    } else {
                        ngNotify.set("Oops! something went wrong, try again later", "error");
                    }
                }
            );
        }
    };

    var validateAndAddFilter = function(filters, filter) {
        // Remove empty values
		arrayClean(filter.value, ["", null, undefined]);

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

    var arrayClean = function (array, deleteValues) {
        for (var i = 0; i < array.length; i++) {
            if (deleteValues.indexOf(array[i]) !== -1) {
                array.splice(i, 1);
                i--;
            }
        }
    };

    $scope.loadConfig().finally(
    function(response) {
        return; // TODO: end loader if there is a loader
    });

    // Validation
    $scope.validUrl = function(url) {
        if (!url)
            return false;

        var expression = 'https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}';
        var regex = new RegExp(expression);
        if (url.match(regex))
           return true;
        return false;
    };

    $scope.scrollToGlobalInfo = function() {
        var element = document.getElementById('globalInfo');
        smoothScroll(element);
    }
}]);
