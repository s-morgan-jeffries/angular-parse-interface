angular.module('angularParseInterface')
  .factory('parseResource', function ($resource, parseRequestHeaders, parseDataEncoding, parseResourceDecorator/*, $log*/) {
    'use strict';

    var parseResource = {};

    //   The purpose of this function is to modify the $resource service so that it adds appropriate headers and
    // encodes/decodes data in the correct format for Parse.
    parseResource.createAppResourceFactory = function (appConfig, appStorage, appEventBus) {
      var coreAppResourceFactory = this.createCoreAppResourceFactory(appConfig, appStorage, appEventBus);

      // Okay for now. What do you want this to do ultimately? You probably don't want to leave customActions in its
      // current state. For example, you probably want objects to have certain actions but not others.
      return function appResourceFactory(url, defaultParams, actions) {
        var Resource,
          actionConfigs = {};

        // Add actions
        angular.forEach(actions, function (action) {
          // Extend the customActions with any actions defined on the actionAdder (will work even if that property
          // isn't defined)
          angular.extend(actionConfigs, action.actionConfigs);
        });
//        $log.log(actionConfigs);

        // Create the Resource
        Resource = coreAppResourceFactory(url, defaultParams, actionConfigs);

        // Decorate with decorators
        angular.forEach(actions, function (action) {
          if (angular.isFunction(action.decorator)) {
            action.decorator(Resource);
          }
        });

        // Remove any actions that weren't part of the actionAdders object
        angular.forEach(Resource, function (v, k) {
          var isAction = function (name) {
            return Resource.hasOwnProperty(name) && Resource.prototype.hasOwnProperty('$' + name);
          };
          if (isAction(k) && !actions[k]) {
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
    // I'm not crazy about exposing this on the service when it's actually only used within this file, but it does make
    // it very testable. Also, I briefly toyed with combining this function with createAppResourceFactory, but it was an
    // inscrutable mess.
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