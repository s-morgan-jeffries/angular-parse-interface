'use strict';

describe('Factory: parseResource', function () {
  var parseResource,
    mocks;

  beforeEach(function () {
    mocks = {};
    mocks.Resource = function () {};
    mocks.$resource = function () {
      return mocks.Resource;
    };
    spyOn(mocks, '$resource').andCallThrough();
    mocks.addRequestHeaders = function () {};
    mocks.parseRequestHeaders = {
      getTransformRequest: function (appConfig, appStorage, appEventBus) {
        return mocks.addRequestHeaders
      }
    };
    mocks.dataEncodingFunctions = {
      transformRequest: function () {},
      transformResponse: function () {},
      setResource: function () {}
    };
    mocks.parseDataEncoding = {
      getTransformFunctions: function () {
        return mocks.dataEncodingFunctions;
      }
    };
    module('angularParseInterface.resourceMod', function ($provide) {
      $provide.value('$resource', mocks.$resource);
      $provide.value('parseRequestHeaders', mocks.parseRequestHeaders);
      $provide.value('parseDataEncoding', mocks.parseDataEncoding);
    });
    inject(function ($injector) {
      parseResource = $injector.get('parseResource');
    });
  });

  describe('createCoreAppResourceFactory function', function () {
    var appConfig, appStorage, appEventBus;

    beforeEach(function () {
      appConfig = {};
      appStorage = {};
      appEventBus = {};
    });

    it('should be a function', function () {
      expect(parseResource.createCoreAppResourceFactory).toBeFunction();
    });

    it('should call parseRequestHeaders\' getTransformRequest function with appConfig, appStorage, and appEventBus', function () {
      spyOn(mocks.parseRequestHeaders, 'getTransformRequest').andCallThrough();
      parseResource.createCoreAppResourceFactory(appConfig, appStorage, appEventBus);
      expect(mocks.parseRequestHeaders.getTransformRequest).toHaveBeenCalledWith(appConfig, appStorage, appEventBus);
    });

    it('should return a function', function () {
      var returnVal = parseResource.createCoreAppResourceFactory(appConfig, appStorage, appEventBus);
      expect(returnVal).toBeFunction();
    });

    describe('coreAppResourceFactory function', function () {
      var url, defaultParams, customActions, appResourceFactory, Resource;

      beforeEach(function () {
        url = 'a/url/for/you';
        defaultParams = {};
        customActions = {};
        appResourceFactory = parseResource.createCoreAppResourceFactory(appConfig, appStorage, appEventBus);
      });

      it('should call the getTransformFunctions method from the parseDataEncoding module', function () {
        spyOn(mocks.parseDataEncoding, 'getTransformFunctions').andCallThrough();
        Resource = appResourceFactory(url, defaultParams, customActions);
        expect(mocks.parseDataEncoding.getTransformFunctions).toHaveBeenCalled();
      });

      it('should prepend the base url to the passed in url with a single forward slash as a separator', function () {
        var baseUrl = 'https://api.parse.com/1',
          actualUrl,
          expectedUrl;
        // No leading slash
        url = 'a/url';
        expectedUrl = baseUrl + '/' + url;
        Resource = appResourceFactory(url, defaultParams, customActions);
        actualUrl = mocks.$resource.argsForCall[0][0];
        mocks.$resource.reset();
        expect(actualUrl).toEqual(expectedUrl);
        // Single leading slash
        url = '/another/url';
        expectedUrl = baseUrl + url;
        Resource = appResourceFactory(url, defaultParams, customActions);
        actualUrl = mocks.$resource.argsForCall[0][0];
        mocks.$resource.reset();
        expect(actualUrl).toEqual(expectedUrl);
        // Double leading slash
        url = '//yet/another/url';
        expectedUrl = baseUrl + '/' + url.slice(2);
        Resource = appResourceFactory(url, defaultParams, customActions);
        actualUrl = mocks.$resource.argsForCall[0][0];
        mocks.$resource.reset();
        expect(actualUrl).toEqual(expectedUrl);
      });

      it('should pass defaultParams or an empty object to $resource', function () {
        var expectedParams,
          actualParams;
        // undefined
        defaultParams = undefined;
        expectedParams = {};
        Resource = appResourceFactory(url, defaultParams, customActions);
        actualParams = mocks.$resource.argsForCall[0][1];
        mocks.$resource.reset();
        expect(actualParams).toEqual(expectedParams);
        defaultParams = {
          a: 1,
          b: 2
        };
        expectedParams = defaultParams;
        Resource = appResourceFactory(url, defaultParams, customActions);
        actualParams = mocks.$resource.argsForCall[0][1];
        mocks.$resource.reset();
        expect(actualParams).toEqual(expectedParams);
      });

      it('should extend the built-in actions with customActions or an empty object and pass the result to $resource', function () {
        var expectedActions,
          actualActions,
          baseActions = {
            get: {
              method: 'GET'
            },
            save: {
              method: 'POST'
            },
            query: {
              method: 'GET',
              isArray: true
            },
            remove: {
              method: 'DELETE'
            },
            delete: {
              method: 'DELETE'
            }
          };
        // undefined
        customActions = undefined;
        expectedActions = angular.copy(baseActions);
        Resource = appResourceFactory(url, defaultParams, customActions);
        actualActions = mocks.$resource.argsForCall[0][2];
        mocks.$resource.reset();
        angular.forEach(actualActions, function (val) {
          delete val.transformRequest;
          delete val.transformResponse;
        });
        expect(actualActions).toEqual(expectedActions);
        // Non-overlapping actions
        customActions = {
          foo: {
            method: 'GET'
          }
        };
        expectedActions = angular.copy(baseActions);
        expectedActions.foo = customActions.foo;
        Resource = appResourceFactory(url, defaultParams, customActions);
        actualActions = mocks.$resource.argsForCall[0][2];
        mocks.$resource.reset();
        angular.forEach(actualActions, function (val) {
          delete val.transformRequest;
          delete val.transformResponse;
        });
        expect(actualActions).toEqual(expectedActions);
        // Overlapping actions
        customActions = {
          // isArray is undefined here
          query: {
            method: 'GET'
          }
        };
        expectedActions = angular.copy(baseActions);
        expectedActions.query = customActions.query;
        Resource = appResourceFactory(url, defaultParams, customActions);
        actualActions = mocks.$resource.argsForCall[0][2];
        mocks.$resource.reset();
        angular.forEach(actualActions, function (val) {
          delete val.transformRequest;
          delete val.transformResponse;
        });
        expect(actualActions).toEqual(expectedActions);
      });

      describe('addTransformRequestFxs function', function () {

        var expectedActions, actualActions;

        var foo = function () {};

        var placeHolder = function () {};

        beforeEach(function () {
          customActions = {
            // GET with no transformRequest
            getWoTR: {
              method: 'GET'
            },
            // GET with transformRequest function
            getWTRFx: {
              method: 'GET',
              transformRequest: foo
            },
            // GET with transformRequest array
            getWTRAr: {
              method: 'GET',
              transformRequest: [foo]
            },
            // POST with no transformRequest
            postWoTR: {
              method: 'POST'
            },
            // POST with transformRequest function
            postWTRFx: {
              method: 'POST',
              transformRequest: foo
            },
            // POST with transformRequest array
            postWTRAr: {
              method: 'POST',
              transformRequest: [foo]
            }
          };
          expectedActions = {
            // GET with no transformRequest
            getWoTR: {
              method: 'GET',
              // The only required transformRequest function is for adding headers
              transformRequest: [mocks.addRequestHeaders]
            },
            // GET with transformRequest function
            getWTRFx: {
              method: 'GET',
              // The preset transformRequest fx + addRequestHeaders
              transformRequest: [foo, mocks.addRequestHeaders]
            },
            // GET with transformRequest array
            getWTRAr: {
              method: 'GET',
              // The preset transformRequest fx + addRequestHeaders
              transformRequest: [foo, mocks.addRequestHeaders]
            },
            // POST with no transformRequest
            postWoTR: {
              method: 'POST',
              // The dataEncoding transformRequest + the function to stringify the data + addRequestHeaders
              transformRequest: [mocks.dataEncodingFunctions.transformRequest, placeHolder, mocks.addRequestHeaders]
            },
            // POST with transformRequest function
            postWTRFx: {
              method: 'POST',
              // The preset transformRequest + the function to parse the JSON (if needed) + the dataEncoding
              // transformRequest + the function to stringify the data + addRequestHeaders
              transformRequest: [foo, placeHolder, mocks.dataEncodingFunctions.transformRequest, placeHolder, mocks.addRequestHeaders]
            },
            // POST with transformRequest array
            postWTRAr: {
              method: 'POST',
              // The preset transformRequest + the function to parse the JSON (if needed) + the dataEncoding
              // transformRequest + the function to stringify the data + addRequestHeaders
              transformRequest: [foo, placeHolder, mocks.dataEncodingFunctions.transformRequest, placeHolder, mocks.addRequestHeaders]
            }
          };
          Resource = appResourceFactory(url, defaultParams, customActions);
          actualActions = mocks.$resource.argsForCall[0][2];
          angular.forEach(expectedActions, function (action, actionName) {
            var expectedFxAr = action.transformRequest;
            var actualFxAr = actualActions[actionName].transformRequest;
            angular.forEach(action.transformRequest, function (fx, idx) {
              if (angular.equals(fx, placeHolder)) {
//                console.log('placeholder');
                expectedFxAr[idx] = actualFxAr[idx];
              }
            });
          });
        });

        // See above for a breakdown on these
        it('should add the correct transformRequest functions for actions w/o a transformRequest and no request bodies', function () {
          var actionName = 'getWoTR',
            expectedFxAr = expectedActions[actionName].transformRequest,
            actualFxAr = actualActions[actionName].transformRequest;
          expect(actualFxAr).toEqual(expectedFxAr);
        });

        it('should add the correct transformRequest functions for actions w/ a transformRequest fx but no request bodies', function () {
          var actionName = 'getWTRFx',
            expectedFxAr = expectedActions[actionName].transformRequest,
            actualFxAr = actualActions[actionName].transformRequest;
          expect(actualFxAr).toEqual(expectedFxAr);
        });

        it('should add the correct transformRequest functions for actions w/ a transformRequest array but no request bodies', function () {
          var actionName = 'getWTRAr',
            expectedFxAr = expectedActions[actionName].transformRequest,
            actualFxAr = actualActions[actionName].transformRequest;
          expect(actualFxAr).toEqual(expectedFxAr);
        });

        it('should add the correct transformRequest functions for actions w/o a transformRequest and with request bodies', function () {
          var actionName = 'postWoTR',
            expectedFxAr = expectedActions[actionName].transformRequest,
            actualFxAr = actualActions[actionName].transformRequest;
          expect(actualFxAr).toEqual(expectedFxAr);
        });

        it('should add the correct transformRequest functions for actions w/ a transformRequest fx and request bodies', function () {
          var actionName = 'postWTRFx',
            expectedFxAr = expectedActions[actionName].transformRequest,
            actualFxAr = actualActions[actionName].transformRequest;
          expect(actualFxAr).toEqual(expectedFxAr);
        });

        it('should add the correct transformRequest functions for actions w/ a transformRequest array and request bodies', function () {
          var actionName = 'postWTRAr',
            expectedFxAr = expectedActions[actionName].transformRequest,
            actualFxAr = actualActions[actionName].transformRequest;
          expect(actualFxAr).toEqual(expectedFxAr);
        });
      });

      describe('addTransformResponseFxs function', function () {

        var expectedActions, actualActions;

        var foo = function () {};

        var placeHolder = function () {};

        beforeEach(function () {
          customActions = {
            // no transformResponse
            woTR: {
              method: 'POST'
            },
            // transformResponse function
            tRFx: {
              method: 'POST',
              transformResponse: foo
            },
            // transformResponse array
            tRAr: {
              method: 'POST',
              transformResponse: [foo]
            }
          };
          expectedActions = {
            // no transformResponse
            woTR: {
              method: 'POST',
              // The function to parse the JSON + the dataEncoding transformResponse
              transformResponse: [placeHolder, mocks.dataEncodingFunctions.transformResponse]
            },
            // transformResponse function
            tRFx: {
              method: 'POST',
              // The function to parse the JSON + the dataEncoding transformResponse + the preset transformResponse
              transformResponse: [placeHolder, mocks.dataEncodingFunctions.transformResponse, foo]
            },
            // transformResponse array
            tRAr: {
              method: 'POST',
              // The function to parse the JSON + the dataEncoding transformResponse + the preset transformResponse
              transformResponse: [placeHolder, mocks.dataEncodingFunctions.transformResponse, foo]
            }
          };
          Resource = appResourceFactory(url, defaultParams, customActions);
          actualActions = mocks.$resource.argsForCall[0][2];
          angular.forEach(expectedActions, function (action, actionName) {
            var expectedFxAr = action.transformResponse;
            var actualFxAr = actualActions[actionName].transformResponse;
            angular.forEach(action.transformResponse, function (fx, idx) {
              if (angular.equals(fx, placeHolder)) {
                expectedFxAr[idx] = actualFxAr[idx];
              }
            });
          });
        });

        // See above for a breakdown on these
        it('should add the correct transformResponse functions for actions w/o a transformResponse', function () {
          var actionName = 'woTR',
            expectedFxAr = expectedActions[actionName].transformResponse,
            actualFxAr = actualActions[actionName].transformResponse;
          expect(actualFxAr).toEqual(expectedFxAr);
        });

        it('should add the correct transformResponse functions for actions w/ a transformResponse fx', function () {
          var actionName = 'tRFx',
            expectedFxAr = expectedActions[actionName].transformResponse,
            actualFxAr = actualActions[actionName].transformResponse;
          expect(actualFxAr).toEqual(expectedFxAr);
        });

        it('should add the correct transformResponse functions for actions w/ a transformResponse array', function () {
          var actionName = 'tRAr',
            expectedFxAr = expectedActions[actionName].transformResponse,
            actualFxAr = actualActions[actionName].transformResponse;
          expect(actualFxAr).toEqual(expectedFxAr);
        });
      });

      it('should call the $resource function', function () {
        Resource = appResourceFactory(url, defaultParams, customActions);
        expect(mocks.$resource).toHaveBeenCalled();
      });

      it('should call the setResource method on dataEncodingFunctions with Resource', function () {
        spyOn(mocks.dataEncodingFunctions, 'setResource');
        Resource = appResourceFactory(url, defaultParams, customActions);
        expect(mocks.dataEncodingFunctions.setResource).toHaveBeenCalledWith(Resource);
      });

      it('should return the Resource returned by the $resource factory function', function () {
        Resource = appResourceFactory(url, defaultParams, customActions);
        expect(Resource).toBe(mocks.Resource);
      });
    });
  });
});