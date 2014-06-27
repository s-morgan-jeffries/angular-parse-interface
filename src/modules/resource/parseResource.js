angular.module('angularParseInterface.resourceMod')
  .factory('parseResource', function ($resource, parseRequestHeaders, parseDataEncoding) {
    'use strict';

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

    var parseResource = {};

    parseResource.createAppResourceFactory = function (appConfig, appStorage, appEventBus) {

      var addRequestHeaders = parseRequestHeaders.getTransformRequest(appConfig, appStorage, appEventBus);

      return function appResourceFactory(url, defaultParams, customActions) {
        var restApiBaseUrl = 'https://api.parse.com/1',
          baseActions,
          actions,
          Resource;

        var prependBaseUrl = function (url) {
          return restApiBaseUrl.replace(/\/+$/, '') + '/' + url.replace(/^\/+/, '');
        };

        // t0d0: Rewrite these
        var dataEncodingFunctions = parseDataEncoding.getTransformFunctions();

//        var dataEncodingFunctions = parseDataEncoding.getTransformRequest();
//
//        var dataEncodingFunctions = parseDataEncoding.getTransformResponse();

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
          transformResArray.push(dataEncodingFunctions.transformResponse);
          // The "first" step (the final step in this function) is parsing the JSON
          transformResArray.push(parseJSON);
        };
        //   From here to the end of the comment is basically code that deals with custom actions. Something interesting
        // here: you could almost wrap the definition of each of these actions around the underlying code, with the call
        // to appResourceFactory in the middle, except for the fact that some of the actions use Resource in their
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
//        dataEncodingFunctions.setResource(Resource);
        dataEncodingFunctions.setResource(Resource);

        // Return the Resource
        return Resource;
//          actions;
//          baseActions = {
//            get: {
//              method: 'GET',
//              transformResponse: function (data) {
//                data = angular.fromJson(data);
//                return new Resource(decodeResponseData(Resource, data));
//              }
//            },
//            query: {
//              method: 'GET',
//              isArray: true,
//              transformResponse: function (data) {
//                var results = angular.fromJson(data).results;
//                if (!results) {
//                  return [];
//                }
//                return angular.forEach(results, function (item, idx, col) {
//                  col[idx] = new Resource(decodeResponseData(Resource, item));
//                });
//              }
//            },
//            count: {
//              method: 'GET',
//              isArray: false,
//              transformResponse: function (data) {
//                var count = angular.fromJson(data).count;
//                return {count: count};
//              }
//            },
//            create: {
//              method: 'POST',
//              transformRequest: function (data) {
//                return angular.toJson(encodeRequestData(Resource, data));
//              }
//            },
//            update: {
//              method: 'PUT',
//              transformRequest: function (data/*, headersGetter*/) {
//                return angular.toJson(encodeRequestData(Resource, data));
//              }
//            },
//            // For sending arbitrary data via put requests
//            putData: {
//              method: 'PUT'
//            },
//            remove: {
//              method: 'DELETE'
//            },
//            delete: {
//              method: 'DELETE'
//            }
//          };
//
//        var isInstance = function (obj/*, idx, col*/) {
//          return obj instanceof Resource;
//        };
//
//        var isParams = function (obj/*, idx, col*/) {
//          return (typeof obj === 'object') && !isInstance(obj);
//        };
//
//        var find = function (ar, pred) {
//          for (var i = 0, len = ar.length; i < len; i++) {
//            if (pred(ar[i])) {
//              return ar[i];
//            }
//          }
//        };
//
//        var findLast = function (ar, pred) {
//          return find(angular.copy(ar).reverse(), pred);
//        };
//
//        var setDefaults = function (dst, src) {
//          angular.forEach(src, function (val, key) {
//            dst[key] = dst[key] || src[key];
//          });
//          return dst;
//        };
//
//        var ownDataProps = function (obj) {
//          var objData = {};
//          angular.forEach(obj, function (val, key) {
//            if (!angular.isFunction(val)) {
//              objData[key] = val;
//            }
//          });
//          return objData;
//        };


//        actions = angular.extend(baseActions, (customActions || {}));

//        addParseRequestHeaders(actions, appConfig, appStorage);

//
//        Resource.putData = (function () {
//          var putData = Resource.putData;
//
//          return function () {
//            var args,
//              data,
//              instance,
//              params,
//              successFunc,
//              errorFunc;
//
//            // Turn arguments into an actual array
//            args = [].slice.call(arguments);
//            // Get the data for the put request
//            data = find(args, isParams);
//            // Figure out which argument is the instance; this has to exist so we can get its objectId
//            instance = find(args, isInstance);
//            // Create the parameters
//            params = {
//              objectId: instance.objectId
//            };
//
//            // The success function that was passed in, or a do-nothing function if there wasn't one
//            successFunc = find(args, angular.isFunction) || angular.noop;
//            // The error function that was passed in, or a do-nothing function if there wasn't one
//            errorFunc = findLast(args, angular.isFunction) || angular.noop;
//            // If the error function is the same as the save function, set errorFunc to angular.noop
//            errorFunc = (errorFunc === successFunc) ? angular.noop : errorFunc;
//
//            // Delegate to the original function...
//            return putData.call(this, params, data, successFunc, errorFunc);
//          };
//        }());
//
//        Resource.query = (function () {
//          var query = Resource.query,
//            count = Resource.count;
//
//          delete Resource.count;
//          delete Resource.prototype.$count;
//
//          return function () {
//            var args,
//              params,
//              isCountQuery,
//              queryFx;
//
//            // Turn arguments into an actual array
//            args = [].slice.call(arguments);
//            // Get the parameters we're saving (or an empty object)
//            params = find(args, isParams) || {};
//            isCountQuery = angular.equals(params.count, 1);
//
//            queryFx = isCountQuery ? count : query;
//            // Delegate to the original function...
//            return queryFx.apply(this, args);
//          };
//        }());
//
//        // Have to do something smart here so that:
//        // 1) save delegates to separate functions under the hood for creating (using POST) and updating (using PUT), and
//        // 2) instance properties are restored after a successful save
//        // The first issue is easy to fix. You always get the instance as one of the arguments, so you just check to see if
//        // it's new and call the appropriate function accordingly.
//        // The second issue is a little trickier. For reasons I don't fully understand yet, when you save an instance to
//        // Parse, you wind up losing all of its properties, except for the ones that are returned from the server. That only
//        // happens when you call the instance method (so probably related to "this" within angular-resource.js).
//        // Key point to remember is that you want this to behave just like $resource's built-in save function.
//        Resource.save = (function () {
//          var create = Resource.create,
//            update = Resource.update;
//
//          delete Resource.create;
//          delete Resource.update;
//          delete Resource.prototype.$create;
//          delete Resource.prototype.$update;
//
//          return function () {
//            var args,
//              params,
//              instance,
//              originalInstanceProps,
//              updatedInstanceProps,
//              errorFunc,
//              successFunc,
//              wrappedSuccessFunc,
//              wrappedErrorFunc,
//              saveFunc;
//
//            // Turn arguments into an actual array
//            args = [].slice.call(arguments);
//            // Get the parameters we're saving (or an empty object)
//            params = find(args, isParams) || {};
//            // Figure out which argument is the instance and create one if it doesn't exist
//            instance = find(args, isInstance) || new Resource(params);
//            // These are all the the own properties that aren't methods
//            originalInstanceProps = ownDataProps(instance);
//            // originalInstanceProps extended with the params (where there's a conflict, params will overwrite
//            // originalInstanceProps)
//            updatedInstanceProps = angular.extend(originalInstanceProps, params);
//
//            // The success function that was passed in, or a do-nothing function if there wasn't one
//            successFunc = find(args, angular.isFunction) || angular.noop;
//            // Provide updatedInstanceProps as default values to the new instance (if there are conflicting
//            // properties from the server, those will win)
//            wrappedSuccessFunc = function (newInstance, responseHeaders) {
//              setDefaults(newInstance, updatedInstanceProps);
//              successFunc(newInstance, responseHeaders);
//            };
//            // The error function that was passed in, or a do-nothing function if there wasn't one
//            errorFunc = findLast(args, angular.isFunction) || angular.noop;
//            // If the error function is the same as the save function, set errorFunc to angular.noop
//            errorFunc = (errorFunc === successFunc) ? angular.noop : errorFunc;
//            // In case there's a problem, this basically resets the instance
//            wrappedErrorFunc = function (response) {
//              angular.extend(instance, originalInstanceProps);
//              errorFunc(response);
//            };
//
//            // Delegate to the correct function depending on whether this is a creation or update
//            saveFunc = instance.isNew() ? create : update;
//            // Delegate to the original function...
//            return saveFunc.call(this, params, instance, wrappedSuccessFunc, wrappedErrorFunc);
//          };
//        }());

      };

    };

    return parseResource;
  });