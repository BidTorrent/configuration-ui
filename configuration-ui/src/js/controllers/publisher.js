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

.run(['$rootScope', '$stateParams', '$state', function($rootScope, $stateParams, $state) {
    $rootScope.$on('$stateChangeStart',
    function(evt, toState, toParams, fromState, fromParams) {
        if (toState.name == 'publisher')
            if (($stateParams.publisherId == null || angular.isUndefined($stateParams.publisherId)) &&
                !($rootScope.userId == null ||  angular.isUndefined($rootScope.userId))) {
                evt.preventDefault();
                $stateParams.publisherId = $rootScope.userId;
                $state.transitionTo('publisher', { publisherId : $rootScope.userId });
            }
    });
}])

.controller('PublisherCtrl', ['$scope', '$q', '$resource', '$stateParams', '$state', 'ngNotify', 'smoothScroll', function($scope, $q, $resource, $stateParams, $state, ngNotify, smoothScroll) {

    //Resources
    var Publisher = $resource(
        'api/publishers/:publisherId',
        { publisherId:'@id' },
        {
            'get': { method:'GET' },
            'save':   { method:'POST' },
            'update': { method:'PUT' },
            'delete': { method:'DELETE' }
        });

    //Models
    $scope.defaultDomainFilter = { type: "domain", mode: false, value: [""], title: "Advertiser domains", placeholder: "www.adv1.fr" };
    $scope.defaultCategoryFilter =
    {
        type: "iab_category",
        mode: false,
        value: [""],
        title: "IAB categories",
        placeholder: "IAB-23",
        link: { title: "see OpenRTB specs", href: "http://www.iab.net/media/file/OpenRTB_API_Specification_Version2.0_FINAL.PDF" }
    };

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
        imp: [{ html_id: null, width: null, height: null, floor: null }],
        hostConfig: false,
        hostClient: true,
        hostBidders: true,
		hostImp: true
    };

    //Functions
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
                    imp: response.imp,
                    hostConfig: response.hostConfig,
                    hostBidders: response.biddersUrl === null,
                    biddersUrl: response.biddersUrl || '',
                    hostClient: response.clientUrl === null,
                    clientUrl: response.clientUrl || '',
					hostImp: response.impUrl === null,
					impUrl: response.impUrl || ''
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

    $scope.saveConfig = function() {
        // hide modal
        //$('#loginModal').modal('hide');

        if (!$scope.staticConfigForm.name) {
            ngNotify.set("Enter a name", "error");
            $scope.scrollToGlobalInfo();
            return;
        }

        if ($scope.staticConfigForm.timeout && !$scope.isStrictPositiveInt($scope.staticConfigForm.timeout)) {
            ngNotify.set("Timeout should be positive", "error");
            $scope.scrollToGlobalInfo();
            return;
        }

        var filters = new Array();
        validateAndAddFilter(filters, $scope.staticConfigForm.domainFilter);
        validateAndAddFilter(filters, $scope.staticConfigForm.categoryFilter);

        var imp = angular.copy($scope.staticConfigForm.imp);
        for (var i = 0; i < imp.length; ++i)
            objectClean(imp[i], ["", null, undefined]);

        if (!$scope.impIsFilled(imp)) {
            ngNotify.set("You need to set up at leat one impression", "error");
            $scope.scrollToImp();
            return;
        }

        if (!$scope.impAreValid(imp)) {
            ngNotify.set("One of your impressions is not valid", "error");
            $scope.scrollToImp();
            return;
        }

        var publisher = {
            name: $scope.staticConfigForm.name,
            type: $scope.staticConfigForm.isTypeWebsite ? "website" : "inapp",
            country: $scope.staticConfigForm.country ? $scope.staticConfigForm.country : undefined,
            timeout: $scope.staticConfigForm.timeout ? $scope.staticConfigForm.timeout : undefined,
            secured: $scope.staticConfigForm.secured,
            filters: filters,
            imp: imp,
            hostConfig: $scope.staticConfigForm.hostConfig,
            biddersUrl: $scope.staticConfigForm.hostBidders ? null : $scope.staticConfigForm.biddersUrl,
            clientUrl: $scope.staticConfigForm.hostClient ? null : $scope.staticConfigForm.clientUrl,
			impUrl: $scope.staticConfigForm.hostImp ? null : $scope.staticConfigForm.impUrl
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
            Publisher.save({ format: "ui" }, publisher).$promise
            .then(function(response) {
                    $state.go('publisher', { publisherId: response.id});
                    ngNotify.set("Successfully saved config on BidTorrent.io", "success");
                },
                function(response) {
                    if (response.status === 409) {
                        ngNotify.set("This publisher " + $scope.staticConfigForm.name + " is already registered", "error");
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
    }

    $scope.saveHostConfig = function() {
        if (!$scope.publisherId)
            return;

        var publisher = {
            hostConfig: $scope.staticConfigForm.hostConfig
        };

        Publisher.update({ publisherId: $scope.publisherId , format: "ui" }, publisher);
    }

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

    $scope.isFilled = function(array) {
        for (var i = 0; i < array.length; i++) {
            if (array[i] !== "" && array[i] !== null && array[i] !== undefined)
                return true;
        }
        return false;
    }

    $scope.impIsFilled = function(imp) {
        for (var i = 0; i < imp.length; i++) {
            if (imp[i].html_id)
                return true;
        }
        return false;
    }

    // Validation methods
    $scope.impAreValid = function(imp) {
        for (var i = 0; i < imp.length; i++) {
            if (!imp[i].html_id)
                return false;
            if (imp[i].width && !$scope.isStrictPositiveInt(imp[i].width))
                return false;
            if (imp[i].height && !$scope.isStrictPositiveInt(imp[i].height))
                return false;
            if (imp[i].floor && !$scope.isStrictPositiveFloat(imp[i].floor))
                return false;
        }
        return true;
    }

    $scope.isStrictPositiveInt = function(value) {
        return !isNaN(value) &&
               parseInt(Number(value)) == value &&
               !isNaN(parseInt(value, 10)) &&
               value > 0;
    }

    $scope.isStrictPositiveFloat = function(value) {
        return !isNaN(value) &&
               parseFloat(value) == value &&
               !isNaN(parseFloat(value)) &&
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

    $scope.scrollToScript = function() {
        scrollToElement('generatedScript');
    }

    $scope.scrollToImp = function() {
        scrollToElement('impSettings');
    }

    $scope.scrollToGlobalInfo = function() {
        scrollToElement('globalInfo');
    }

    $scope.scrollToConfig = function() {
        scrollToElement('config');
    }

    var scrollToElement = function(elementId) {
        var element = document.getElementById(elementId);
        smoothScroll(element);
    }

    var arrayClean = function (array, deleteValues) {
        for (var i = 0; i < array.length; i++) {
            if (deleteValues.indexOf(array[i]) !== -1) {
                array.splice(i, 1);
                i--;
            }
        }
    };

	var objectClean = function (obj, deleteValues) {
        for (var key in obj) {
            if (deleteValues.indexOf(obj[key]) !== -1) {
                delete obj[key];
            }
        }
	};

    $scope.loadConfig().finally(
    function(response) {
        return; // TODO: end loader if there is a loader
    });
}]);
