angular.module('angularParseInterface')
  .factory('parseResourceActions', function () {
    'use strict';

    // The point of this module is to serve as a library of actions for the parseResource service. Actions are tricky
    // to write, so this is definitely an area where you want the code to be reusable. Rather than relying inheritance,
    // these function like mixins.
    var actionLib = {};

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

    actionLib.get = {
      actionConfigs: {
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

    // Could do a GET action here analogous to POST and PUT below, but I don't know where I would use it, and I don't
    // want to write extra tests right now. But this is a pin in it.

    actionLib.delete = {
      actionConfigs: {
        delete: {
          method: 'DELETE'
        }
      }
    };

    // A POST action for posting arbitrary data to the server
    actionLib.POST = {
      actionConfigs: {
        POST: {
          method: 'POST'
        }
      },
      decorator: function (Resource) {
        // The prototype doesn't need to have this.
        delete Resource.prototype.$POST;

        // Create a modified POST static method
        Resource.POST = (function () {
          // The original POST method
          var POST = Resource.POST;

          // Since we're not interested in a Resource for arbitrary POST data, this function returns a non-Resource
          // object.
          return function () {
            // Delegate to the original POST method. This returns an instance of Resource.
            var instance = POST.apply(this, arguments),
              // This is the POJO we'll actually be returning.
              res = {
                $promise: instance.$promise,
                $resolved: instance.$resolved
              };
            // NB: Both of the handlers leave the $promise object on the POJO.
            // This copies all the own properties from the response data (which is an instance of Resource) to the POJO
            var onSuccess = function (data) {
              // "Data" is actually just the instance again.
              angular.forEach(data, function (v, k) {
                // This *should* be the same promise object, but just in case...
                if (k === '$promise') {
                  return;
                }
                // Otherwise, copy the property to the result
                res[k] = v;
              });
            };
            // This copies some useful information about the error to the POJO.
            var onError = function (err) {
              res.data = err.data;
              res.status = err.status;
              res.headersGetter = err.headers;
              res.config = err.config;
              res.statusText = err.statusText;
              res.$resolved = true;
            };
            instance.$promise.then(onSuccess, onError);
            // Return the POJO
            return res;
            // POJO!
          };
        }());
      }
    };

    actionLib.PUT = {
      actionConfigs: {
        PUT: {
          method: 'PUT'
        }
      },
      decorator: function (Resource) {

        // For the instance method, we just want to delegate to the static method but with an objectId parameter set to
        // the instance's objectId (possibly other params in the future).
        Resource.prototype.$PUT = function (data, successFunc, errorFunc) {
          var params = {
            objectId: this.objectId
          };
          return Resource.PUT(params, data, successFunc, errorFunc);
        };

        // Create a modified PUT static method
        Resource.PUT = (function () {
          // The original PUT method
          var PUT = Resource.PUT;

          // Since we're not interested in a Resource for arbitrary PUT data, this function returns a non-Resource
          // object.
          return function () {
            // Delegate to the original PUT method. This returns an instance of Resource.
            var instance = PUT.apply(this, arguments),
            // This is the POJO we'll actually be returning.
              res = {
                $promise: instance.$promise,
                $resolved: instance.$resolved
              };
            // NB: Both of the handlers leave the $promise object on the POJO.
            // This copies all the own properties from the response data (which is an instance of Resource) to the POJO
            var onSuccess = function (data) {
              // "Data" is actually just the instance again.
              angular.forEach(data, function (v, k) {
                // This *should* be the same promise object, but just in case...
                if (k === '$promise') {
                  return;
                }
                // Otherwise, copy the property to the result
                res[k] = v;
              });
            };
            // This copies some useful information about the error to the POJO.
            var onError = function (err) {
              res.data = err.data;
              res.status = err.status;
              res.headersGetter = err.headers;
              res.config = err.config;
              res.statusText = err.statusText;
              res.$resolved = true;
            };
            instance.$promise.then(onSuccess, onError);
            // Return the POJO
            return res;
          };
        }());

      }
    };

    actionLib.query = {
      actionConfigs: {
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

    // ngResource uses save to persist data, which is nice and clean. Unfortunately, Parse.com uses POSTs for object
    // creation and PUT for updates (even though it lets you make partial updates, where PATCH would be more
    // appropriate). Anyway, this action does the hard work of making those two interfaces work together. The save
    // action this creates can be used just like the ngResource save action.
    actionLib.save = {
      actionConfigs: {
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

        // No changes to the instance method

        // The static method has to do two things:
        // 1) delegate to separate functions under the hood for creating (using POST) and updating (using PUT), and
        // 2) restore instance properties after success or failure
        //    The first issue is easy to deal with. You just check to see if the data (or instance) has an objectId. If
        // it doesn't, use create; if it does, use update.
        //    The second issue is a little trickier. What we want is for the local instance to be in sync with the saved
        // data, except for client-side changes that haven't been saved yet. On success, it should be updated with any
        // updated properties (the ones we saved, plus server-generated stuff like createdAt, updatedAt, etc.). On
        // error, it should revert to its pre-save state. Parse only sends createdAt and objectId in the response to
        // successful creation, and it only sends updatedAt in the response to successful updates. Angular takes that
        // and assumes that's all there is to the instance, so it deletes any other properties. So what we have to do
        // here of this is keep track of the pre-save properties so we can restore them afterwards.
        Resource.save = (function () {
          // Capture these methods here so we can delegate to them below.
          var create = Resource.create,
            update = Resource.update;

          // These shouldn't be directly accessible
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

    // t0d0: Modify this so it makes two versions (REST and JS) of each action
      // But it's also going to have to know when to use which. Where should that happen?
    var parseResourceActions = {
      getActionConfig: function (actionName) {
        return angular.copy(actionLib[actionName]);
      }
    };

    return parseResourceActions;

  });