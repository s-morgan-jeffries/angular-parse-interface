'use strict';

describe('Factory: parseRequestHeaders', function () {
  var parseRequestHeaders;

  var SIGN_IN = 'signin',
    SIGN_OUT = 'signout';

  beforeEach(function () {
    module('angularParseInterface', function ($provide) {
      $provide.value('SIGN_IN', SIGN_IN);
      $provide.value('SIGN_OUT', SIGN_OUT);
    });
    inject(function ($injector) {
      parseRequestHeaders = $injector.get('parseRequestHeaders');
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
      appId = '12345';
      restKey = 'abcde';
      appConfig = {
        applicationId: appId,
        restKey: restKey
      };
      sessionToken = '!@#$%';
      appStorage = {
        sessionToken: sessionToken
      };
      appEventBus = {
        on: jasmine.createSpy(),
        emit: jasmine.createSpy()
      };
    });

    it('should be a function', function () {
      expect(parseRequestHeaders.getTransformRequest).toBeFunction();
//      expect(parseRequestHeaders.getTransformRequest.length).toEqual(2);
    });

    it('should return a transformRequest function', function () {
      transformRequest = parseRequestHeaders.getTransformRequest(appConfig, appStorage, appEventBus);
      expect(transformRequest).toBeFunction();
    });

    describe('transformRequest function', function () {
      var data,
        origData,
        transformedData,
        headers,
        headersGetter = function () {
          return headers;
        };

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
      });

      it('should take two arguments', function () {
        transformRequest = parseRequestHeaders.getTransformRequest(appConfig, appStorage, appEventBus);
        expect(transformRequest.length).toEqual(2);
      });

      it('should return its first argument unchanged', function () {
        transformRequest = parseRequestHeaders.getTransformRequest(appConfig, appStorage, appEventBus);
        origData = angular.copy(data);
        transformedData = transformRequest(data, headersGetter);
        expect(transformedData).toEqual(origData);
      });

      it('should add an X-Parse-Application-Id header set to the correct application ID', function () {
        transformRequest = parseRequestHeaders.getTransformRequest(appConfig, appStorage, appEventBus);
        transformedData = transformRequest(data, headersGetter);
        expect(headers['X-Parse-Application-Id']).toEqual(appId);
      });

      it('should add an X-Parse-REST-API-Key header set to the correct REST key', function () {
        transformRequest = parseRequestHeaders.getTransformRequest(appConfig, appStorage, appEventBus);
        transformedData = transformRequest(data, headersGetter);
        expect(headers['X-Parse-REST-API-Key']).toEqual(restKey);
      });

      it('should add an X-Parse-Session-Token header set to the correct session token', function () {
        transformRequest = parseRequestHeaders.getTransformRequest(appConfig, appStorage, appEventBus);
        transformedData = transformRequest(data, headersGetter);
        expect(headers['X-Parse-Session-Token']).toEqual(sessionToken);
      });

      it('should not add an X-Parse-Session-Token header if the session token is empty, undefined, or null', function () {
        appStorage.sessionToken = '';
        transformRequest = parseRequestHeaders.getTransformRequest(appConfig, appStorage, appEventBus);
        transformedData = transformRequest(data, headersGetter);
        expect(headers['X-Parse-Session-Token']).toBeUndefined();
        appStorage.sessionToken = null;
        transformRequest = parseRequestHeaders.getTransformRequest(appConfig, appStorage, appEventBus);
        transformedData = transformRequest(data, headersGetter);
        expect(headers['X-Parse-Session-Token']).toBeUndefined();
        delete appStorage.sessionToken;
        transformRequest = parseRequestHeaders.getTransformRequest(appConfig, appStorage, appEventBus);
        transformedData = transformRequest(data, headersGetter);
        expect(headers['X-Parse-Session-Token']).toBeUndefined();
      });

      it('should set the value of the X-Parse-Session-Token header based on the current value of the session token', function () {
        var updatedSessionToken = '54321',
          origHeaders = angular.copy(headers);

        transformRequest = parseRequestHeaders.getTransformRequest(appConfig, appStorage, appEventBus);
        transformedData = transformRequest(data, headersGetter);
        expect(headers['X-Parse-Session-Token']).toEqual(sessionToken);

        // reset the headers
        headers = angular.copy(origHeaders);
        // update the session token
        appStorage.sessionToken = updatedSessionToken;
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
        transformRequest = parseRequestHeaders.getTransformRequest(appConfig, appStorage, appEventBus);
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

      it('should register an event handler that caches the sessionToken to appStorage on SIGN_IN', function () {
        var data = {
            sessionToken: appStorage.sessionToken
          },
          eventName,
          eventHandler;
        delete appStorage.sessionToken;
        transformRequest = parseRequestHeaders.getTransformRequest(appConfig, appStorage, appEventBus);
        // NB: If this fails, make sure the order of the event registrations hasn't changed.
        eventName = appEventBus.on.argsForCall[0][0];
        expect(eventName).toEqual(SIGN_IN);
        eventHandler = appEventBus.on.argsForCall[0][1];
        eventHandler(null, data);
        expect(appStorage.sessionToken).toEqual(data.sessionToken);
      });

      it('should register an event handler that deletes the sessionToken from appStorage on SIGN_OUT', function () {
        var eventName,
          eventHandler;
        transformRequest = parseRequestHeaders.getTransformRequest(appConfig, appStorage, appEventBus);
        // NB: If this fails, make sure the order of the event registrations hasn't changed.
        eventName = appEventBus.on.argsForCall[1][0];
        expect(eventName).toEqual(SIGN_OUT);
        eventHandler = appEventBus.on.argsForCall[1][1];
        eventHandler();
        expect(appStorage.sessionToken).toBeUndefined();
      });
    });
  });
});