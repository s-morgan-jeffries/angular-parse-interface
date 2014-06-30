angular.module('angularParseInterface')
  .factory('parseResourceActions', function () {
    'use strict';

    // The point of this module is to serve as a library of actions for the parseResource service. Actions are tricky
    // to write, so this is definitely an area where you want the code to be reusable. Rather than relying inheritance,
    // these function like mixins.
    var parseResourceActions = {};

    // Find the first item in an array for which the predicate is true
    var find = function (ar, pred) {
      for (var i = 0, len = ar.length; i < len; i++) {
        if (pred(ar[i])) {
          return ar[i];
        }
      }
    };

    // Find the last item in an array for which the predicate is true
    var findLast = function (ar, pred) {
      for (var i = ar.length - 1; i >= 0; i--) {
        if (pred(ar[i])) {
          return ar[i];
        }
      }
    };

    // Replacement for _.defaults.
    var setDefaults = function (dst, src) {
      angular.forEach(src, function (val, key) {
        dst[key] = dst[key] || src[key];
      });
      return dst;
    };

    // Return an object with the non-method own properties of an object
    var ownDataProps = function (obj) {
      var objData = {};
      angular.forEach(obj, function (val, key) {
        if (!angular.isFunction(val)) {
          objData[key] = val;
        }
      });
      return objData;
    };

    parseResourceActions.get = {
      actions: {
//        get: (function () {
//          var Resource;
//
//          return {
//            method: 'GET',
//            transformResponse: function (data) {
//              return new Resource(data);
//            },
//            setResource: function (R) {
//              Resource = R;
//            }
//          };
//        }())
        // Try it this way first
        get: {
          method: 'GET'
        }
      }
    };

    parseResourceActions.delete = {
      actions: {
        delete: {
          method: 'DELETE'
        }
      }
    };

    // t0d0: Update this so it returns something other than a Resource
    //  tricky, because the Resource instance is what gets updated, but you could have it return an object with own
    // properties and then, on resolution, iterate through the Resource's own properties again and update the object
    parseResourceActions.POST = {
      actions: {
        POST: {
          method: 'POST'
        }
      },
      decorator: function (Resource) {
        // The prototype doesn't need to have this.
        delete Resource.prototype.$POST;
      }
    };

    parseResourceActions.PUT = {
      actions: {
        PUT: {
          method: 'PUT'
        }
      },
      // This is sort of magical, and the PUT request itself is actually kind of weird. Instead of doing it this way,
      // it might be better to call the function directly on the Resource the way it's written in the last line:
      //    return put.call(this, params, data, successFunc, errorFunc);
      // If the instance needs to use this, it could do something like this:
      //    instance.constructor.PUT({objectId: instance.objectId}, data, successFunc, errorFunc);
      // Is there any way to prevent it from returning a Resource? And is that worth it? If you want to do that, you're
      // going to have to use promises. Arguably not worth it for now. Just make sure you don't give the Resource method
      // the actual instance.
      decorator: function (Resource) {
        Resource.PUT = (function () {
          var PUT = Resource.PUT;

          // backburner: Rewrite this so it returns something other than a Resource instance.
          return PUT;
//          return function () {
//            var args,
//              data,
//              instance,
//              params,
//              successFunc,
//              errorFunc;
//
//            var returnVal = {};
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
//            return put.call(this, params, data, successFunc, errorFunc);
//          };
        }());

        // Maybe?
        Resource.prototype.$PUT = function (data, successFunc, errorFunc) {
          var params = {
            objectId: this.objectId
          };
          return Resource.PUT(params, data, successFunc, errorFunc);
        };
      }
    };

    parseResourceActions.query = {
      actions: {
        query: (function () {
          var Resource;

          return {
            method: 'GET',
            isArray: true,
            transformResponse: function (data) {
              var results = data.results;
              if (!results) {
                return [];
              }
              return angular.forEach(results, function (item, idx, col) {
                col[idx] = new Resource(item);
              });
            },
            setResource: function (R) {
              Resource = R;
            }
          };
        }()),
        count: {
          method: 'GET',
          isArray: false,
          transformResponse: function (data) {
//            var count = angular.fromJson(data).count;
            return {count: data.count};
          }
        }
      },
      decorator: function (Resource) {
        Resource.query = (function () {
          var query = Resource.query,
            count = Resource.count;

          delete Resource.count;
          delete Resource.prototype.$count;
          delete Resource.prototype.$query;

          return function () {
            var queryParams,
              isCountQuery,
              queryFx;

            // Get the query parameters or an empty object
            queryParams = angular.isObject(arguments[0]) ? arguments[0] : {};
            // Determine whether this is a count query based on whether the count parameter is set
            isCountQuery = angular.equals(queryParams.count, 1);
            // If it's a count query, use the count action; otherwise, use the query action
            queryFx = isCountQuery ? count : query;
            // Delegate to the appropriate function...
            return queryFx.apply(this, arguments);
          };
        }());
      }
    };

    // A test
    parseResourceActions.save = {
      actions: {
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
      decorator: function (Resource) {

//        console.log(Resource);

        // Have to do something smart here so that:
        // 1) save delegates to separate functions under the hood for creating (using POST) and updating (using PUT), and
        // 2) instance properties are restored after a successful save
        // The first issue is easy to fix. You always get the instance as one of the arguments, so you just check to see if
        // it's new and call the appropriate function accordingly.
        // The second issue is a little trickier. For reasons I don't fully understand yet, when you save an instance to
        // Parse, you wind up losing all of its properties, except for the ones that are returned from the server. That only
        // happens when you call the instance method (so probably related to "this" within angular-resource.js).
        // Key point to remember is that you want this to behave just like $resource's built-in save function.
        Resource.save = (function () {
          var create = Resource.create,
            update = Resource.update;

          delete Resource.create;
          delete Resource.update;
          delete Resource.prototype.$create;
          delete Resource.prototype.$update;

          return function () {
            var args,
              params,
              data,
              instance,
              originalInstanceProps,
              successFunc,
              wrappedSuccessFunc,
              errorFunc,
              wrappedErrorFunc,
              isNew,
              saveFunc;

            // Turn arguments into an actual array
            args = [].slice.call(arguments);
            // We're always going to need to send data on a save, so there should always be a data object. There may or
            // may not be a params object, but if it does exist, it will be the first one.
            params = find(args, angular.isObject);
            data = findLast(args, angular.isObject);
            // If both of those are the same, there is no params object, and we just set it to an empty object.
            if (params === data) {
              params = {};
            }
            // If we already have a Resource instance, fine. If not, we'll create one.
            instance = (data instanceof Resource) ? data : new Resource(data);
            // These are all the the own properties that aren't methods. We need to keep track of these here so we can
            // restore them later.
            originalInstanceProps = ownDataProps(instance);

            // The success function that was passed in, or a do-nothing function if there wasn't one
            successFunc = find(args, angular.isFunction) || angular.noop;
            // Provide updatedInstanceProps as default values to the new instance (if there are conflicting
            // properties from the server, those will win)
            wrappedSuccessFunc = function (newInstance, responseHeaders) {
              setDefaults(newInstance, originalInstanceProps);
              successFunc(newInstance, responseHeaders);
            };
            // The error function that was passed in, or a do-nothing function if there wasn't one
            errorFunc = findLast(args, angular.isFunction) || angular.noop;
            // If the error function is the same as the save function, set errorFunc to angular.noop
            errorFunc = (errorFunc === successFunc) ? angular.noop : errorFunc;
            // In case there's a problem, this basically resets the instance
            wrappedErrorFunc = function (response) {
              angular.extend(instance, originalInstanceProps);
              errorFunc(response);
            };

            // Delegate to the correct function depending on whether the instance is new or not
            isNew = !instance.objectId;
            saveFunc = isNew ? create : update;
            // Delegate to the original function...
            return saveFunc.call(this, params, instance, wrappedSuccessFunc, wrappedErrorFunc);
          };
        }());
      }
    };

    return parseResourceActions;

  });