angular.module('angularParseInterface.resourceMod')
  .factory('parseRequestHeaders', function () {
    'use strict';

    var parseRequestHeaders = {};

    // The service has only one method, getTransformRequest. It returns a requestTransform function that will add the
    // correct headers to the request but will not otherwise modify the headers or data
    parseRequestHeaders.getTransformRequest = function (appConfig, appStorage) {
      // Capture the application ID and REST API key
      var appId = appConfig.applicationId,
        restKey = appConfig.restKey;

      // The requestTransform function
      return function (data, headersGetter) {
        var headers = headersGetter(),
          // Get the current value of the session token
          sessionToken = appStorage.sessionToken;

        // Set the application ID and REST key headers
        headers['X-Parse-Application-Id'] = appId;
        headers['X-Parse-REST-API-Key'] = restKey;

        // If the session token has a reasonably existy value, set the session token header
        if (sessionToken && sessionToken.length) {
          headers['X-Parse-Session-Token'] = sessionToken;
        }
        // Return the data unmodified
        return data;
      };
    };

    return parseRequestHeaders;
  });