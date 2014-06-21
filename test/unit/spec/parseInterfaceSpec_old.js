'use strict';

describe('Factory: parseInterface', function () {

  // load the service's module
  beforeEach(module('angularParseInterface'));

  // instantiate service
  var parseInterface_;
  // Okay, note here that we're using inject() to get the service
  beforeEach(inject(function (parseInterface) {
    parseInterface_ = parseInterface;
  }));

  describe('resource module', function() {
    var resourceMod;
    beforeEach(function () {
      resourceMod = parseInterface_._resource;
    });

    describe('url submodule', function () {
      var urlMod;
      beforeEach(function () {
        urlMod = resourceMod._url;
      });

      describe('prependBaseUrl function', function () {
        var baseUrl = 'https://api.parse.com/1';
        var prependBaseUrl;
        beforeEach(function () {
          prependBaseUrl = urlMod.prependBaseUrl;
        });

        it('should prepend the base url to any given url', function () {
          var url = 'a/url';
          expect(prependBaseUrl(url)).toStartWith(baseUrl);
          url = '/another/url';
          expect(prependBaseUrl(url)).toStartWith(baseUrl);
          url = '/still/another/url/';
          expect(prependBaseUrl(url)).toStartWith(baseUrl);
          url = '////one/more//url/';
          expect(prependBaseUrl(url)).toStartWith(baseUrl);
          url = '/one/last.url';
          expect(prependBaseUrl(url)).toStartWith(baseUrl);
        });
        it('should strip any leading slashes from the provided url and replace them with a single slash', function () {
          var url;
          var stripBaseUrl = function (u) {
            return u.split(baseUrl)[1];
          };
          url = 'a/url';
          expect(stripBaseUrl(prependBaseUrl(url))).toEqual('/a/url');
          url = '/another/url';
          expect(stripBaseUrl(prependBaseUrl(url))).toEqual('/another/url');
          url = '/still/another/url/';
          expect(stripBaseUrl(prependBaseUrl(url))).toEqual('/still/another/url/');
          url = '////one/more//url/';
          expect(stripBaseUrl(prependBaseUrl(url))).toEqual('/one/more//url/');
          url = '/one/last.url';
          expect(stripBaseUrl(prependBaseUrl(url))).toEqual('/one/last.url');
        });
      });
    });
    describe('headers submodule', function () {
      var headersMod;
      beforeEach(function () {
        headersMod = resourceMod._headers;
      });
      var applicationId = 'abcde',
        restKey = 'rhubarb',
        sessionToken = '12345',
        appIdHeader = 'X-Parse-Application-Id',
        restKeyHeader = 'X-Parse-REST-API-Key',
        sessionTokenHeader = 'X-Parse-Session-Token',
        parseRequestHeadersGetter,
        appConfig,
        appStorage,
        headers,
        getHeaders = function () {
          return headers;
        },
        dummyTransformRequest = function (d) {
          return angular.toJson(d);
        };

      describe('parseRequestHeadersGetter function', function () {
        beforeEach(function () {
          headers = {};
          parseRequestHeadersGetter = headersMod._parseRequestHeadersGetter;
          appConfig = {
            applicationId: applicationId,
            restKey: restKey
          };
          appStorage = {
            sessionToken: sessionToken
          };
        });
        it('should take appConfig and appStorage objects and return an object with the headers set for the application ID, REST API key, and session token', function () {
          var parseHeaders = parseRequestHeadersGetter(appConfig, appStorage);
          expect(parseHeaders[appIdHeader]).toEqual(applicationId);
          expect(parseHeaders[restKeyHeader]).toEqual(restKey);
          expect(parseHeaders[sessionTokenHeader]).toEqual(sessionToken);
        });
        it('should not set the session token header if the session token is undefined', function () {
          appStorage.sessionToken = undefined;
          var parseHeaders = parseRequestHeadersGetter(appConfig, appStorage);
          expect(parseHeaders[appIdHeader]).toEqual(applicationId);
          expect(parseHeaders[restKeyHeader]).toEqual(restKey);
          expect(parseHeaders.hasOwnProperty(sessionTokenHeader)).toBeFalse();
        });
      });

      describe('wrapTransformRequest function', function () {
        var wrapTransformRequest,
          originalTransformRequest,
          wrappedTransformRequest,
          data,
          originalTransformedData,
          wrappedTransformedData,
          parseRequestHeaders;

        beforeEach(function () {
          wrapTransformRequest = headersMod._wrapTransformRequest;
          headers = {};
          appConfig = {
            applicationId: applicationId,
            restKey: restKey
          };
          appStorage = {
            sessionToken: sessionToken
          };
          parseRequestHeadersGetter = headersMod._parseRequestHeadersGetter;
          parseRequestHeaders = parseRequestHeadersGetter(appConfig, appStorage);
        });

        it('should return a function that returns the same data as the original function', function () {
          originalTransformRequest = function (d, hG) {
            return d;
          };
          headers = {};
          data = {a: 1, b: 2};
          originalTransformedData = originalTransformRequest(data, getHeaders);
          wrappedTransformRequest = wrapTransformRequest(originalTransformRequest, appConfig, appStorage);
          wrappedTransformedData = wrappedTransformRequest(data, getHeaders);
          expect(originalTransformedData).toEqual(wrappedTransformedData);
        });

        it('should return a function that adds parse request headers to the request headers', function () {
          originalTransformRequest = function (d, hG) {
            var h = hG();
            h['X-Dummy-Header'] = 'value';
            return d;
          };
          headers = {};
          data = {a: 1, b: 2};
          wrappedTransformRequest = wrapTransformRequest(originalTransformRequest, appConfig, appStorage);
          wrappedTransformedData = wrappedTransformRequest(data, getHeaders);
          angular.forEach(parseRequestHeaders, function (val, key) {
            expect(headers[key]).toEqual(val);
          });
        });

        it('should return a function that otherwise results in the same request headers as the original function', function () {
          originalTransformRequest = function (d, hG) {
            var h = hG();
            h['X-Dummy-Header'] = 'value';
            return d;
          };
          headers = {};
          data = {a: 1, b: 2};
          originalTransformedData = originalTransformRequest(data, getHeaders);
          var originalTransformedHeaders = angular.copy(headers);
          headers = {};
          wrappedTransformRequest = wrapTransformRequest(originalTransformRequest, appConfig, appStorage);
          wrappedTransformedData = wrappedTransformRequest(data, getHeaders);
          var wrappedTransformedHeaders = angular.copy(headers);
          angular.forEach(parseRequestHeaders, function (val, key) {
            delete wrappedTransformedHeaders[key];
          });
          expect(wrappedTransformedHeaders).toEqual(originalTransformedHeaders);
        });
      });

      xdescribe('wrapTransformReqForAction function', function () {
        var originalTransformRequest = function (d, hG) {
          var h = hG();
          h['X-Dummy-Header'] = 'value';
          return d;
        };
        var dummyWrapper = function (f) {
          return function (d, hG) {
            return f(d, hG);
          };
        };

        var action = {
          transformRequest: originalTransformRequest
        };

        beforeEach(function () {
          action = {
            transformRequest: originalTransformRequest
          };
        });

        it('should wrap an action\'s transformRequest function in the same function as wrapTransformRequest', function () {

        });

        it('should add a dummy transformRequest to an action that does not have one so that it JSONifies the data', function () {

        });
      });
    });
  });

});