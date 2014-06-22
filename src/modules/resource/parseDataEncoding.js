angular.module('angularParseInterface.resourceMod')
  .factory('parseDataEncoding', function () {
    'use strict';

    var parseDataEncoding = {};

    parseDataEncoding.getRequestTransform = function () {

      return function (data /*, headersGetter*/) {

        return data;
      };
    };


    parseDataEncoding.getResponseTransform = function () {

      return function () {};
    };

    return parseDataEncoding;
  });