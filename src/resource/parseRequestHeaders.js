angular.module('angularParseInterface')
  .factory('parseRequestHeaders', function (EVENTS) {
    'use strict';

    // The service has only one method, getTransformRequest. It returns a transformRequest function that will add the
    // correct headers to the request but will not otherwise modify the headers or data
    var parseRequestHeaders = {};

    parseRequestHeaders.getTransformRequest = function (appConfig, appStorage, appEventBus) {
      // Capture the application ID and REST API key
      var appId = appConfig.applicationId,
        restKey = appConfig.restKey,
        // Create module-specific namespace for storage
        modStorage = appStorage.parseRequestHeaders = (appStorage.parseRequestHeaders || {});

      // Register event handlers
      // On a SIGN_IN event, cache the sessionToken
      appEventBus.on(EVENTS.SIGN_IN, function (e, data) {
        modStorage.sessionToken = data.sessionToken;
      });
      // On a SIGN_OUT event, delete the sessionToken from the cache
      appEventBus.on(EVENTS.SIGN_OUT, function (/*e, data*/) {
        delete modStorage.sessionToken;
      });

      // The transformRequest function
      return function (data, headersGetter) {
        var headers = headersGetter(),
          // Get the current value of the session token
          sessionToken = modStorage.sessionToken;

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