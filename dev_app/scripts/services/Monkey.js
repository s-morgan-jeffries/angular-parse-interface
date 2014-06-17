'use strict';

angular.module('devApp').factory('Monkey', function(appInterface) {
  var Monkey = appInterface.objectFactory('Monkey');

  return Monkey;
});