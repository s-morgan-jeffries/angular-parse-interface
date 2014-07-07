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
    mocks.coreAppResourceFactory = function () {
      return mocks.Resource;
    };
    spyOn(mocks, 'coreAppResourceFactory').andCallThrough();
    mocks.addRESTAuth = function () {};
    mocks.parseRESTAuth = {
      getTransformRequest: function (/*appConfig, appStorage, appEventBus*/) {
        return mocks.addRESTAuth;
      }
    };
    mocks.addJSAuth = function () {};
    mocks.parseJSAuth = {
      getTransformRequest: function (/*appConfig, appStorage, appEventBus*/) {
        return mocks.addJSAuth;
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
    mocks.parseResourceDecorator = jasmine.createSpy();
    module('angularParseInterface', function ($provide) {
      $provide.value('$resource', mocks.$resource);
      $provide.value('parseRESTAuth', mocks.parseRESTAuth);
      $provide.value('parseJSAuth', mocks.parseJSAuth);
      $provide.value('parseDataEncoding', mocks.parseDataEncoding);
      $provide.value('parseResourceDecorator', mocks.parseResourceDecorator);
      $provide.value('$log', console);
    });
    inject(function ($injector) {
      parseResource = $injector.get('parseResource');
    });
  });

  describe('_createCoreAppResourceFactory function', function () {
    var appConfig, appStorage, appEventBus;

    beforeEach(function () {
      appConfig = {};
      appStorage = {};
      appEventBus = {};
    });

    it('should be a function', function () {
      expect(parseResource._createCoreAppResourceFactory).toBeFunction();
    });

    it('should call parseRequestHeaders\' getTransformRequest function with appEventBus and appStorage', function () {
      spyOn(mocks.parseRESTAuth, 'getTransformRequest').andCallThrough();
      parseResource._createCoreAppResourceFactory(appEventBus, appStorage);
      expect(mocks.parseRESTAuth.getTransformRequest).toHaveBeenCalledWith(appEventBus, appStorage);
    });

    it('should return a function', function () {
      var returnVal = parseResource._createCoreAppResourceFactory(appConfig, appStorage, appEventBus);
      expect(returnVal).toBeFunction();
    });

    describe('coreAppResourceFactory function', function () {
      var url, defaultParams, actions, coreAppResourceFactory, Resource;

      beforeEach(function () {
        url = 'a/url/for/you';
        defaultParams = {};
        actions = {};
        coreAppResourceFactory = parseResource._createCoreAppResourceFactory(appConfig, appStorage, appEventBus);
      });

      it('should call the getTransformFunctions method from the parseDataEncoding module', function () {
        spyOn(mocks.parseDataEncoding, 'getTransformFunctions').andCallThrough();
        Resource = coreAppResourceFactory(url, defaultParams, actions);
        expect(mocks.parseDataEncoding.getTransformFunctions).toHaveBeenCalled();
      });

      it('should prepend the base url to the passed in url with a single forward slash as a separator', function () {
        var baseUrl = 'https://api.parse.com/1',
          actualUrl,
          expectedUrl;
        // No leading slash
        url = 'a/url';
        expectedUrl = baseUrl + '/' + url;
        Resource = coreAppResourceFactory(url, defaultParams, actions);
        actualUrl = mocks.$resource.argsForCall[0][0];
        mocks.$resource.reset();
        expect(actualUrl).toEqual(expectedUrl);
        // Single leading slash
        url = '/another/url';
        expectedUrl = baseUrl + url;
        Resource = coreAppResourceFactory(url, defaultParams, actions);
        actualUrl = mocks.$resource.argsForCall[0][0];
        mocks.$resource.reset();
        expect(actualUrl).toEqual(expectedUrl);
        // Double leading slash
        url = '//yet/another/url';
        expectedUrl = baseUrl + '/' + url.slice(2);
        Resource = coreAppResourceFactory(url, defaultParams, actions);
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
        Resource = coreAppResourceFactory(url, defaultParams, actions);
        actualParams = mocks.$resource.argsForCall[0][1];
        mocks.$resource.reset();
        expect(actualParams).toEqual(expectedParams);
        defaultParams = {
          a: 1,
          b: 2
        };
        expectedParams = defaultParams;
        Resource = coreAppResourceFactory(url, defaultParams, actions);
        actualParams = mocks.$resource.argsForCall[0][1];
        mocks.$resource.reset();
        expect(actualParams).toEqual(expectedParams);
      });

      it('should pass the actions to $resource', function () {
        var expectedActions,
          actualActions;
        expectedActions = actions;
        Resource = coreAppResourceFactory(url, defaultParams, actions);
        actualActions = mocks.$resource.argsForCall[0][2];
        expect(actualActions).toEqual(expectedActions);
      });

      describe('addTransformRequestFxs function', function () {

        var expectedActions, actualActions;

        var foo = function () {};

        var placeHolder = function () {};

        beforeEach(function () {
          actions = {
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
              transformRequest: [mocks.addRESTAuth, mocks.addJSAuth]
            },
            // GET with transformRequest function
            getWTRFx: {
              method: 'GET',
              // The preset transformRequest fx + addRESTAuth
              transformRequest: [foo, mocks.addRESTAuth, mocks.addJSAuth]
            },
            // GET with transformRequest array
            getWTRAr: {
              method: 'GET',
              // The preset transformRequest fx + addRESTAuth
              transformRequest: [foo, mocks.addRESTAuth, mocks.addJSAuth]
            },
            // POST with no transformRequest
            postWoTR: {
              method: 'POST',
              // The dataEncoding transformRequest + the function to stringify the data + addRESTAuth
              transformRequest: [mocks.dataEncodingFunctions.transformRequest, placeHolder, mocks.addRESTAuth, mocks.addJSAuth]
            },
            // POST with transformRequest function
            postWTRFx: {
              method: 'POST',
              // The preset transformRequest + the function to parse the JSON (if needed) + the dataEncoding
              // transformRequest + the function to stringify the data + addRESTAuth
              transformRequest: [foo, placeHolder, mocks.dataEncodingFunctions.transformRequest, placeHolder, mocks.addRESTAuth, mocks.addJSAuth]
            },
            // POST with transformRequest array
            postWTRAr: {
              method: 'POST',
              // The preset transformRequest + the function to parse the JSON (if needed) + the dataEncoding
              // transformRequest + the function to stringify the data + addRESTAuth
              transformRequest: [foo, placeHolder, mocks.dataEncodingFunctions.transformRequest, placeHolder, mocks.addRESTAuth, mocks.addJSAuth]
            }
          };
          Resource = coreAppResourceFactory(url, defaultParams, actions);
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
          actions = {
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
          Resource = coreAppResourceFactory(url, defaultParams, actions);
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
        Resource = coreAppResourceFactory(url, defaultParams, actions);
        expect(mocks.$resource).toHaveBeenCalled();
      });

      it('should call the setResource method on dataEncodingFunctions with Resource', function () {
        spyOn(mocks.dataEncodingFunctions, 'setResource');
        Resource = coreAppResourceFactory(url, defaultParams, actions);
        expect(mocks.dataEncodingFunctions.setResource).toHaveBeenCalledWith(Resource);
      });

      it('should return the Resource returned by the $resource factory function', function () {
        Resource = coreAppResourceFactory(url, defaultParams, actions);
        expect(Resource).toBe(mocks.Resource);
      });
    });
  });

  describe('createAppResourceFactory function', function () {
    var appConfig, appStorage, appEventBus, appResourceFactory;

    beforeEach(function () {
      appConfig = {};
      appStorage = {};
      appEventBus = {};
    });

    it('should be a function', function () {
      expect(parseResource.createAppResourceFactory).toBeFunction();
    });

    it('should call the _createCoreAppResourceFactory', function () {
      spyOn(parseResource, '_createCoreAppResourceFactory').andCallThrough();
//      console.log(parseResource);
      parseResource.createAppResourceFactory(appEventBus, appStorage);
      expect(parseResource._createCoreAppResourceFactory).toHaveBeenCalledWith(appEventBus, appStorage);
    });

    it('should return a function', function () {
      appResourceFactory = parseResource.createAppResourceFactory(appConfig, appStorage, appEventBus);
      expect(appResourceFactory).toBeFunction();
    });

    describe('appResourceFactory function', function () {
      var url, defaultParams, actions, Resource;

      beforeEach(function () {
        url = 'a/url/for/you';
        defaultParams = {};
        actions = {
          firstAction: {
            baseActions: {
              create: {
                method: 'POST'
              }
            },
            decorator: jasmine.createSpy()
          },
          secondAction: {
            baseActions: {
              update: {
                method: 'PUT'
              }
            }
          }
        };
        spyOn(parseResource, '_createCoreAppResourceFactory').andReturn(mocks.coreAppResourceFactory);
        appResourceFactory = parseResource.createAppResourceFactory(appConfig, appStorage, appEventBus);
      });

      it('should call the coreAppResourceFactory function', function () {
        Resource = appResourceFactory(url, defaultParams, actions);
        expect(mocks.coreAppResourceFactory).toHaveBeenCalled();
      });

      it('should pass the url and defaultParams to the coreAppResourceFactory unchanged', function () {
        var urlArg, defaultParamsArg;
        Resource = appResourceFactory(url, defaultParams, actions);
        urlArg = mocks.coreAppResourceFactory.argsForCall[0][0];
        defaultParamsArg = mocks.coreAppResourceFactory.argsForCall[0][1];
        expect(urlArg).toEqual(url);
        expect(defaultParamsArg).toEqual(defaultParams);
      });

      it('should pass namespaced versions of all the baseActions from actions to coreAppResourceFactory', function () {
        var expectedBaseActionNames, actualBaseActions;
        actions = {
          firstAction: {
            baseActions: {
              create: {
                method: 'POST'
              }
            },
            decorator: jasmine.createSpy()
          },
          secondAction: {
            baseActions: {
              update: {
                method: 'PUT'
              }
            }
          }
        };
        expectedBaseActionNames = ['RESTcreate', 'RESTupdate', 'JScreate', 'JSupdate'];
        Resource = appResourceFactory(url, defaultParams, actions);
        actualBaseActions = mocks.coreAppResourceFactory.argsForCall[0][2];
        angular.forEach(expectedBaseActionNames, function (expectedBaseActionName) {
          expect(actualBaseActions[expectedBaseActionName]).toBeDefined();
        });
      });

      it('should call the decorator for any action that has one', function () {
        Resource = appResourceFactory(url, defaultParams, actions);
        expect(actions.firstAction.decorator).toHaveBeenCalledWith(Resource);
      });

      it('it should remove any actions that weren\'t included in the actions object', function () {
        mocks.Resource.foo = function () {};
        mocks.Resource.prototype.$foo = function () {};
        Resource = appResourceFactory(url, defaultParams, actions);
        expect(Resource.foo).toBeUndefined();
        expect(Resource.prototype.$foo).toBeUndefined();
      });

      it('it should call parseResourceDecorator with the Resource', function () {
        Resource = appResourceFactory(url, defaultParams, actions);
        expect(mocks.parseResourceDecorator).toHaveBeenCalledWith(Resource);
      });
    });
  });
});