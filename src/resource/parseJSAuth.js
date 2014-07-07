angular.module('angularParseInterface')
  .factory('parseJSAuth', function (PARSE_APP_EVENTS) {
    'use strict';

    // The service has only one method, getTransformRequest. It returns a transformRequest function that will add the
    // correct headers to the request but will not otherwise modify the headers or data
    var parseJSAuth = {};

    parseJSAuth.getTransformRequest = function (appEventBus, appStorage) {
      var APPLICATION_ID,
        INSTALLATION_ID,
        CLIENT_VERSION,
        JS_KEY,
      // Whether we're using the REST API
        useJsApi = false,
        moduleName = 'parseJSAuth',
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
        // Get the JS_KEY
        JS_KEY = appConfig.JS_KEY;
        // Installation ID set in parseInterface.js
        INSTALLATION_ID = appConfig.INSTALLATION_ID;
        // Version string set in parseInterface.js
        CLIENT_VERSION = appConfig.CLIENT_VERSION;
        // Determine whether we're using the JS API
        useJsApi = appConfig.currentAPI === 'JS';
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
      // On a USE_REST_API event, set useJsApi to false
      appEventBus.on(PARSE_APP_EVENTS.USE_REST_API, function () {
        useJsApi = false;
      });
      // On a USE_JS_API event, set useJsApi to true
      appEventBus.on(PARSE_APP_EVENTS.USE_JS_API, function () {
        useJsApi = true;
      });

      // The transformRequest function
      return function (data, headersGetter) {
        // Get the current value of the session token
        var headers = headersGetter(),
          sessionToken = modStorage.sessionToken;
        // Only add auth keys if we're using the JS API
        if (useJsApi) {
          // Set the application ID and JS key values
          data._ApplicationId = APPLICATION_ID;
          data._JavaScriptKey = JS_KEY;
          data._InstallationId = INSTALLATION_ID;
          data._ClientVersion = CLIENT_VERSION;

          // If the session token has a reasonably existy value, set the _SessionToken key
          if (sessionToken && sessionToken.length) {
            data._SessionToken = sessionToken;
          }

          // Set the Content-Type to text/plain to prevent a preflight
          headers['Content-Type'] = 'text/plain';
        }
        // Return the data unmodified
        return data;
      };
    };

    return parseJSAuth;
  });