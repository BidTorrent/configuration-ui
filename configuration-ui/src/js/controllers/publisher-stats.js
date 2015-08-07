'use strict';

angular.module('btApp.publisherStats', ['ui.router'])

.config(['$stateProvider', function($stateProvider) {
    $stateProvider
        .state('publisher-stats', {
            url: '/publisher/:publisherId/stats',
            templateUrl: 'partials/publisher-stats.html',
            controller: 'PublisherStatCtrl'
        });
}])

.controller('PublisherStatCtrl', ['$scope', '$q', '$http', '$stateParams', function($scope, $q, $http, $stateParams) {

    var now = new Date();
    var to = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
    );
    var from = new Date();
    from.setDate(to.getDate()-30);
    to.setDate(to.getDate()+1);

    //Models
    $scope.models = {
        headers: {
            impressions: null,
            revenue: null
        },
        rows: [],
    };
    if($stateParams['publisherId']) {
        $http
            .get("api/stats/publishers/"+ $stateParams['publisherId'] + "/" + (from.getTime() / 1000) + "/" + (to.getTime() / 1000))
            .then(function(response) {
                var impressions = 0;
                var revenue = 0;

                for (var i = 0; i < response.data.length; i++) {
                    impressions += response.data[i].impressions;
                    revenue += response.data[i].revenue;
                }

                revenue = Math.round(revenue/10)/100;

                $scope.models.headers.impressions = impressions;
                $scope.models.headers.revenue = revenue;
                $scope.models.rows = response.data;
            });
    }
}]);
