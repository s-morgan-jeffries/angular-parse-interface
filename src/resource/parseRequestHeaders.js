angular.module('angularParseInterface')
  .factory('parseRequestHeaders', function (SIGN_IN, SIGN_OUT) {
    'use strict';

    var parseRequestHeaders = {};

    // The service has only one method, getTransformRequest. It returns a requestTransform function that will add the
    // correct headers to the request but will not otherwise modify the headers or data
    parseRequestHeaders.getTransformRequest = function (appConfig, appStorage, appEventBus) {
      // Capture the application ID and REST API key
      var appId = appConfig.applicationId,
        restKey = appConfig.restKey;

      // Register event handlers
      // On a SIGN_IN event, cache the sessionToken
      appEventBus.on(SIGN_IN, function (e, data) {
        appStorage.sessionToken = data.sessionToken;
      });
      // On a SIGN_OUT event, delete the sessionToken from the cache
      appEventBus.on(SIGN_OUT, function (/*e, data*/) {
        delete appStorage.sessionToken;
      });

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