angular.module('angularParseInterface')
  .factory('parseResource', function ($resource, parseRequestHeaders, parseDataEncoding, parseResourceDecorator) {
    'use strict';

    var parseResource = {};

    // t0d0: Write tests for parseResource.createAppResourceFactory
    parseResource.createAppResourceFactory = function (appConfig, appStorage, appEventBus) {
      var coreAppResourceFactory = this.createCoreAppResourceFactory(appConfig, appStorage, appEventBus);

      // Okay for now. What do you want this to do ultimately? You probably don't want to leave customActions in its
      // current state. For example, you probably want objects to have certain actions but not others.
      return function appResourceFactory(url, defaultParams, actionAdders) {
        var Resource,
          customActions = {};

        // Add actions
        angular.forEach(actionAdders, function (actionAdder) {
          // Extend the customActions with any actions defined on the actionAdder (will work even if that property
          // isn't defined)
          angular.extend(customActions, actionAdder.actions);
        });

        // Create the Resource
        Resource = coreAppResourceFactory(url, defaultParams, customActions);

        // Decorate with decorators
        angular.forEach(actionAdders, function (actionAdder) {
          if (angular.isFunction(actionAdder.decorator)) {
            actionAdder.decorator(Resource);
          }
        });

        // Remove any actions that weren't part of the actionAdders object
        angular.forEach(Resource, function (v, k) {
          var isAction = function (name) {
            return Resource.hasOwnProperty(name) && Resource.prototype.hasOwnProperty('$' + name);
          };
          if (isAction(k) && !actionAdders[k]) {
            delete Resource[k];
            delete Resource.prototype['$' + k];
          }
        });

        // Apply the decorator
        parseResourceDecorator(Resource);

        return Resource;
      };
    };

    // This creates the core app resource. It's concerned with encoding/decoding of data and the addition of the
    // appropriate headers. A separate function deals with actions.
    parseResource.createCoreAppResourceFactory = function (appConfig, appStorage, appEventBus) {

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

      var addRequestHeaders = parseRequestHeaders.getTransformRequest(appConfig, appStorage, appEventBus);

      return function coreAppResourceFactory(url, defaultParams, customActions) {
        var restApiBaseUrl = 'https://api.parse.com/1',
          baseActions,
          actions,
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
            // And this is for stringifying the data
            transformReqArray.push(stringifyData);
          }
          // Every request will add headers
          transformReqArray.push(addRequestHeaders);
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
        //   From here to the end of the comment is basically code that deals with custom actions. Something interesting
        // here: you could almost wrap the definition of each of these actions around the underlying code, with the call
        // to coreAppResourceFactory in the middle, except for the fact that some of the actions use Resource in their
        // definitions. So you may have to think of a way to pass them in so that Resource can be passed to them as an
        // argument. (Maybe pass an argument to customActions that are functions?)
        //   In any case, these don't really belong here, as they require this function to do too much. The purpose of
        // this function is to modify the $resource service so that it adds appropriate headers and encodes/decodes data
        // in the correct format for Parse.
        //   Right, so how to do that? The request headers part is easy. Every action will get the transformRequest for
        // adding headers. Every non-GET action will also get a transformRequest function to convert the data to JSON if
        // it isn't already (since they all get at least one transformRequest function, angular won't do this
        // automatically). Data encoding transformRequests only need to be added to non-GET requests, since GET requests
        // don't have a body. Conversely, data decoding has to be applied to every response.

        url = prependBaseUrl(url);
        defaultParams = defaultParams || {};
        customActions = customActions || {};

        // t0d0: Move this into the action library function
        // In order for us to add the required transformRequest and transformResponse functions to our actions, they
        // have to be visible inside this function. That means we have to re-define all the built-in actions here.
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

        // This allows us to override the above definitions with any customActions that were passed in:
        actions = angular.extend(baseActions, customActions);

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