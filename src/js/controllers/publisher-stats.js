'use strict';

angular.module('btApp.publisherStats', ['ui.router', 'btApp.widgets.phloader'])

.config(['$stateProvider', '$urlRouterProvider', function($stateProvider, $urlRouterProvider) {
    $stateProvider
        .state('publisher-stats', {
            url: '/publisher/:publisherId/stats/:day',
            templateUrl: 'partials/publisher-stats.html',
            controller: 'PublisherStatCtrl'
        });
}])

.controller('PublisherStatCtrl', ['$scope', '$q', '$http', '$state', '$stateParams', 'AppLoadingService',
            function($scope, $q, $http, $state, $stateParams, AppLoadingService) {

    /// function called when user click on a day in the graph
    var clickDay;

    /// function showing data on highchart from @to to @from if @hourly true step is 1 hour else 1 day (default false)
    var loadImpressionStats;

    /// config to show data daily
    var highChartConfig;

    /// config to show data hourly
    var highChartConfigHourly

    /// function initialising highChartConfig & highChartConfigHourly
    var initConfig;

    ///draw @rows using the @hcConfig on highchart
    var draw

    $scope.publisherId = $stateParams['publisherId'];
    $scope.day = $stateParams['day'];

    initConfig = function() {
        var titleChart = 'Impressions and RPM for the ' + ($stateParams['day'] || "current week");

        highChartConfig =
        {
            chart: {
                type: 'line',
                animation: false,
                renderTo: 'highchart-container',
                height: 500
            },
            title: {
                text: titleChart
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
                    min: 0
            }],
            tooltip:  {
                shared: true
            },

            series: [
                {
                    name: 'Impressions',
                    data: [],
                    allowPointSelect: true,
                    point: {
                        events: {
                        }
                    }
                },
                {
                    name: 'RPM',
                    yAxis: 1,
                    data: [],
                    allowPointSelect: true,
                    point: {
                        events: {
                        }
                    }
                }
            ]
        };

        highChartConfigHourly = angular.copy(highChartConfig);

        // on the standard config we want to be able to click on the day to display more "zoomed" data
        highChartConfig.series[0].point.events.click = clickDay;
        highChartConfig.series[1].point.events.click = clickDay;
    };

    clickDay = function() {
        var selectedDay = new Date(this.x);
        var stringSelectedDay = [selectedDay.getFullYear(), selectedDay.getMonth(), selectedDay.getDate()].join('-');

        $state.go("publisher-stats", { publisherId: $stateParams['publisherId'], day: stringSelectedDay})
    }

    loadImpressionStats = function(from, to, hourly) {
        hourly = (typeof hourly !== 'undefined' ? hourly : null);

        AppLoadingService.start();
        $http
            .get("/api/stats/publishers/"+ $stateParams['publisherId'] + "/" + (from.getTime() / 1000) + "/" + (to.getTime() / 1000) + (hourly ? "/hourly" : ""))
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
                $scope.models.exportUrl = "/api/stats/publishers-csv/"+ $stateParams['publisherId'] + "/" + (from.getTime() / 1000) + "/" + (to.getTime() / 1000) + (hourly ? "/hourly" : "");

                var config;
                if (hourly)
                    config = highChartConfigHourly;
                else
                    config = highChartConfig

                var rows = angular.copy(response.data.rows);
                setTimeout(draw(rows.reverse(), config), 10);
            })
            .finally(function() {
                AppLoadingService.stop();
            });
    }

    draw = function(rows, hcConfig) {
        var dataDisplays = [];
        for (var i=0 ; i<rows.length ; i++) {
          dataDisplays.push([new Date(rows[i].date).getTime(), rows[i].impressions]);
        }

        var dataRpm = [];
        for (var i=0 ; i<rows.length ; i++) {
          dataRpm.push([new Date(rows[i].date).getTime(), rows[i].revenue]);
        }

        hcConfig.series[0].data = dataDisplays;
        hcConfig.series[1].data = dataRpm;

        new Highcharts.Chart(hcConfig);
    }

    // initilise the highchart configs
    initConfig();

    //Models
    $scope.models = {
        headers: {
            impressions: null,
            revenue: null
        },
        rows: [],
    };

    // If we have a publisherId we want to display a graph
    if ($stateParams['publisherId']) {
        var dayString = $stateParams['day'];
        if (dayString) {
            var tabDate = dayString.split("-");
            if (tabDate.length !== 3)
                return; //TODO

            var to = new Date(
                parseInt(tabDate[0]),
                parseInt(tabDate[1]),
                parseInt(tabDate[2])+1
            );

            var from = new Date(
                parseInt(tabDate[0]),
                parseInt(tabDate[1]),
                parseInt(tabDate[2])
            );
            loadImpressionStats(from, to, true);
        } else {
            var now = new Date();

            var to = new Date(
                now.getFullYear(),
                now.getMonth(),
                now.getDate()
            );

            var from = new Date();

            from.setDate(to.getDate()-30);
            to.setDate(to.getDate()+1);
            loadImpressionStats(from, to, false);
        }
    }
}]);
