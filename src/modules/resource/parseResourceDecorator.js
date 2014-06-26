angular.module('angularParseInterface.resourceMod')
  .factory('parseResourceDecorator', function () {
    'use strict';

    return function (Resource) {
      Resource.decorator = function () {};
    };
  });