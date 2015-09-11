'use strict';

angular.module('btApp.publisher', ['ui.router', 'ngResource'])

.config(['$stateProvider', '$urlRouterProvider', function($stateProvider, $urlRouterProvider) {
    $stateProvider
        .state('publisher', {
            url: '/publisher/:publisherId',
            templateUrl: '/partials/publisher.html',
            controller: 'PublisherCtrl'
        })

    $urlRouterProvider.when('/publisher', '/publisher/');
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

.controller('PublisherCtrl', ['$scope', '$q', '$resource', '$stateParams', '$state', 'ngNotify', '$sce', 'smoothScroll', 'localStorageService', 'IABCaterogiesService', function($scope, $q, $resource, $stateParams, $state, ngNotify, $sce, smoothScroll, localStorageService, IABCaterogiesService) {

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
    $scope.getPublisher = function() {
        var deferred = $q.defer();

        if (!$scope.publisherId) {
            deferred.reject("Enter an id to load the configuration", "error");
            return deferred.promise;
        }

        Publisher.get({ publisherId: $scope.publisherId , format: "ui" }).$promise.then(
            function(response) {
                loadConfig(response);
                deferred.resolve(response);
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

    $scope.submit = function() {
        // hide modal
        //$('#loginModal').modal('hide');

        var publisher = buildConfig();

        if (!publisher)
            return;

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
                        saveConfig();
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

    $scope.displayScript = function() {
        var bidTorrent = {};

        if (!$scope.staticConfigForm.hostClient)
            bidTorrent['clientUrl'] = $scope.staticConfigForm.clientUrl;

        if (!$scope.staticConfigForm.hostBidders)
            bidTorrent['biddersUrl'] = $scope.staticConfigForm.biddersUrl;

        if (!$scope.staticConfigForm.hostImp)
            bidTorrent['impUrl'] = $scope.staticConfigForm.impUrl;

        if ($scope.staticConfigForm.hostConfig)
            bidTorrent['configUrl'] = "http://www.bidtorrent.io/api/publishers/" + $scope.publisherId;
        else {
            var impressions;
            if ($scope.impIsFilled($scope.staticConfigForm.imp)) {
                impressions = [];
                for (var i = 0; i < $scope.staticConfigForm.imp.length; i++) {
                    var imp = $scope.staticConfigForm.imp[i];
                    impressions[i] = {
                        banner: {
                            id: imp.html_id,
                            w: imp.width,
                            h: imp.height
                        },
                        bidfloor: imp.floor,
                        secure: $scope.staticConfigForm.secured,
                        passback: imp.passback
                    };
                };
            }

            var badv, wadv, bcat, wcat;
            if ($scope.isFilled($scope.staticConfigForm.categoryFilter.value)) {
                if ($scope.staticConfigForm.categoryFilter.mode)
                    wcat = $scope.staticConfigForm.categoryFilter.value;
                else
                    bcat = $scope.staticConfigForm.categoryFilter.value;
            }
            if ($scope.isFilled($scope.staticConfigForm.domainFilter.value)) {
                if ($scope.staticConfigForm.domainFilter.mode)
                    wadv = $scope.staticConfigForm.domainFilter.value;
                else
                    badv = $scope.staticConfigForm.domainFilter.value;
            }

            var publisher;
            if ($scope.staticConfigForm.country || $scope.staticConfigForm.name || $scope.publisherId) {
                publisher = {
                    id: $scope.publisherId ? $scope.publisherId : undefined,
                    name: $scope.staticConfigForm.name,
                    country: $scope.staticConfigForm.country
                };
            }

            var site;
            if (publisher || $scope.publisherId) {
                site = {
                    publisher: publisher,
                    id: $scope.publisherId ? $scope.publisherId : undefined
                };
            }

            bidTorrent['config'] = {
                site: site,
                imp: impressions,
                badv: badv,
                wadv: wadv,
                bcat: bcat,
                wcat: wcat,
                tmax: $scope.staticConfigForm.timeout
            };
        }

        var script = "&lt;script src=&quot;http://bidtorrent.io/loader.js&quot;&gt;&lt;/script&gt;<br/>&lt;script type=&quot;text/javascript&quot;&gt;<br/>bidTorrent(" +
            JSON.stringify(bidTorrent, null, 2) +
            ");<br/>&lt;/script&gt;";

        return script;
    };

    $scope.saveHostConfig = function() {
        if (!$scope.publisherId)
            return;

        var publisher = {
            hostConfig: $scope.staticConfigForm.hostConfig
        };

        Publisher.update({ publisherId: $scope.publisherId , format: "ui" }, publisher);
    };

    var loadConfig = function(config) {
        var domainFilter = getFilter(config.filters, angular.copy($scope.defaultDomainFilter));
        var categoryFilter = getFilter(config.filters, angular.copy($scope.defaultCategoryFilter));

        $scope.staticConfigForm = {
            isTypeWebsite: config.type == "website",
            name: config.name,
            country: config.country,
            timeout: config.timeout,
            secured: config.secured,
            domainFilter: domainFilter,
            categoryFilter: categoryFilter,
            imp: config.imp,
            hostConfig: config.hostConfig,
            hostBidders: config.biddersUrl === null,
            biddersUrl: config.biddersUrl || '',
            hostClient: config.clientUrl === null,
            clientUrl: config.clientUrl || '',
            hostImp: config.impUrl === null,
            impUrl: config.impUrl || ''
        };
        $scope.publisherId = config.id;
    };

    var saveConfig = function() {
        var publisher = buildConfig();
        localStorageService.set('publisherConfig', publisher);
    };

    var buildConfig = function() {
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

        return publisher;
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

	$scope.iabcategories = IABCaterogiesService.getCategories();

    // Load from local storage or call backend
    var inProgressConfig = localStorageService.get('publisherConfig');

    if (inProgressConfig) {
        loadConfig(inProgressConfig);
        localStorageService.clearAll('publisherConfig');
    }
    else {
        $scope.getPublisher().finally(
        function(response) {
            return; // TODO: end loader if there is a loader
        });
    }
}]);
