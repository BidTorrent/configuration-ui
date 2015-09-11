angular.module('btApp.widgets.phloader', [])
    .directive('phLoader', function() {
        return {
            restrict: 'E',
            transclude: true,
            templateUrl: 'partials/ph-loader.html',
            scope: {
                overlay: '=',
                enabled: '='
            }
        };
    });