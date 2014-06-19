'use strict';

angular.module('devApp').factory('Monkey', function(appInterface) {
  var Monkey = appInterface.objectFactory('Monkey');

  Monkey.hasMany('lovers', Monkey);

  return Monkey;
});