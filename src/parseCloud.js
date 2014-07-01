angular
  .module('angularParseInterface')
  .factory('parseCloud', function (parseResourceActions) {
    'use strict';

    var parseCloud = {};

    parseCloud.createCallerFactory = function (appResourceFactory) {
      // This is a slightly ugly url, but I can't think of any names that better capture what's going on here.
      var url = '/functions/:functionName',
        // The only parameter we'll use is functionName, and there shouldn't be any default value for that
        defaultParams = {},
        // The only action we need is POST
        customActions = {
          POST: parseResourceActions.POST
        },
        // Create the Function model using our application's resource factory
        Function = appResourceFactory(url, defaultParams, customActions);

      // This is a function factory. It returns a function that will call the named cloud function
      return function cloudCallerFactory(functionName) {
        var params = {functionName: functionName};
        return function () {
          // Capture the arguments that were passed in
          var args = [].slice.call(arguments);
          // If the first argument isn't an object, it could be undefined or a function. This could come up if a
          // function takes no arguments. In that case, you want to push an object to the front of the array (unshift).
          if (!angular.isObject(args[0])) {
            args.unshift({});
          }
          // Now push the params to the front of the arguments array.
          args.unshift(params);
          // And that's all the argument parsing we need to do. Now we just call Function's POST method and return the
          // result.
          return Function.POST.apply(Function, args);
        };
      };
    };

    return parseCloud;
  });