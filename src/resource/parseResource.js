angular.module('angularParseInterface')
  .factory('parseResource', function ($resource, PARSE_APP_EVENTS, parseRESTAuth, parseJSAuth, parseDataEncoding, parseResourceDecorator) {
    'use strict';

    var parseResource = {};

    //   The purpose of this function is to modify the $resource service so that it adds appropriate headers and
    // encodes/decodes data in the correct format for Parse.
    parseResource.createAppResourceFactory = function (appEventBus, appStorage) {
      var coreAppResourceFactory = this._createCoreAppResourceFactory(appEventBus, appStorage),
        generateAPIAction = this._generateAPIAction.bind(this),
        deNamespaceBaseActions = this._deNamespaceBaseActions,
        deleteAndReturnAction = this._deleteAndReturnAction,
        destoryUndefinedActions = this._destoryUndefinedActions,
        createInstanceAction = this._createInstanceAction,
        apiNames = ['REST', 'JS'],
        currentAPI,
        moduleName = 'parseResource',
      // Namespaced initialization event. The appInterface will emit this with the appConfig when the
      // MODULE_REGISTERED event is emitted with our moduleName.
        INIT_EVENT = PARSE_APP_EVENTS.MODULE_INIT + '.' + moduleName;

      // Register event handlers
      // Register the handler for the INIT_EVENT
      appEventBus.once(INIT_EVENT, function (event, appConfig) {
        // Determine which API we're using
        currentAPI = appConfig.currentAPI;
      });
      // Now that the handler is set up, we can emit the MODULE_REGISTERED event, which will cause the appInterface to
      // emit the INIT_EVENT with the appConfig
      appEventBus.emit(PARSE_APP_EVENTS.MODULE_REGISTERED, moduleName);
      // On a USE_REST_API event, set useRestApi to true
      appEventBus.on(PARSE_APP_EVENTS.USE_REST_API, function () {
        currentAPI = 'REST';
      });
      // On a USE_JS_API event, set useRestApi to false
      appEventBus.on(PARSE_APP_EVENTS.USE_JS_API, function () {
        currentAPI = 'JS';
      });

      // Okay for now. What do you want this to do ultimately? You probably don't want to leave customActions in its
      // current state. For example, you probably want objects to have certain actions but not others.
      return function appResourceFactory(url, defaultParams, actions) {
        var Resource,
          baseActions = {};

        // Configure actions for each API and generate baseActions that will be fed into coreAppResourceFactory
        angular.forEach(actions, function (action) {
          var origAction = angular.copy(action);
          action.apiActions = {};
          angular.forEach(apiNames, function (apiName) {
            action.apiActions[apiName] = generateAPIAction(origAction, apiName);
            angular.extend(baseActions, action.apiActions[apiName].baseActions);
          });
        });

        // Create the Resource
        Resource = coreAppResourceFactory(url, defaultParams, baseActions);

        //t0d0: Add tests for this (specifically that it changes based on value of currentAPI)
        // This loops through each action for both APIs and creates API-specific versions of that action. It then
        // creates a non-namespaced version of the action that delegates to the correct API-specific version based on
        // which API we're using. At the end of this, all the namespaced properties should be deleted from both Resource
        // and its prototype.
        angular.forEach(actions, function (action, actionName) {
          var apiActions = {};
          angular.forEach(apiNames, function (apiName) {
            var apiAction = action.apiActions[apiName];
            deNamespaceBaseActions(Resource, apiAction);
            if (angular.isFunction(apiAction.decorator)) {
              apiAction.decorator(Resource);
            }
            // Check here whether the action has an instance action
            action.hasInstanceAction = angular.isFunction(Resource.prototype['$' + actionName]);
            apiActions[apiName] = deleteAndReturnAction(Resource, actionName);
          });
          // Now you've got namespaced versions of your actions. This creates a new static method that delegates to
          // delegate to the correct action based on which API we're using.
          Resource[actionName] = function () {
            return apiActions[currentAPI].apply(Resource, arguments);
          };
        });

        // t0d0: Test this
        // Now it's time for some cleanup. This loops through each of Resource's properties and tries to identify
        // actions (based on whether there's a $-prefixed version of the property on Resource.prototype. If it finds any
        // that aren't in the actions object, it deletes them from Resource and Resource.prototype.
        destoryUndefinedActions(Resource, actions);

        // t0d0: Test this
          // You should detect above whether a given action has an associated instance action
        // Just to be safe, let's reset the prototype...
        Resource.prototype = {};
        // ... and add the instance actions back in
        angular.forEach(actions, function (action, actionName) {
          if (action.hasInstanceAction) {
            createInstanceAction(Resource, actionName);
          }
        });

        // Apply the decorator
        parseResourceDecorator(Resource);

        return Resource;
      };
    };

    parseResource._getPseudoMethodTransform = function (method) {
      return function (data/*, headersGetter */) {
        data = data || {};
        data._method = method;
        return data;
      };
    };

    // This should generate a set of namespaced actions
    parseResource._namespaceBaseActions = function (action, nameSpace) {
      var namespacedAction = angular.copy(action);
      namespacedAction.nameSpace = nameSpace;
      angular.forEach(action.baseActions, function (baseAction, baseActionName) {
        var newBaseActionName = nameSpace + baseActionName;
        delete namespacedAction.baseActions[baseActionName];
        namespacedAction.baseActions[newBaseActionName] = angular.copy(baseAction);
      });
      return namespacedAction;
    };

    // Generates a REST API-specific version of an action
    parseResource._generateRESTAction = function (action, nameSpace) {
      var namespaceBaseActions = this._namespaceBaseActions;
      return namespaceBaseActions(action, nameSpace);
    };

    // Generates a JS API-specific version of an action
    parseResource._generateJSAction = function (action, nameSpace) {
      var namespaceBaseActions = this._namespaceBaseActions,
        getPseudoMethodTransform = this._getPseudoMethodTransform,
        jsAction = namespaceBaseActions(action, nameSpace);
      angular.forEach(jsAction.baseActions, function (subAction/*, subActionName*/) {
        if (subAction.method !== 'POST') {
          var addPseudoMethod = getPseudoMethodTransform(subAction.method);
          subAction.method = 'POST';
          subAction.transformRequest = subAction.transformRequest || [];
          // Add the addPseudoMethod function to the transformRequest array
          subAction.transformRequest.push(addPseudoMethod);
        }
      });
      return jsAction;
    };

    // Delegates to API-specific methods for generating API-specific actions from actions
    parseResource._generateAPIAction = function (action, API) {
      var generateRESTAction = this._generateRESTAction.bind(this),
        generateJSAction = this._generateJSAction.bind(this),
        generateAPIActionFx;
      if (API === 'REST') {
        generateAPIActionFx = generateRESTAction;
      } else if (API === 'JS') {
        generateAPIActionFx = generateJSAction;
      }
      return generateAPIActionFx(action, API);
    };

    // This removes the namespacing from the baseActions. This is done so that the decorators, which aren't written
    // with any assumptions about namespacing, will still work (otherwise they couldn't find the properties they
    // reference).
    parseResource._deNamespaceBaseActions = function (Resource, action) {
      var nameSpace = action.nameSpace;
      angular.forEach(action.baseActions, function (baseAction, namespacedActionName) {
        var namespacedStaticName = namespacedActionName,
          baseStaticName = namespacedActionName.slice(nameSpace.length),
          namespacedInstanceName = nameSpace + '$' + baseStaticName,
          baseInstanceName = '$' + baseStaticName,
          staticAction = Resource[namespacedStaticName],
          instanceAction = Resource.prototype[namespacedInstanceName];
        delete Resource[namespacedStaticName];
        delete Resource.prototype[namespacedInstanceName];
        Resource[baseStaticName] = staticAction;
        if (instanceAction) {
          Resource.prototype[baseInstanceName] = instanceAction;
        }
      });
    };

    // This deletes the action from Resource and its prototype and returns the static action
    parseResource._deleteAndReturnAction = function (Resource, actionName) {
      var instanceActionName = '$' + actionName,
        staticAction = Resource[actionName];
      delete Resource[actionName];
      delete Resource.prototype[instanceActionName];
      return staticAction;
    };

    // This loops through each of Resource's properties and tries to identify actions (based on whether there's a
    // $-prefixed version of the property on Resource.prototype. If it finds any that aren't in the actions object, it
    // deletes them from Resource and Resource.prototype.
    parseResource._destoryUndefinedActions = function (Resource, actions) {
      var isAction = function (name) {
        return Resource.hasOwnProperty(name) && Resource.prototype.hasOwnProperty('$' + name);
      };
      angular.forEach(Resource, function (v, k) {
        if (isAction(k) && !actions[k]) {
          delete Resource[k];
          delete Resource.prototype['$' + k];
        }
      });
    };

    // Creates the named action on the prototype. This is copied with minimal modifications from
    // angular-resource.js.
    parseResource._createInstanceAction = function (Resource, actionName) {
      Resource.prototype['$' + actionName] = function (params, success, error) {
        if (angular.isFunction(params)) {
          error = success;
          success = params;
          params = {};
        }
        var result = Resource[actionName].call(this, params, this, success, error);
        return result.$promise || result;
      };
    };

    // This creates the core app resource. It's concerned with encoding/decoding of data and the addition of the
    // appropriate headers. A separate function deals with actions.
    // I'm not crazy about exposing this on the service when it's actually only used within this file, but it does make
    // it very testable. Also, I briefly toyed with combining this function with createAppResourceFactory, but it was an
    // inscrutable mess.
    parseResource._createCoreAppResourceFactory = function (appEventBus, appStorage) {

      var hasRequestBody = function (action) {
        // For Parse, these are currently the only methods for which a request body has any meaning
        var requestBodyMethods = ['POST', 'PUT'];
        return requestBodyMethods.indexOf(action.method) >= 0;
      };

      var stringifyData = function (data) {
        if (!angular.isString(data)) {
          data = angular.toJson(data);
        }
        return data;
      };

      var parseJSON = function (data) {
        if (angular.isString(data)) {
          data = angular.fromJson(data);
        }
        return data;
      };

      var addRESTAuth = parseRESTAuth.getTransformRequest(appEventBus, appStorage);

      var addJSAuth = parseJSAuth.getTransformRequest(appEventBus, appStorage);

      return function coreAppResourceFactory(url, defaultParams, actions) {
        var restApiBaseUrl = 'https://api.parse.com/1',
          Resource;

        var prependBaseUrl = function (url) {
          return restApiBaseUrl.replace(/\/+$/, '') + '/' + url.replace(/^\/+/, '');
        };

        var dataEncodingFunctions = parseDataEncoding.getTransformFunctions();

        var addTransformRequestFxs = function (action) {
          var transformReqArray;
          // If the action already has a transformRequest property, one of two things is true...
          if (action.transformRequest) {
            // ... either it's a function, and we need to put it in an array...
            if (angular.isFunction(action.transformRequest)) {
              action.transformRequest = [action.transformRequest];
            }
            // ... or it's already an array and we don't have to do anything with it.
          } else {
            // If it doesn't have a transformRequest property, we give it one and set it to an empty array
            action.transformRequest = [];
          }
          // In any case, I'm giving it a shorter name
          transformReqArray = action.transformRequest;
          // Check to see if we need to modify the data (only if the action has a request body)
          if (hasRequestBody(action)) {
            // If there's anything in the array, it might jsonify the data.
            if (transformReqArray.length) {
              // This does a conditional transformation (only parses if the data is already a string).
              transformReqArray.push(parseJSON);
            }
            // This is for the actual data encoding
            transformReqArray.push(dataEncodingFunctions.transformRequest);
          }
          // Every request will add the auth transforms
          transformReqArray.push(addRESTAuth);
          transformReqArray.push(addJSAuth);
          if (hasRequestBody(action)) {
            // Lastly, this is for stringifying the data. Again, it's done conditionally.
            transformReqArray.push(stringifyData);
          }
        };

        var addTransformResponseFxs = function (action) {
          var transformResArray;
          // If the action already has a transformResponse property, one of two things is true...
          if (action.transformResponse) {
            // ... either it's a function, and we need to put it in an array...
            if (angular.isFunction(action.transformResponse)) {
              action.transformResponse = [action.transformResponse];
            }
            // ... or it's already an array and we don't have to do anything with it.
          } else {
            // If it doesn't have a transformResponse property, we give it one and set it to an empty array
            action.transformResponse = [];
          }
          // In any case, I'm giving it a shorter name
          transformResArray = action.transformResponse;
          //   In contrast to encoding, decoding has to happen for every action, so we'll be responsible for the whole
          // process. Another, more important contrast with encoding is that we'll want any transformations that were
          // part of the custom action to be processed *last*. The reason for that is that consumers of this service
          // will expect the data to be in its decoded form already. Unfortunately, this means we can't make our
          // transformations fool-proof; since consumers will get at the data after we do, they'll either need to
          // expect that it's JSONified or parsed, but not either/or. I'm going with parsed, because converting the
          // data back to JSON seems stupid.
          //   Since we're adding our transformRequest functions to the front of the queue, we'll need to work in
          // reverse. The last step before we hand off the data is to decode it:
          transformResArray.unshift(dataEncodingFunctions.transformResponse);
          // The "first" step (the final step in this function) is parsing the JSON
          transformResArray.unshift(parseJSON);
        };

        url = prependBaseUrl(url);
        defaultParams = defaultParams || {};
        // In theory, this should be an error, but I'm going to leave it as is for now
        actions = actions || {};

        angular.forEach(actions, function (action) {
          addTransformRequestFxs(action);
          addTransformResponseFxs(action);
        });

        // Create the Resource
        Resource = $resource(url, defaultParams, actions);

        // Funny story. I forgot how closures work when I first wrote these. Now I'm backtracking, and the result is a
        // really clunky API.
        dataEncodingFunctions.setResource(Resource);
        // And then I decided to make a thing out of it. This will let you define custom actions from outside of this
        // function, even if they require a reference to the Resource.
        angular.forEach(actions, function (action) {
          if (action.setResource) {
            action.setResource(Resource);
          }
        });

        // Return the Resource
        return Resource;
      };
    };
    return parseResource;
  });