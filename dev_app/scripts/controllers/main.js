'use strict';

angular.module('devApp')
  .controller('MainCtrl', function ($scope, awesomeThingsService) {
    $scope.awesomeThings = awesomeThingsService.getAwesomeThings();
  });