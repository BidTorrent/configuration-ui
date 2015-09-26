btApp.factory('AppLoadingService', ['$rootScope', function($rootScope) {
    var AppLoadingService = {};

    AppLoadingService.start = function() {
        $rootScope.appLoading = true;
    }

    AppLoadingService.stop = function() {
        $rootScope.appLoading = false;
    }

    return AppLoadingService;
}]);