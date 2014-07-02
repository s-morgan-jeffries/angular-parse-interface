angular
  .module('angularParseInterface')
  .factory('parseCloud', function (parseResourceActions/*, $log*/) {
    'use strict';

    var parseCloud = {};

    parseCloud.createCallerFactory = function (appResourceFactory) {
      // We call cloud functions by posting to their url
      var url = '/functions/:functionName',
        // The only parameter we'll use is functionName, and there shouldn't be any default value for that
        defaultParams = {},
        // The only action we need is POST
        customActions = {
          POST: parseResourceActions.POST
        },
        // Create the Function model using our application's resource factory
        Function = appResourceFactory(url, defaultParams, customActions);

      // This is the application's cloud caller factory. It returns a function that will call the named cloud function
      return function cloudCallerFactory(functionName) {
        // The params for this cloud caller
        var params = {functionName: functionName};
        // Return a function that will call the named cloud function
        return function (/* cloudFunctionArgs, onSuccess, onError */) {
          // Capture the arguments that were passed in
          var args = [].slice.call(arguments);
          // The first argument should be an object with keys and values representing the arguments to the cloud
          // function. If the cloud function takes no arguments, there's no need to pass this in. In that case, the
          // arguments array could be empty, or it could contain a success callback and possibly and error callback. We
          // have to pass an object as the first argument to the POST method, so this deals with that.
          if (!angular.isObject(args[0])) {
            // Push an empty object to the front of the args array
            args.unshift({});
          }
          // Now push the params to the front of the arguments array.
          args.unshift(params);

          // NB: We are assuming that the only trailing arguments will be a success callback and an error callback, but
          // we're not checking for that. IF we decide to introduce some error-checking on that point, it should
          // probably go in the action definition.

          // Now we just call Function's POST method and return the result
          return Function.POST.apply(Function, args);
        };
      };
    };

    return parseCloud;
  });