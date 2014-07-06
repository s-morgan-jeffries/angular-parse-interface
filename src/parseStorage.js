angular
  .module('angularParseInterface')
  .factory('parseStorage', function ($localStorage, $sessionStorage) {
    'use strict';

    var parseStorage = {};

    parseStorage.localStorage = $localStorage;

    parseStorage.sessionStorage = $sessionStorage;

    return parseStorage;
  });