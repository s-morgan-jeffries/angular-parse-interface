angular
  .module('angularParseInterface')
  .factory('parseRole', function ($q, parseResourceActions, parseQueryBuilder) {
    'use strict';

    var parseRole = {};

    var Query = parseQueryBuilder.Query;

    var roleDecorator = function (Role, User) {
      Role.className = '_Role';
      Role.hasMany('roles', Role);
      Role.hasMany('users', User);
    };

    parseRole.createRoleFactory = function (appResourceFactory, User) {
      // NB: This is not the URL pattern described in the Parse REST API documentation. That's because the official REST
      // endpoints don't accept OPTIONS requests. See here:
      // https://www.parse.com/questions/creating-a-role-cors-not-allowed-by-access-control-allow-origin
      var url = 'classes/_Role/:objectId',
      // The only default parameter is the objectId
        defaultParams = {
          objectId: '@objectId'
        },
      // Grab custom actions from the library
        customActions = {
          get: parseResourceActions.getActionConfig('get'),
          query: parseResourceActions.getActionConfig('query'),
          save: parseResourceActions.getActionConfig('save'),
          delete: parseResourceActions.getActionConfig('delete'),
          PUT: parseResourceActions.getActionConfig('PUT')
        },
      // Create the Role model using our application's resource factory
        Role = appResourceFactory(url, defaultParams, customActions);

      // Add functionality from above decorator
      roleDecorator(Role, User);

      // What we actually return is a factory function. This function takes a name and uses it to either 1) get the
      // named role from the server, or 2) create a new role with the provided name. For security reasons, this function
      // doesn't return the actual role. Instead, it returns a simplified interface for interacting with the role.
      return function roleFactory(name) {
        // Create a Role instance
        var role = new Role({name: name}),
          deferred = $q.defer(),
          roleFacade = {
            $promise: deferred.promise,
            $resolved: false
          };

        var onQuerySuccess = function (data) {
          var savedRole;
          if (data.length === 1) {
            savedRole = data[0];
            angular.forEach(savedRole, function (v, k) {
              role[k] = v;
            });
          }
          deferred.resolve();
          roleFacade.$resolved = true;
        };

        var onQueryError = function (err) {
          deferred.reject(err);
          roleFacade.$resolved = true;
        };

        // Check the server for the named role
        (new Query(Role))
          .equalTo('name', name)
          .exec().$promise
          .then(onQuerySuccess, onQueryError);


        // This function will be executed once the preceding query returns. I'm keeping it separate because it handles
        // all the logic for the queryFacade.
        var createFacadeInterface = function () {

          // backburner: Add logic for making sure the object is saved before you try to addRelations
          // backburner: Add logic for making sure the object has an ACL before you try to save it
          // backburner: Add logic for handling errors, particularly auth errors

          // name, className, and getPointer are needed to make the facade Resource-like
          Object.defineProperty(roleFacade, 'name', {
            get: function () {
              return role.name;
            },
            set: function () {}
          });

          Object.defineProperty(roleFacade, 'className', {
            get: function () {
              return role.className;
            },
            set: function () {}
          });

          // getPointer
          roleFacade.getPointer = function () {
            return role.getPointer();
          };

          // $save - this should really only allow you to pass success and error callbacks. And what should be the
          // return value?
          roleFacade.$save = function () {
            var args = [].slice.call(arguments);
            role.$save.apply(role, args);
          };

          // addUsers
          roleFacade.addUsers = function (/* users */) {
            var args = [].slice.call(arguments);
            args.unshift('users');
            role.addRelations.apply(role, args);
          };

          // removeUsers
          roleFacade.removeUsers = function (/* users */) {
            var args = [].slice.call(arguments);
            args.unshift('users');
            role.removeRelations.apply(role, args);
          };

          // addIncludedRoles
          roleFacade.addIncludedRoles = function (/* roles */) {
            var args = [].slice.call(arguments);
            args.unshift('roles');
            role.addRelations.apply(role, args);
          };

          // removeIncludedRoles
          roleFacade.removeIncludedRoles = function (/* roles */) {
            var args = [].slice.call(arguments);
            args.unshift('roles');
            role.removeRelations.apply(role, args);
          };
        };

        // This will be executed in case of a query error. Again, it's separate because it only deals with the
        // queryFacade.
        var processQueryError = function (err) {
          roleFacade.error = err;
        };

        roleFacade.$promise.then(createFacadeInterface, processQueryError);

        // Return the Role instance
        return roleFacade;
      };
    };

    return parseRole;
  });