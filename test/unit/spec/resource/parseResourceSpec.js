'use strict';

describe('Factory: parseResource', function () {
  var parseResource,
    mocks,
    PARSE_APP_EVENTS,
    moduleName;

  beforeEach(function () {
    moduleName = 'parseResource';
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
    PARSE_APP_EVENTS = {
      SIGN_IN: 'SIGN_IN',
      SIGN_OUT: 'SIGN_OUT',
      USE_JS_API: 'USE_JS_API',
      USE_REST_API: 'USE_REST_API',
      MODULE_REGISTERED: 'MODULE_REGISTERED',
      MODULE_INIT: 'MODULE_INIT'
    };
    module('angularParseInterface', function ($provide) {
      $provide.value('$resource', mocks.$resource);
      $provide.value('parseRESTAuth', mocks.parseRESTAuth);
      $provide.value('PARSE_APP_EVENTS', PARSE_APP_EVENTS);
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
              transformRequest: [mocks.dataEncodingFunctions.transformRequest, mocks.addRESTAuth, mocks.addJSAuth, placeHolder]
            },
            // POST with transformRequest function
            postWTRFx: {
              method: 'POST',
              // The preset transformRequest + the function to parse the JSON (if needed) + the dataEncoding
              // transformRequest + the function to stringify the data + addRESTAuth
              transformRequest: [foo, placeHolder, mocks.dataEncodingFunctions.transformRequest, mocks.addRESTAuth, mocks.addJSAuth, placeHolder]
            },
            // POST with transformRequest array
            postWTRAr: {
              method: 'POST',
              // The preset transformRequest + the function to parse the JSON (if needed) + the dataEncoding
              // transformRequest + the function to stringify the data + addRESTAuth
              transformRequest: [foo, placeHolder, mocks.dataEncodingFunctions.transformRequest, mocks.addRESTAuth, mocks.addJSAuth, placeHolder]
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

  describe('_getPseudoMethodTransform function', function () {
    var method,
      transformFunction;

    beforeEach(function () {
      method = 'foo';
      transformFunction = parseResource._getPseudoMethodTransform(method);
    });

    it('should return a function', function () {
      expect(transformFunction).toBeFunction();
    });

    describe('transformFunction', function () {
      var data,
        headers,
        headersGetter;

      beforeEach(function () {
        data = {a: 1, b: 2};
        headers = {c: 3, d: 4};
        headersGetter = function () {
          return headers;
        };
      });

      it('should add the method to data as _method', function () {
        var transformedData = transformFunction(data, headersGetter);
        expect(transformedData._method).toEqual(method);
      });

      it('should not otherwise modify data', function () {
        var origData = angular.copy(data),
          transformedData = transformFunction(data, headersGetter);
        delete transformedData._method;
        expect(transformedData).toEqual(origData);
      });

      it('should not modify the headers', function () {
        var origHeaders = angular.copy(headers);
        transformFunction(data, headersGetter);
        expect(headers).toEqual(origHeaders);
      });
    });
  });

  describe('_namespaceBaseActions function', function () {
    var action, nameSpace, nameSpacedAction;

    beforeEach(function () {
      action = {
        baseActions: {
          get: {
            method: 'GET'
          },
          put: {
            method: 'PUT'
          }
        },
        decorator: function () {}
      };
      nameSpace = 'foo';
    });

    it('should return a new action', function () {
      nameSpacedAction = parseResource._namespaceBaseActions(action, nameSpace);
      expect(nameSpacedAction).not.toBe(action);
    });

    it('should not modify the action\'s decorator', function () {
      nameSpacedAction = parseResource._namespaceBaseActions(action, nameSpace);
      expect(nameSpacedAction.decorator).toEqual(action.decorator);
    });

    it('should rename the baseActions by prefixing their names with nameSpace', function () {
      var baseActions = action.baseActions,
        nameSpacedBaseActions;
      nameSpacedAction = parseResource._namespaceBaseActions(action, nameSpace);
      nameSpacedBaseActions = nameSpacedAction.baseActions;
      angular.forEach(baseActions, function (baseAction, baseActionName) {
        var nameSpacedBaseActionName = nameSpace + baseActionName;
        expect(nameSpacedBaseActions[baseActionName]).toBeUndefined();
        expect(nameSpacedBaseActions[nameSpacedBaseActionName]).toEqual(baseAction);
      });
    });

    it('should use a copy of the original baseActions rather than the baseActions themselves', function () {
      var baseActions = action.baseActions,
        nameSpacedBaseActions;
      nameSpacedAction = parseResource._namespaceBaseActions(action, nameSpace);
      nameSpacedBaseActions = nameSpacedAction.baseActions;
      angular.forEach(baseActions, function (baseAction, baseActionName) {
        var nameSpacedBaseActionName = nameSpace + baseActionName;
        expect(nameSpacedBaseActions[nameSpacedBaseActionName]).toEqual(baseAction);
        expect(nameSpacedBaseActions[nameSpacedBaseActionName]).not.toBe(baseAction);
      });
    });
  });

  describe('_generateRESTAction function', function () {
    it('should delegate to the _namespaceBaseActions function', function () {
      var action = {
          baseActions: {
            get: {
              method: 'GET'
            }
          },
          decorator: function () {}
        },
        nameSpace = 'foo';
      spyOn(parseResource, '_namespaceBaseActions');
      parseResource._generateRESTAction(action, nameSpace);
      expect(parseResource._namespaceBaseActions).toHaveBeenCalledWith(action, nameSpace);
    });
  });

  describe('_generateJSAction function', function () {
    var action, nameSpace, transformFunction;

    beforeEach(function () {
      action = {
        baseActions: {
          get: {
            method: 'GET'
          },
          post: {
            method: 'POST'
          }
        },
        decorator: function () {}
      };
      nameSpace = 'foo';
      transformFunction = function () {};
      spyOn(parseResource, '_getPseudoMethodTransform').andReturn(transformFunction);
    });

    it('should call the _namespaceBaseActions function with the same arguments it received', function () {
      spyOn(parseResource, '_namespaceBaseActions').andCallThrough();
      parseResource._generateJSAction(action, nameSpace);
      expect(parseResource._namespaceBaseActions).toHaveBeenCalledWith(action, nameSpace);
    });

    it('should set the method to POST for any non-POST actions', function () {
      var transformedAction = parseResource._generateJSAction(action, nameSpace);
      angular.forEach(transformedAction.baseActions, function (baseAction) {
        expect(baseAction.method).toEqual('POST');
      });
    });

    it('should call the _getPseudoMethodTransform function with the method name of any non-POST actions', function () {
      parseResource._generateJSAction(action, nameSpace);
      expect(parseResource._getPseudoMethodTransform).toHaveBeenCalledWith('GET');
    });

    it('should create a transformRequest array for any non-POST actions if it doesn\'t exist', function () {
      var transformedAction = parseResource._generateJSAction(action, nameSpace);
      expect(transformedAction.baseActions[nameSpace + 'get'].transformRequest).toBeArray();
    });

    it('should push the transform function from _getPseudoMethodTransform to the end of the transformRequest array for any non-POST actions', function () {
      var transformedAction,
        lastTransformRequest;
      action = {
        baseActions: {
          get: {
            method: 'GET',
            transformRequest: [function () {}, function () {}]
          },
          post: {
            method: 'POST'
          }
        },
        decorator: function () {}
      };
      transformedAction = parseResource._generateJSAction(action, nameSpace);
      lastTransformRequest = transformedAction.baseActions[nameSpace + 'get'].transformRequest.pop();
      expect(lastTransformRequest).toBe(transformFunction);
    });
  });

  describe('_generateAPIAction function', function () {
    var action, API;

    beforeEach(function () {
      action = {
        baseActions: {
          get: {
            method: 'GET'
          }
        },
        decorator: function () {}
      };
    });

    it('should call _generateRESTAction with both its arguments when its second argument is "REST"', function () {
      API = 'REST';
      spyOn(parseResource, '_generateRESTAction');
      parseResource._generateAPIAction(action, API);
      expect(parseResource._generateRESTAction).toHaveBeenCalledWith(action, API);
    });

    it('should call _generateJSAction with both its arguments when its second argument is "JS"', function () {
      API = 'JS';
      spyOn(parseResource, '_generateJSAction');
      parseResource._generateAPIAction(action, API);
      expect(parseResource._generateJSAction).toHaveBeenCalledWith(action, API);
    });
  });

  describe('_deNamespaceBaseActions function', function () {
    var Resource, action, get, $get, query, create, $create;

    beforeEach(function () {
      get = function () {};
      $get = function () {};
      query = function () {};
      create = function () {};
      $create = function () {};
      action = {
        baseActions: {
          FOOget: {
            method: 'GET'
          },
          FOOquery: {
            method: 'GET'
          }
        },
        nameSpace: 'FOO'
      };
      Resource = function () {};
      Resource.FOOget = get;
      Resource.prototype.FOO$get = $get;
      Resource.FOOquery = query;
      Resource.BARcreate = create;
      Resource.prototype.BAR$create = $create;
    });

    it('should delete the actions defined by the passed in action from both the Resource and its prototype', function () {
      parseResource._deNamespaceBaseActions(Resource, action);
      expect(Resource.FOOget).toBeUndefined();
      expect(Resource.prototype.FOO$get).toBeUndefined();
      expect(Resource.FOOquery).toBeUndefined();
    });

    it('should set a property matching non-namespaced static action name to the static action', function () {
      parseResource._deNamespaceBaseActions(Resource, action);
      expect(Resource.get).toBe(get);
      expect(Resource.query).toBe(query);
    });

    it('should set a property matching non-namespaced instance action name to the instance action', function () {
      parseResource._deNamespaceBaseActions(Resource, action);
      expect(Resource.prototype.$get).toBe($get);
    });

    it('should not create the instance property unless the instance action exists', function () {
      parseResource._deNamespaceBaseActions(Resource, action);
      expect(Object.hasOwnProperty(Resource.prototype, '$query')).toBeFalse();
    });

    it('should not affect properties that do not share the action\'s namespace', function () {
      parseResource._deNamespaceBaseActions(Resource, action);
      expect(Resource.BARcreate).toBe(create);
      expect(Resource.prototype.BAR$create).toBe($create);
      expect(Resource.create).toBeUndefined();
      expect(Resource.prototype.$create).toBeUndefined();
    });
  });

  describe('_deleteAndReturnAction function', function () {
    var Resource, actionName, foo;

    beforeEach(function () {
      actionName = 'foo';
      Resource = function () {};
      foo = function () {};
      Resource.foo = foo;
      Resource.prototype.$foo = function () {};
    });

    it('should delete the named action from the Resource and its prototype', function () {
      expect(Resource.foo).toBeFunction();
      expect(Resource.prototype.$foo).toBeFunction();
      parseResource._deleteAndReturnAction(Resource, actionName);
      expect(Resource.foo).toBeUndefined();
      expect(Resource.prototype.$foo).toBeUndefined();
    });

    it('should returned the named static action from the Resource', function () {
      var returnedAction = parseResource._deleteAndReturnAction(Resource, actionName);
      expect(returnedAction).toBe(foo);
    });
  });

  describe('_destoryUndefinedActions function', function () {
    var Resource, actions, get, $get, query, save, $save, className;

    beforeEach(function () {
      get = function () {};
      $get = function () {};
      query = function () {};
      save = function () {};
      $save = function () {};
      actions = {
        get: {},
        query: {}
      };
      Resource = function () {};
      Resource.get = get;
      Resource.prototype.$get = $get;
      Resource.query = query;
      Resource.save = save;
      Resource.prototype.$save = $save;
      Resource.className = className;
      Resource.prototype.className = className;
    });

    it('should delete actions from a resource and its prototype that aren\'t defined in actions', function () {
      parseResource._destoryUndefinedActions(Resource, actions);
      expect(Resource.save).toBeUndefined();
      expect(Resource.prototype.$save).toBeUndefined();
    });

    it('should not delete properties that do not match the action name pattern (Resource.name / Resource.prototype.$name)', function () {
      parseResource._destoryUndefinedActions(Resource, actions);
      expect(Resource.className).toEqual(className);
      expect(Resource.prototype.className).toEqual(className);
    });

    it('should not delete actions that are defined in the actions object', function () {
      parseResource._destoryUndefinedActions(Resource, actions);
      expect(Resource.get).toBe(get);
      expect(Resource.prototype.$get).toBe($get);
      expect(Resource.query).toBe(query);
    });
  });

  describe('_createInstanceAction function', function () {
    var Resource, actionName, staticResult;

    beforeEach(function () {
      actionName = 'get';
      Resource = function () {};
      staticResult = {};
      Resource.get = function () {
        return staticResult;
      };
      spyOn(Resource, 'get').andCallThrough();
    });

    it('should create a function on the prototype whose name is the actionName prefixed by "$"', function () {
      parseResource._createInstanceAction(Resource, actionName);
      expect(Resource.prototype.$get).toBeFunction();
    });

    describe('instance action', function () {
      var instance, params, onSuccess, onError, instanceResult;

      beforeEach(function () {
        parseResource._createInstanceAction(Resource, actionName);
        instance = new Resource();
        params = {
          a: 1,
          b: 2
        };
        onSuccess = function () {};
        onError = function () {};
      });

      it('should call the action on the Resource', function () {
        instance.$get();
        expect(Resource.get).toHaveBeenCalled();
      });

      it('should pass its first object argument to the static action as the first argument', function () {
        var paramsArg;
        instance.$get(params, onSuccess, onError);
        paramsArg = Resource.get.argsForCall[0][0];
        expect(paramsArg).toBe(params);
      });

      it('should pass an empty object as the first argument to the static action if it does not receive a params argument', function () {
        var paramsArg;
        instance.$get(onSuccess, onError);
        paramsArg = Resource.get.argsForCall[0][0];
        expect(paramsArg).toEqual({});
      });

      it('should pass itself as the second argument to the static action', function () {
        var dataArg;
        instance.$get(onSuccess, onError);
        dataArg = Resource.get.argsForCall[0][1];
        expect(dataArg).toBe(instance);
      });

      it('should pass success and error callbacks to the static action', function () {
        var successArg, errorArg;
        // This should work
        instance.$get(params, onSuccess, onError);
        successArg = Resource.get.argsForCall[0][2];
        errorArg = Resource.get.argsForCall[0][3];
        expect(successArg).toBe(onSuccess);
        expect(errorArg).toBe(onError);
        // So should this
        Resource.get.reset();
        instance.$get(onSuccess, onError);
        successArg = Resource.get.argsForCall[0][2];
        errorArg = Resource.get.argsForCall[0][3];
        expect(successArg).toBe(onSuccess);
        expect(errorArg).toBe(onError);
      });

      it('should return the $promise from the static action if it exists', function () {
        staticResult.$promise = {};
        instanceResult = instance.$get();
        expect(instanceResult).toBe(staticResult.$promise);
      });

      it('should return the actual result from the static action if the result does not have a $promise', function () {
        staticResult = {};
        instanceResult = instance.$get();
        expect(instanceResult).toBe(staticResult);
      });
    });

  });

  describe('createAppResourceFactory function', function () {
    var appConfig, appStorage, appEventBus, appResourceFactory;

    beforeEach(function () {
      appConfig = {};
      appStorage = {};
      appEventBus = {
        on: jasmine.createSpy(),
        once: jasmine.createSpy(),
        emit: jasmine.createSpy()
      };
    });

    it('should be a function', function () {
      expect(parseResource.createAppResourceFactory).toBeFunction();
    });

    it('should call the _createCoreAppResourceFactory', function () {
      spyOn(parseResource, '_createCoreAppResourceFactory').andCallThrough();
      parseResource.createAppResourceFactory(appEventBus, appStorage);
      expect(parseResource._createCoreAppResourceFactory).toHaveBeenCalledWith(appEventBus, appStorage);
    });


    it('should emit a MODULE_REGISTERED event with its module name', function () {
      parseResource.createAppResourceFactory(appEventBus, appStorage);
      expect(appEventBus.emit).toHaveBeenCalledWith(PARSE_APP_EVENTS.MODULE_REGISTERED, moduleName);
    });

    it('should register a one-time event handler for a namespaced MODULE_INIT event', function () {
      var eventName = PARSE_APP_EVENTS.MODULE_INIT + '.' + moduleName,
        eventHasHandler = false;
      parseResource.createAppResourceFactory(appEventBus, appStorage);
      expect(appEventBus.once).toHaveBeenCalled();
      angular.forEach(appEventBus.once.argsForCall, function (args) {
        eventHasHandler = eventHasHandler || (args[0] === eventName);
        eventHasHandler = eventHasHandler && angular.isFunction(args[1]);
      });
      expect(eventHasHandler).toBeTrue();
    });

    it('should register an event handler for the USE_REST_API event', function () {
      var eventName = PARSE_APP_EVENTS.USE_REST_API,
        eventHasHandler = false;
      parseResource.createAppResourceFactory(appEventBus, appStorage);
      expect(appEventBus.on).toHaveBeenCalled();
      angular.forEach(appEventBus.on.argsForCall, function (args) {
        eventHasHandler = eventHasHandler || (args[0] === eventName);
        eventHasHandler = eventHasHandler && angular.isFunction(args[1]);
      });
      expect(eventHasHandler).toBeTrue();
    });

    it('should register an event handler for the USE_JS_API event', function () {
      var eventName = PARSE_APP_EVENTS.USE_JS_API,
        eventHasHandler = false;
      parseResource.createAppResourceFactory(appEventBus, appStorage);
      expect(appEventBus.on).toHaveBeenCalled();
      angular.forEach(appEventBus.on.argsForCall, function (args) {
        eventHasHandler = eventHasHandler || (args[0] === eventName);
        eventHasHandler = eventHasHandler && angular.isFunction(args[1]);
      });
      expect(eventHasHandler).toBeTrue();
    });

    it('should return a function', function () {
      appResourceFactory = parseResource.createAppResourceFactory(appEventBus, appStorage);
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
        appResourceFactory = parseResource.createAppResourceFactory(appEventBus, appStorage);
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