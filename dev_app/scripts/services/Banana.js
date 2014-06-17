'use strict';

angular.module('devApp').factory('Banana', function(appInterface) {
  var Banana = appInterface.objectFactory('Banana');

  return Banana;
});