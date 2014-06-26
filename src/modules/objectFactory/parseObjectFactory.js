angular
  .module('angularParseInterface.objectFactoryMod', [
    'angularParseInterface.configMod'
  ])
  .factory('parseObjectFactory', function () {
    'use strict';

    var parseObjectFactory = {};

    parseObjectFactory.createObjectFactory = function () {};

    return parseObjectFactory;
  });