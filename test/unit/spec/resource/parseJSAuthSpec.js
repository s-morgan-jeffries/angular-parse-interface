'use strict';

describe('Factory: parseJSAuth', function () {
  var parseJSAuth,
    moduleName = 'parseJSAuth';

  var PARSE_APP_EVENTS = {
    SIGN_IN: 'SIGN_IN',
    SIGN_OUT: 'SIGN_OUT',
    USE_JS_API: 'USE_JS_API',
    USE_REST_API: 'USE_REST_API',
    MODULE_REGISTERED: 'MODULE_REGISTERED',
    MODULE_INIT: 'MODULE_INIT'
  };

  beforeEach(function () {
    module('angularParseInterface', function ($provide) {
      $provide.value('PARSE_APP_EVENTS', PARSE_APP_EVENTS);
      $provide.value('$log', console);
    });
    inject(function ($injector) {
      parseJSAuth = $injector.get('parseJSAuth');
    });
  });

  describe('getTransformRequest method', function () {
    var appConfig,
      appId,
      jsKey,
      installationId,
      clientVersion,
      appStorage,
      appEventBus,
      sessionToken,
      transformRequest;

    beforeEach(function () {
      appId = '12345';
      jsKey = 'abcde';
      installationId = 'fjkadfk;aljjf';
      clientVersion = 'js1.2.18';
      appConfig = {
        APPLICATION_ID: appId,
        JS_KEY: jsKey,
        INSTALLATION_ID: installationId,
        CLIENT_VERSION: clientVersion,
        currentAPI: 'JS'
      };
      sessionToken = '!@#$%';
      appStorage = {
//        sessionToken: sessionToken
      };
      appEventBus = {
        on: jasmine.createSpy(),
        off: jasmine.createSpy(),
        emit: jasmine.createSpy()
      };
    });

    it('should be a function', function () {
      expect(parseJSAuth.getTransformRequest).toBeFunction();
    });

    it('should create a module-specific namespace for storage', function () {
      transformRequest = parseJSAuth.getTransformRequest(appEventBus, appStorage);
      expect(appStorage[moduleName]).toBeObject();
    });

    it('should return a function', function () {
      transformRequest = parseJSAuth.getTransformRequest(appEventBus, appStorage);
      expect(transformRequest).toBeFunction();
    });

    it('should emit a MODULE_REGISTERED event with its module name', function () {
      var moduleName = 'parseJSAuth';
      transformRequest = parseJSAuth.getTransformRequest(appEventBus, appStorage);
      expect(appEventBus.emit).toHaveBeenCalledWith(PARSE_APP_EVENTS.MODULE_REGISTERED, moduleName);
    });

    describe('MODULE_INIT handler', function () {
      var moduleName = 'parseJSAuth',
        eventName = PARSE_APP_EVENTS.MODULE_INIT + '.' + moduleName;

      it('should be registered as an event handler for a namespaced MODULE_INIT event', function () {
        var eventHasHandler = false;
        transformRequest = parseJSAuth.getTransformRequest(appEventBus, appStorage);
        expect(appEventBus.on).toHaveBeenCalled();
        angular.forEach(appEventBus.on.argsForCall, function (args) {
          eventHasHandler = eventHasHandler || (args[0] === eventName);
          eventHasHandler = eventHasHandler && angular.isFunction(args[1]);
        });
        expect(eventHasHandler).toBeTrue();
      });

      it('should cause itself to be deregistered as an event handler', function () {
        var handler,
          mockEvent = {};
        transformRequest = parseJSAuth.getTransformRequest(appEventBus, appStorage);
        angular.forEach(appEventBus.on.argsForCall, function (args) {
          if (args[0] === eventName) {
            handler = args[1];
          }
        });
        expect(appEventBus.off).not.toHaveBeenCalled();
        handler(mockEvent, appConfig);
        expect(appEventBus.off).toHaveBeenCalledWith(eventName, handler);
      });
    });

    describe('SIGN_IN handler', function () {
      var modStorage,
        eventName = PARSE_APP_EVENTS.SIGN_IN;

      beforeEach(function () {
        modStorage = appStorage[moduleName] = {};
      });

      it('should be registered as an event handler for the SIGN_IN event', function () {
        var eventHasHandler = false;
        transformRequest = parseJSAuth.getTransformRequest(appEventBus, appStorage);
        expect(appEventBus.on).toHaveBeenCalled();
        angular.forEach(appEventBus.on.argsForCall, function (args) {
          eventHasHandler = eventHasHandler || (args[0] === eventName);
          eventHasHandler = eventHasHandler && angular.isFunction(args[1]);
        });
        expect(eventHasHandler).toBeTrue();
      });

      it('should add data.sessionToken to its module storage if it does not exist', function () {
        var handler,
          mockEvent = {},
          data = {
            sessionToken: sessionToken
          };
        transformRequest = parseJSAuth.getTransformRequest(appEventBus, appStorage);
        angular.forEach(appEventBus.on.argsForCall, function (args) {
          if (args[0] === eventName) {
            handler = args[1];
          }
        });
        expect(modStorage.sessionToken).toBeUndefined();
        handler(mockEvent, data);
        expect(modStorage.sessionToken).toEqual(sessionToken);
      });

      it('should overwrite the value of modStorage.sessionToken if it exists with data.sessionToken', function () {
        var handler,
          mockEvent = {},
          newSessionToken = 'fakdjfksajf;klsjjafl;s',
          data = {
            sessionToken: newSessionToken
          };
        transformRequest = parseJSAuth.getTransformRequest(appEventBus, appStorage);
        angular.forEach(appEventBus.on.argsForCall, function (args) {
          if (args[0] === eventName) {
            handler = args[1];
          }
        });
        modStorage.sessionToken = sessionToken;
        handler(mockEvent, data);
        expect(modStorage.sessionToken).toEqual(newSessionToken);
      });
    });

    describe('SIGN_OUT handler', function () {
      var modStorage,
        eventName = PARSE_APP_EVENTS.SIGN_OUT;

      beforeEach(function () {
        modStorage = appStorage[moduleName] = {};
      });

      it('should be registered as an event handler for the SIGN_OUT event', function () {
        var eventHasHandler = false;
        transformRequest = parseJSAuth.getTransformRequest(appEventBus, appStorage);
        expect(appEventBus.on).toHaveBeenCalled();
        angular.forEach(appEventBus.on.argsForCall, function (args) {
          eventHasHandler = eventHasHandler || (args[0] === eventName);
          eventHasHandler = eventHasHandler && angular.isFunction(args[1]);
        });
        expect(eventHasHandler).toBeTrue();
      });

      it('should delete the sessionToken from its module storage if it exists', function () {
        var handler,
          mockEvent = {},
          data = {};
        transformRequest = parseJSAuth.getTransformRequest(appEventBus, appStorage);
        angular.forEach(appEventBus.on.argsForCall, function (args) {
          if (args[0] === eventName) {
            handler = args[1];
          }
        });
        modStorage.sessionToken = sessionToken;
        handler(mockEvent, data);
        expect(modStorage.sessionToken).toBeUndefined();
      });
    });

    describe('USE_REST_API handler', function () {
      var eventName = PARSE_APP_EVENTS.USE_REST_API;

      it('should be registered as an event handler for the USE_REST_API event', function () {
        var eventHasHandler = false;
        transformRequest = parseJSAuth.getTransformRequest(appEventBus, appStorage);
        expect(appEventBus.on).toHaveBeenCalled();
        angular.forEach(appEventBus.on.argsForCall, function (args) {
          eventHasHandler = eventHasHandler || (args[0] === eventName);
          eventHasHandler = eventHasHandler && angular.isFunction(args[1]);
        });
        expect(eventHasHandler).toBeTrue();
      });
    });

    describe('USE_JS_API handler', function () {
      var eventName = PARSE_APP_EVENTS.USE_JS_API;

      it('should be registered as an event handler for the USE_JS_API event', function () {
        var eventHasHandler = false;
        transformRequest = parseJSAuth.getTransformRequest(appEventBus, appStorage);
        expect(appEventBus.on).toHaveBeenCalled();
        angular.forEach(appEventBus.on.argsForCall, function (args) {
          eventHasHandler = eventHasHandler || (args[0] === eventName);
          eventHasHandler = eventHasHandler && angular.isFunction(args[1]);
        });
        expect(eventHasHandler).toBeTrue();
      });
    });

    describe('transformRequest function', function () {
      var data,
        origData,
        transformedData,
        headers,
        headersGetter = function () {
          return headers;
        },
        modStorage,
        initializeMod;

      beforeEach(function () {
        data = {
          num: 3,
          str: 'string',
          bool: true,
          unDef: undefined,
          nothing: null,
          ar: [1,2,3],
          obj: {
            a: 1,
            b: 2
          }
        };
        headers = {};
        modStorage = appStorage[moduleName] = {};
        modStorage.sessionToken = sessionToken;
        transformRequest = parseJSAuth.getTransformRequest(appEventBus, appStorage);
        initializeMod = appEventBus.on.argsForCall[0][1];
        initializeMod(null, appConfig);
      });

      it('should add a Content-Type header value of "text/plain"', function () {
        headers = {};
        transformRequest(data, headersGetter);
        expect(headers['Content-Type']).toEqual('text/plain');
      });

      it('should not otherwise modify the headers', function () {
        var origHeaders = angular.copy(headers);
        transformRequest(data, headersGetter);
        delete headers['Content-Type'];
        expect(headers).toEqual(origHeaders);
      });

      it('should add an _ApplicationId key set to the correct application ID', function () {
        transformedData = transformRequest(data, headersGetter);
        expect(transformedData._ApplicationId).toEqual(appId);
      });

      it('should add a _JavaScriptKey set to the correct JS key', function () {
        transformedData = transformRequest(data, headersGetter);
        expect(transformedData._JavaScriptKey).toEqual(jsKey);
      });

      it('should add an _InstallationId key set to the correct installation ID', function () {
        transformedData = transformRequest(data, headersGetter);
        expect(transformedData._InstallationId).toEqual(installationId);
      });

      it('should add a _ClientVersion key set to the correct client version string', function () {
        transformedData = transformRequest(data, headersGetter);
        expect(transformedData._ClientVersion).toEqual(clientVersion);
      });

      it('should add a _SessionToken key set to the correct session token', function () {
        transformedData = transformRequest(data, headersGetter);
        expect(transformedData._SessionToken).toEqual(sessionToken);
      });

      it('should not add a _SessionToken key if the session token is empty, undefined, or null', function () {
        // Empty
        origData = angular.copy(data);
        modStorage.sessionToken = '';
        transformedData = transformRequest(data, headersGetter);
        expect(transformedData._SessionToken).toBeUndefined();

        // Null
        modStorage.sessionToken = null;
        data = angular.copy(origData);
        transformedData = transformRequest(data, headersGetter);
        expect(transformedData._SessionToken).toBeUndefined();

        // Undefined
        delete modStorage.sessionToken;
        data = angular.copy(origData);
        transformedData = transformRequest(data, headersGetter);
        expect(transformedData._SessionToken).toBeUndefined();
      });

      it('should set the value of the _SessionToken key based on the current stored value of the session token', function () {
        var updatedSessionToken = '54321';

        // Save the original data
        origData = angular.copy(data);
        // This should set the value
        transformedData = transformRequest(data, headersGetter);
        expect(transformedData._SessionToken).toEqual(sessionToken);

        // Reset the data
        data = angular.copy(origData);
        // Update the session token
        modStorage.sessionToken = updatedSessionToken;
        // Re-run the function
        transformedData = transformRequest(data, headersGetter);
        expect(transformedData._SessionToken).toEqual(updatedSessionToken);
      });

      it('should not otherwise modify the data', function () {
        // Make a copy of the original data
        origData = angular.copy(data);
        // Run the transform
        transformedData = transformRequest(data, headersGetter);
        // Delete the new keys
        delete transformedData._ApplicationId;
        delete transformedData._JavaScriptKey;
        delete transformedData._InstallationId;
        delete transformedData._ClientVersion;
        delete transformedData._SessionToken;
        // Now these should be the same
        expect(transformedData).toEqual(origData);
      });

      it('should not initially add auth data if appConfig.currentAPI is not set to "JS"', function () {
        // First, to show that the data are usually modified
        appEventBus.on.reset();
        transformRequest = parseJSAuth.getTransformRequest(appEventBus, appStorage);
        initializeMod = appEventBus.on.argsForCall[0][1];
        // Use JS for currentAPI
        appConfig.currentAPI = 'JS';
        initializeMod(null, appConfig);
        // Save the original data
        origData = angular.copy(data);
        // Call the function
        transformRequest(data, headersGetter);
        // The data should have changed
        expect(data).not.toEqual(origData);

        // Now, reinitialize the module
        appEventBus.on.reset();
        transformRequest = parseJSAuth.getTransformRequest(appEventBus, appStorage);
        initializeMod = appEventBus.on.argsForCall[0][1];
        // Instead of JS, we'll use REST here
        appConfig.currentAPI = 'REST';
        initializeMod(null, appConfig);
        // Reset the data
        data = origData;
        origData = angular.copy(data);
        // Call the function
        transformRequest(data, headersGetter);
        expect(data).toEqual(origData);
      });

      it('should not modify the data after receiving a USE_REST_API event, even if appConfig.currentAPI was set to "JS"', function () {
        var handler;

        // First, to show that the data are usually modified
        appEventBus.on.reset();
        transformRequest = parseJSAuth.getTransformRequest(appEventBus, appStorage);
        initializeMod = appEventBus.on.argsForCall[0][1];
        // Use JS for currentAPI
        appConfig.currentAPI = 'JS';
        initializeMod(null, appConfig);
        // Save the original data
        origData = angular.copy(data);
        // Call the function
        transformRequest(data, headersGetter);
        // The data should have changed
        expect(data).not.toEqual(origData);

        // Now, call the handler for the USE_REST_API event
        handler = appEventBus.on.argsForCall[3][1];
        handler();
        // Reset the data
        data = origData;
        origData = angular.copy(data);
        // Call the function
        transformRequest(data, headersGetter);
        // The function should no longer modify the data
        expect(data).toEqual(origData);
      });

      it('should modify the data after receiving a USE_JS_API event, even if appConfig.currentAPI was not set to "JS"', function () {
        var handler;

        // First, to show that the data are usually modified
        appEventBus.on.reset();
        transformRequest = parseJSAuth.getTransformRequest(appEventBus, appStorage);
        initializeMod = appEventBus.on.argsForCall[0][1];
        // Use REST for currentAPI
        appConfig.currentAPI = 'REST';
        initializeMod(null, appConfig);
        // Save the original data
        origData = angular.copy(data);
        // Call the function
        transformRequest(data, headersGetter);
        // The data should not have changed
        expect(data).toEqual(origData);

        // Now, call the handler for the USE_JS_API event
        handler = appEventBus.on.argsForCall[4][1];
        handler();
        // Reset the data
        data = origData;
        origData = angular.copy(data);
        // Call the function
        transformRequest(data, headersGetter);
        // The function should now modify the data
        expect(data).not.toEqual(origData);
      });
    });
  });
});