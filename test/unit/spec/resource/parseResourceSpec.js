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

  describe('_generateRESTActionConfig function', function () {
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
      parseResource._generateRESTActionConfig(action, nameSpace);
      expect(parseResource._namespaceBaseActions).toHaveBeenCalledWith(action, nameSpace);
    });
  });

  describe('_generateJSActionConfig function', function () {
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
      parseResource._generateJSActionConfig(action, nameSpace);
      expect(parseResource._namespaceBaseActions).toHaveBeenCalledWith(action, nameSpace);
    });

    it('should set the method to POST for any non-POST actions', function () {
      var transformedAction = parseResource._generateJSActionConfig(action, nameSpace);
      angular.forEach(transformedAction.baseActions, function (baseAction) {
        expect(baseAction.method).toEqual('POST');
      });
    });

    it('should call the _getPseudoMethodTransform function with the method name of any non-POST actions', function () {
      parseResource._generateJSActionConfig(action, nameSpace);
      expect(parseResource._getPseudoMethodTransform).toHaveBeenCalledWith('GET');
    });

    it('should create a transformRequest array for any non-POST actions if it doesn\'t exist', function () {
      var transformedAction = parseResource._generateJSActionConfig(action, nameSpace);
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
      transformedAction = parseResource._generateJSActionConfig(action, nameSpace);
      lastTransformRequest = transformedAction.baseActions[nameSpace + 'get'].transformRequest.pop();
      expect(lastTransformRequest).toBe(transformFunction);
    });
  });

  describe('_generateAPIActionConfig function', function () {
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

    it('should call _generateRESTActionConfig with both its arguments when its second argument is "REST"', function () {
      API = 'REST';
      spyOn(parseResource, '_generateRESTActionConfig');
      parseResource._generateAPIActionConfig(action, API);
      expect(parseResource._generateRESTActionConfig).toHaveBeenCalledWith(action, API);
    });

    it('should call _generateJSActionConfig with both its arguments when its second argument is "JS"', function () {
      API = 'JS';
      spyOn(parseResource, '_generateJSActionConfig');
      parseResource._generateAPIActionConfig(action, API);
      expect(parseResource._generateJSActionConfig).toHaveBeenCalledWith(action, API);
    });
  });

  describe('_createApiSpecificConfigs function', function () {
    var actions, origActions, apiNames, newActions, mockApiAction;

    beforeEach(function () {
      actions = {
        save: {
          baseActions: {
            save: {
              method: 'POST'
            },
            create: {
              method: 'POST'
            },
            update: {
              method: 'PUT'
            }
          },
          decorator: function () {}
        },
        get: {
          baseActions: {
            get: {
              method: 'GET'
            }
          }
        }
      };
      origActions = angular.copy(actions);
      mockApiAction = {
        f: function () {}
      };
      apiNames = ['REST', 'JS'];
      spyOn(parseResource, '_generateAPIActionConfig').andReturn(mockApiAction);
      newActions = parseResource._createApiSpecificConfigs(actions, apiNames);
    });

    it('should call _generateAPIActionConfig for each API for each actoin', function () {
      angular.forEach(origActions, function (action) {
        angular.forEach(apiNames, function (apiName) {
          expect(parseResource._generateAPIActionConfig).toHaveBeenCalledWith(action, apiName);
        });
      });
    });

    it('should return a new actions object with the same properties as the original actions object', function () {
      expect(newActions).toBeObject();
      expect(newActions).not.toBe(actions);
    });

    describe('newActions object', function () {
      it('should have a key for every key in the original actions object', function () {
        angular.forEach(actions, function (v, k) {
          expect(newActions[k]).toBeDefined();
        });
      });

      it('should store the return value from _generateAPIActionConfig in each action\'s apiActions[apiName] property', function () {
        angular.forEach(newActions, function (action) {
          angular.forEach(apiNames, function (apiName) {
            expect(action.apiActions[apiName]).toBe(mockApiAction);
          });
        });
      });
    });
  });

  describe('_generateBaseActions function', function () {
    var actions, baseActions;

    beforeEach(function () {
      actions = {
        save: {
          apiActions: {
            JS: {
              baseActions: {
                JSsave: {
                  f: function () {}
                },
                JScreate: {
                  f: function () {}
                },
                JSupdate: {
                  f: function () {}
                }
              }
            },
            REST: {
              baseActions: {
                RESTsave: {
                  f: function () {}
                },
                RESTcreate: {
                  f: function () {}
                },
                RESTupdate: {
                  f: function () {}
                }
              }
            }
          }
        }
      };
    });

    it('should add the baseActions for each API for each action to baseActions', function () {
      baseActions = parseResource._generateBaseActions(actions);
      expect(baseActions.JSsave).toBe(actions.save.apiActions.JS.baseActions.JSsave);
      expect(baseActions.JScreate).toBe(actions.save.apiActions.JS.baseActions.JScreate);
      expect(baseActions.JSupdate).toBe(actions.save.apiActions.JS.baseActions.JSupdate);
      expect(baseActions.RESTsave).toBe(actions.save.apiActions.REST.baseActions.RESTsave);
      expect(baseActions.RESTcreate).toBe(actions.save.apiActions.REST.baseActions.RESTcreate);
      expect(baseActions.RESTupdate).toBe(actions.save.apiActions.REST.baseActions.RESTupdate);
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

  describe('_createApiSpecificActions function', function () {
    var Resource, actions, apiActions;

    beforeEach(function () {
      Resource = function () {};
      actions = {
        save: {
          apiActions: {
            REST: {
              baseActions: {
                RESTsave: {
                  method: 'POST'
                },
                RESTcreate: {
                  method: 'POST'
                },
                RESTupdate: {
                  method: 'PUT'
                }
              },
              decorator: jasmine.createSpy()
            },
            JS: {
              baseActions: {
                JSsave: {
                  method: 'POST'
                },
                JScreate: {
                  method: 'POST'
                },
                JSupdate: {
                  method: 'PUT'
                }
              },
              decorator: jasmine.createSpy()
            }
          }
        }
      };
      spyOn(parseResource, '_deNamespaceBaseActions');
      spyOn(parseResource, '_deleteAndReturnAction').andCallFake(function () {
        return {
          Resource: arguments[0],
          actionName: arguments[1]
        };
      });
    });

    it('should de-namespace all the base actions associated with each action for each API', function () {
      apiActions = parseResource._createApiSpecificActions(Resource, actions);
      angular.forEach(actions, function (action) {
        angular.forEach(action.apiActions, function (thisApiAction) {
          expect(parseResource._deNamespaceBaseActions).toHaveBeenCalledWith(Resource, thisApiAction);
        });
      });
    });

    it('should call the decorator for each API-specific action that has one', function () {
      apiActions = parseResource._createApiSpecificActions(Resource, actions);
      expect(actions.save.apiActions.REST.decorator).toHaveBeenCalledWith(Resource);
      expect(actions.save.apiActions.JS.decorator).toHaveBeenCalledWith(Resource);
    });

    it('should set hasInstanceAction to true for any action where the Resource\'s prototype has a function property whose name matches the instance action pattern', function () {
      Resource.prototype.$save = function () {};
      apiActions = parseResource._createApiSpecificActions(Resource, actions);
      expect(actions.save.hasInstanceAction).toBeTrue();
    });

    it('should call _deleteAndReturnAction for each API for each action and store the result in the object it returns', function () {
      apiActions = parseResource._createApiSpecificActions(Resource, actions);
      angular.forEach(actions, function (action, actionName) {
        angular.forEach(action.apiActions, function (thisApiAction, apiName) {
          var expectedReturnVal = {
            Resource: Resource,
            actionName: actionName
          };
          expect(parseResource._deleteAndReturnAction).toHaveBeenCalledWith(Resource, actionName);
          expect(apiActions[actionName][apiName]).toEqual(expectedReturnVal);
        });
      });
    });
  });

  describe('_destroyUndefinedActions function', function () {
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
      parseResource._destroyUndefinedActions(Resource, actions);
      expect(Resource.save).toBeUndefined();
      expect(Resource.prototype.$save).toBeUndefined();
    });

    it('should not delete properties that do not match the action name pattern (Resource.name / Resource.prototype.$name)', function () {
      parseResource._destroyUndefinedActions(Resource, actions);
      expect(Resource.className).toEqual(className);
      expect(Resource.prototype.className).toEqual(className);
    });

    it('should not delete actions that are defined in the actions object', function () {
      parseResource._destroyUndefinedActions(Resource, actions);
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

  describe('resetPrototype function', function () {
    var Resource, origPrototype, actions;

    beforeEach(function () {
      origPrototype = {};
      Resource = function () {};
      Resource.prototype = origPrototype;
      actions = {
        get: {
          a: function () {},
          hasInstanceAction: true
        },
        POST: {
          b: function () {}
        }
      };
      spyOn(parseResource, '_createInstanceAction');
    });

    it('should overwrite the Resource\'s prototype', function () {
      parseResource._resetPrototype(Resource, actions);
      expect(Resource.prototype).not.toBe(origPrototype);
    });

    it('should create an instance action for any action where hasInstanceAction is true', function () {
      parseResource._resetPrototype(Resource, actions);
      expect(parseResource._createInstanceAction).toHaveBeenCalledWith(Resource, 'get');
    });

    it('should not create an instance action for any action where hasInstanceAction is falsy', function () {
      parseResource._resetPrototype(Resource, actions);
      expect(parseResource._createInstanceAction).not.toHaveBeenCalledWith(Resource, 'POST');
    });

  });

  describe('configureActions function', function () {
    var Resource, actions, moduleState, apiActions;

    beforeEach(function () {
      Resource = function () {};
      actions = {
        get: {
          a: function () {},
          thisMatters: false
        }
      };
      moduleState = {
        currentAPI: 'REST'
      };
      apiActions = {
        get: {
          JS: jasmine.createSpy(),
          REST: jasmine.createSpy()
        }
      };
      spyOn(parseResource, '_createApiSpecificActions').andReturn(apiActions);
      spyOn(parseResource, '_destroyUndefinedActions');
      spyOn(parseResource, '_resetPrototype');
      parseResource._configureActions(Resource, actions, moduleState);
    });

    it('should call the createApiSpecificActions function', function () {
      expect(parseResource._createApiSpecificActions).toHaveBeenCalledWith(Resource, actions);
    });

    it('should create a static action on Resource for every action in the actions configuration object', function () {
      expect(Resource.get).toBeFunction();
    });

    describe('configured static action', function () {
      var arg1, arg2;

      beforeEach(function () {
        arg1 = {
          f: function () {}
        };
        arg2 = {
          f: function () {}
        };
      });

      it('should call the JS-specific action if moduleState.currentAPI is set to JS', function () {
        moduleState.currentAPI = 'JS';
        Resource.get(arg1, arg2);
        expect(apiActions.get.JS).toHaveBeenCalledWith(arg1, arg2);
      });

      it('should call the REST-specific action if moduleState.currentAPI is set to REST', function () {
        moduleState.currentAPI = 'REST';
        Resource.get(arg1, arg2);
        expect(apiActions.get.REST).toHaveBeenCalledWith(arg1, arg2);
      });
    });

    it('should call the destroyUndefinedActions function', function () {
      expect(parseResource._destroyUndefinedActions).toHaveBeenCalledWith(Resource, actions);
    });

    it('should call the resetPrototype function', function () {
      expect(parseResource._resetPrototype).toHaveBeenCalledWith(Resource, actions);
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
      var url, defaultParams, actions, configuredActions, baseActions, Resource, apiNames;

      beforeEach(function () {
        url = 'a/url/for/you';
        defaultParams = {
          f: function () {}
        };
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
        configuredActions = {
          f: function () {}
        };
        baseActions = {
          f: function () {}
        };
        apiNames = ['REST', 'JS'];
        spyOn(parseResource, '_createApiSpecificConfigs').andReturn(configuredActions);
        spyOn(parseResource, '_generateBaseActions').andReturn(baseActions);
        // This isn't because we need a spy, it's only so we can return our mock object in place of the normal return object
        spyOn(parseResource, '_createCoreAppResourceFactory').andReturn(mocks.coreAppResourceFactory);
        spyOn(parseResource, '_configureActions');
        appResourceFactory = parseResource.createAppResourceFactory(appEventBus, appStorage);
      });

      it('should call the createApiSpecificConfigs function', function () {
        Resource = appResourceFactory(url, defaultParams, actions);
        expect(parseResource._createApiSpecificConfigs).toHaveBeenCalledWith(actions, apiNames);
      });

      it('should call the generateBaseActions function', function () {
        Resource = appResourceFactory(url, defaultParams, actions);
        expect(parseResource._generateBaseActions).toHaveBeenCalledWith(configuredActions);
      });

      it('should call the coreAppResourceFactory function', function () {
        Resource = appResourceFactory(url, defaultParams, actions);
        expect(mocks.coreAppResourceFactory).toHaveBeenCalledWith(url, defaultParams, baseActions);
      });

      it('should call the configureActions function', function () {
        // This initializes the module with the current API
        var handler = appEventBus.once.argsForCall[0][1],
          appConfig = {
            currentAPI: 'REST'
          },
          moduleState = {
            currentAPI: 'REST'
          };
        handler(null, appConfig);
        // Now call the function
        Resource = appResourceFactory(url, defaultParams, actions);
        expect(parseResource._configureActions).toHaveBeenCalledWith(Resource, configuredActions, moduleState);
      });

      it('it should call parseResourceDecorator with the Resource', function () {
        Resource = appResourceFactory(url, defaultParams, actions);
        expect(mocks.parseResourceDecorator).toHaveBeenCalledWith(Resource);
      });

      it('should return the Resource', function () {
//        appResourceFactory = parseResource.createAppResourceFactory(appEventBus, appStorage);
        Resource = appResourceFactory(url, defaultParams, actions);
        expect(Resource).toBe(mocks.Resource);
      });
    });
  });
});