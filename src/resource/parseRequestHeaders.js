angular.module('angularParseInterface')
  .factory('parseRequestHeaders', function (PARSE_APP_EVENTS) {
    'use strict';

    // The service has only one method, getTransformRequest. It returns a transformRequest function that will add the
    // correct headers to the request but will not otherwise modify the headers or data
    var parseRequestHeaders = {};

    parseRequestHeaders.getTransformRequest = function (appEventBus, appStorage) {
      var APPLICATION_ID,
        REST_KEY,
        // Whether we're using the REST API
        useRestApi = false,
        moduleName = 'parseRequestHeaders',
        // Namespaced initialization event. The appInterface will emit this with the appConfig when the
        // MODULE_REGISTERED event is emitted with our moduleName.
        INIT_EVENT = PARSE_APP_EVENTS.MODULE_INIT + '.' + moduleName,
        // Create module-specific namespace for storage
        modStorage = appStorage[moduleName] = (appStorage[moduleName] || {});


      // Register event handlers
      // This is the handler for the INIT_EVENT
      var initializeMod = function (event, appConfig) {
        // Get the APPLICATION_ID
        APPLICATION_ID = appConfig.APPLICATION_ID;
        // Get the REST_KEY
        REST_KEY = appConfig.REST_KEY;
        // Determine whether we're using the REST API
        useRestApi = appConfig.currentAPI === 'REST';
        // Once this handler is called, it should unregister itself
        appEventBus.off(INIT_EVENT, initializeMod);
      };
      // Register the handler for the INIT_EVENT
      appEventBus.on(INIT_EVENT, initializeMod);
      // Now that the handler is set up, we can emit the MODULE_REGISTERED event, which will cause the appInterface to
      // emit the INIT_EVENT with the appConfig
      appEventBus.emit(PARSE_APP_EVENTS.MODULE_REGISTERED, moduleName);
      // On a SIGN_IN event, cache the sessionToken
      appEventBus.on(PARSE_APP_EVENTS.SIGN_IN, function (e, data) {
        modStorage.sessionToken = data.sessionToken;
      });
      // On a SIGN_OUT event, delete the sessionToken from the cache
      appEventBus.on(PARSE_APP_EVENTS.SIGN_OUT, function (/*e, data*/) {
        delete modStorage.sessionToken;
      });
      // On a USE_REST_API event, set useRestApi to true
      appEventBus.on(PARSE_APP_EVENTS.USE_REST_API, function () {
        useRestApi = true;
      });
      // On a USE_JS_API event, set useRestApi to false
      appEventBus.on(PARSE_APP_EVENTS.USE_JS_API, function () {
        useRestApi = false;
      });

      // The transformRequest function
      return function (data, headersGetter) {
        var headers = headersGetter(),
          // Get the current value of the session token
          sessionToken = modStorage.sessionToken;

        // Only add the headers if we're using the REST API
        if (useRestApi) {
          // Set the application ID and REST key headers
          headers['X-Parse-Application-Id'] = APPLICATION_ID;
          headers['X-Parse-REST-API-Key'] = REST_KEY;

          // If the session token has a reasonably existy value, set the session token header
          if (sessionToken && sessionToken.length) {
            headers['X-Parse-Session-Token'] = sessionToken;
          }
        }
        // Return the data unmodified
        return data;
      };
    };

    return parseRequestHeaders;
  });