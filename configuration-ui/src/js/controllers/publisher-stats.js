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

    function draw(rows) {
        var dataDisplays = [];
        for (var i=0 ; i<rows.length ; i++) {
          dataDisplays.push([new Date(rows[i].date).getTime(), rows[i].impressions]);
        }

        var dataRpm = [];
        for (var i=0 ; i<rows.length ; i++) {
          dataRpm.push([new Date(rows[i].date).getTime(), rows[i].revenue]);
        }

        new Highcharts.Chart({
            chart: {
                type: 'line',
                animation: false,
                renderTo: 'container' },
            title: {
                text: 'Impressions and RPM'
            },
            xAxis: {
                type: 'datetime',
                dateTimeLabelFormats: { // don't display the dummy year
                    month: '%e. %b',
                    year: '%b'
                }
            },
            plotOptions: {
            },
            yAxis: [{
                title: {
                    text: 'Impressions' },
                    min: 0
            }, {
                title: {
                    text: 'RPM' },
                    opposite: true,
                    min:0
            }],
            tooltip:  {
                shared: true
            },

            series: [
              {
                name:'Impressions',
                data:dataDisplays
              },
              {
                name:'RPM',
                yAxis: 1,
                data:dataRpm
              }
            ]
        });
    }

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

                for (var i = 0; i < response.data.rows.length; i++) {
                    impressions += response.data.rows[i].impressions;
                    revenue += response.data.rows[i].revenue;
                }

                revenue = Math.round(revenue/10)/100;

                $scope.models.headers.impressions = impressions;
                $scope.models.headers.revenue = revenue;
                $scope.models.headers.name = response.data.name;
                $scope.models.rows = response.data.rows;
                $scope.models.exportUrl = "api/stats/publishers-csv/"+ $stateParams['publisherId'] + "/" + (from.getTime() / 1000) + "/" + (to.getTime() / 1000);
                setTimeout(draw(response.data.rows), 10);
            });
    }
}]);
