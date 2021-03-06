'use strict';

describe('Factory: parseRESTHeaders', function () {
  var parseRESTAuth,
    moduleName = 'parseRESTAuth';

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
      parseRESTAuth = $injector.get('parseRESTAuth');
    });
  });

  describe('getTransformRequest method', function () {
    var appConfig,
      appId,
      restKey,
      appStorage,
      appEventBus,
      sessionToken,
      transformRequest;

    beforeEach(function () {
//      console.log(parseRESTAuth);
      appId = '12345';
      restKey = 'abcde';
      appConfig = {
        APPLICATION_ID: appId,
        REST_KEY: restKey,
        currentAPI: 'REST'
      };
      sessionToken = '!@#$%';
      appStorage = {
//        sessionToken: sessionToken
      };
      appEventBus = {
        on: jasmine.createSpy(),
        once: jasmine.createSpy(),
        off: jasmine.createSpy(),
        emit: jasmine.createSpy()
      };
    });

    it('should be a function', function () {
//      console.log(parseRESTAuth);
      expect(parseRESTAuth.getTransformRequest).toBeFunction();
    });

    it('should create a module-specific namespace for storage', function () {
      transformRequest = parseRESTAuth.getTransformRequest(appEventBus, appStorage);
      expect(appStorage[moduleName]).toBeObject();
    });

    it('should return a transformRequest function', function () {
      transformRequest = parseRESTAuth.getTransformRequest(appEventBus, appStorage);
      expect(transformRequest).toBeFunction();
    });

    it('should emit a MODULE_REGISTERED event with its module name', function () {
//      var moduleName = 'parseRESTAuth';
      transformRequest = parseRESTAuth.getTransformRequest(appEventBus, appStorage);
      expect(appEventBus.emit).toHaveBeenCalledWith(PARSE_APP_EVENTS.MODULE_REGISTERED, moduleName);
    });

    it('should register a one-time event handler for a namespaced MODULE_INIT event', function () {
      var eventName = PARSE_APP_EVENTS.MODULE_INIT + '.' + moduleName,
        eventHasHandler = false;
      transformRequest = parseRESTAuth.getTransformRequest(appEventBus, appStorage);
      expect(appEventBus.once).toHaveBeenCalled();
      angular.forEach(appEventBus.once.argsForCall, function (args) {
        eventHasHandler = eventHasHandler || (args[0] === eventName);
        eventHasHandler = eventHasHandler && angular.isFunction(args[1]);
      });
      expect(eventHasHandler).toBeTrue();
    });

    describe('SIGN_IN handler', function () {
      var modStorage,
        eventName = PARSE_APP_EVENTS.SIGN_IN;

      beforeEach(function () {
        modStorage = appStorage[moduleName] = {};
      });

      it('should be registered as an event handler for the SIGN_IN event', function () {
        var eventHasHandler = false;
        transformRequest = parseRESTAuth.getTransformRequest(appEventBus, appStorage);
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
        transformRequest = parseRESTAuth.getTransformRequest(appEventBus, appStorage);
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
        transformRequest = parseRESTAuth.getTransformRequest(appEventBus, appStorage);
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
        transformRequest = parseRESTAuth.getTransformRequest(appEventBus, appStorage);
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
        transformRequest = parseRESTAuth.getTransformRequest(appEventBus, appStorage);
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
        transformRequest = parseRESTAuth.getTransformRequest(appEventBus, appStorage);
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
        transformRequest = parseRESTAuth.getTransformRequest(appEventBus, appStorage);
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
        transformRequest = parseRESTAuth.getTransformRequest(appEventBus, appStorage);
        initializeMod = appEventBus.once.argsForCall[0][1];
        initializeMod(null, appConfig);
      });

      it('should take two arguments', function () {
        expect(transformRequest.length).toEqual(2);
      });

      it('should return its first argument unchanged', function () {
        origData = angular.copy(data);
        transformedData = transformRequest(data, headersGetter);
        expect(transformedData).toEqual(origData);
      });

      it('should add an X-Parse-Application-Id header set to the correct application ID', function () {
        transformedData = transformRequest(data, headersGetter);
        expect(headers['X-Parse-Application-Id']).toEqual(appId);
      });

      it('should add an X-Parse-REST-API-Key header set to the correct REST key', function () {
        transformedData = transformRequest(data, headersGetter);
        expect(headers['X-Parse-REST-API-Key']).toEqual(restKey);
      });

      it('should add an X-Parse-Session-Token header set to the correct session token', function () {
        transformedData = transformRequest(data, headersGetter);
        expect(headers['X-Parse-Session-Token']).toEqual(sessionToken);
      });

      it('should not add an X-Parse-Session-Token header if the session token is empty, undefined, or null', function () {
        modStorage.sessionToken = '';
        transformedData = transformRequest(data, headersGetter);
        expect(headers['X-Parse-Session-Token']).toBeUndefined();
        modStorage.sessionToken = null;
        transformedData = transformRequest(data, headersGetter);
        expect(headers['X-Parse-Session-Token']).toBeUndefined();
        delete modStorage.sessionToken;
        transformedData = transformRequest(data, headersGetter);
        expect(headers['X-Parse-Session-Token']).toBeUndefined();
      });

      it('should set the value of the X-Parse-Session-Token header based on the current stored value of the session token', function () {
        var updatedSessionToken = '54321',
          origHeaders = angular.copy(headers);

        transformedData = transformRequest(data, headersGetter);
        expect(headers['X-Parse-Session-Token']).toEqual(sessionToken);

        // reset the headers
        headers = angular.copy(origHeaders);
        // update the session token
        modStorage.sessionToken = updatedSessionToken;
        // re-run the function
        transformedData = transformRequest(data, headersGetter);
        expect(headers['X-Parse-Session-Token']).toEqual(updatedSessionToken);
      });

      it('should not otherwise modify the headers', function () {
        var origHeaders,
          transformedHeaders;

        // Set a meaningless header
        headers['X-Some-Header'] = 'aValue';
        // Make a copy
        origHeaders = angular.copy(headers);
//        transformRequest = parseRESTAuth.getTransformRequest(appEventBus, appStorage);
        transformedData = transformRequest(data, headersGetter);
        // Not technically necessary, but explicit is better than implicit
        transformedHeaders = angular.copy(headers);
        // Delete the new headers
        delete transformedHeaders['X-Parse-Application-Id'];
        delete transformedHeaders['X-Parse-REST-API-Key'];
        delete transformedHeaders['X-Parse-Session-Token'];

        // Now these should be the same
        expect(transformedHeaders).toEqual(origHeaders);
      });

      it('should not initially modify the headers if appConfig.currentAPI is not set to "REST"', function () {
        var origHeaders;

        // First, to show that the headers are usually modified
        appEventBus.once.reset();
        transformRequest = parseRESTAuth.getTransformRequest(appEventBus, appStorage);
        initializeMod = appEventBus.once.argsForCall[0][1];
        // Use REST for currentAPI
        appConfig.currentAPI = 'REST';
        initializeMod(null, appConfig);
        // Reset the headers
        headers = {};
        origHeaders = angular.copy(headers);
        // Call the function
        transformRequest(data, headersGetter);
        // The headers should have changed
        expect(headers).not.toEqual(origHeaders);

        // Now, reinitialize the module
        appEventBus.once.reset();
        transformRequest = parseRESTAuth.getTransformRequest(appEventBus, appStorage);
        initializeMod = appEventBus.once.argsForCall[0][1];
        // Instead of REST, we'll use JS here
        appConfig.currentAPI = 'JS';
        initializeMod(null, appConfig);
        // Reset the headers
        headers = {};
        origHeaders = angular.copy(headers);
        // Call the function
        transformRequest(data, headersGetter);
        expect(headers).toEqual(origHeaders);
      });

      it('should not modify the headers after receiving a USE_JS_API event, even if appConfig.currentAPI was set to "REST"', function () {
        var origHeaders, handler;

        // First, to show that the headers are usually modified
        appEventBus.once.reset();
        appEventBus.on.reset();
        transformRequest = parseRESTAuth.getTransformRequest(appEventBus, appStorage);
        initializeMod = appEventBus.once.argsForCall[0][1];
        // Use REST for currentAPI
        appConfig.currentAPI = 'REST';
        initializeMod(null, appConfig);
        // Reset the headers
        headers = {};
        origHeaders = angular.copy(headers);
        // Call the function
        transformRequest(data, headersGetter);
        // The headers should have changed
        expect(headers).not.toEqual(origHeaders);

        // Now, call the handler for the USE_JS_API event
        handler = appEventBus.on.argsForCall[3][1];
        handler();
        // Reset the headers
        headers = {};
        origHeaders = angular.copy(headers);
        // Call the function
        transformRequest(data, headersGetter);
        // The function should no longer modify the headers
        expect(headers).toEqual(origHeaders);
      });

      it('should modify the headers after receiving a USE_REST_API event, even if appConfig.currentAPI was not set to "REST"', function () {
        var origHeaders, handler;

        // First, to show that the headers are usually modified
        appEventBus.once.reset();
        appEventBus.on.reset();
        transformRequest = parseRESTAuth.getTransformRequest(appEventBus, appStorage);
        initializeMod = appEventBus.once.argsForCall[0][1];
        // Use JS for currentAPI
        appConfig.currentAPI = 'JS';
        initializeMod(null, appConfig);
        // Reset the headers
        headers = {};
        origHeaders = angular.copy(headers);
        // Call the function
        transformRequest(data, headersGetter);
        // The headers should not have changed here
        expect(headers).toEqual(origHeaders);

        // Now, call the handler for the USE_REST_API event
        handler = appEventBus.on.argsForCall[2][1];
        handler();
        // Reset the headers
        headers = {};
        origHeaders = angular.copy(headers);
        // Call the function
        transformRequest(data, headersGetter);
        // Now the function should modify the headers
        expect(headers).not.toEqual(origHeaders);
      });
    });
  });
});