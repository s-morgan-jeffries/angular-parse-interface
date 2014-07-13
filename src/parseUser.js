angular
  .module('angularParseInterface')
  .factory('parseUser', function (parseResourceActions, PARSE_APP_EVENTS) {
    'use strict';

    var parseUser = {};

    var userDecorator = function (User, eventBus, storage) {
      var useRestApi = false,
        moduleName = 'parseUser',
      // Namespaced initialization event. The appInterface will emit this with the appConfig when the
      // MODULE_REGISTERED event is emitted with our moduleName.
        INIT_EVENT = PARSE_APP_EVENTS.MODULE_INIT + '.' + moduleName;

      // Set the className to _User (Parse uses leading underscore names for certain built-in classes)
      User.className = '_User';
      // These should never be sent with PUT requests
      User._addRequestBlacklistProps('emailVerified');

      // Register event handlers
      // This is the handler for the INIT_EVENT
      // Register the handler for the INIT_EVENT
      eventBus.once(INIT_EVENT, function (event, appConfig) {
        // Determine whether we're using the JS API
        useRestApi = appConfig.currentAPI === 'REST';
      });
      // Now that the handler is set up, we can emit the MODULE_REGISTERED event, which will cause the appInterface to
      // emit the INIT_EVENT with the appConfig
      eventBus.emit(PARSE_APP_EVENTS.MODULE_REGISTERED, moduleName);
      // On a USE_REST_API event, set useRestApi to true
      eventBus.on(PARSE_APP_EVENTS.USE_REST_API, function () {
        useRestApi = true;
      });
      // On a USE_JS_API event, set useRestApi to false
      eventBus.on(PARSE_APP_EVENTS.USE_JS_API, function () {
        useRestApi = false;
      });

      // This both creates a user and signs in
      User.signUp = function (username, password, email) {
        // Save, because this is a new user, will delegate to the create method, which will be a POST request
        var user = this.save({
          username: username,
          password: password,
          email: email
        });
        // Once the user has been saved...
        user.$promise.then(function () {
          var data = {
            sessionToken: user.sessionToken
          };
          // Delete the sessionToken from the user
          delete user.sessionToken;
          // Emit a SIGN_IN event with the sessionToken as data. Currently (as of this writing), the coreAppResourceFactory
          // uses this to keep track of the sessionToken, but this prevents us from having to hard-code that. The point
          // is that something else is keeping track of it.
          eventBus.emit(PARSE_APP_EVENTS.SIGN_IN, data);
        });
        // jshint boss:true
        // Cache the user in storage and return it
        return storage.user = user;
        // jshint boss:false
      };

      // This is for signing in (duh)
      User.signIn = function (username, password) {
        // Maybe you should have a way for Resources to send arbitrary requests (e.g. custom actions with capitalized
        // HTTP verb names) in addition to the convenience methods.
        var user;
        if (useRestApi) {
          user = this.get({urlSegment1: 'login', username: username, password: password});
        } else {
          user = this.get({urlSegment1: 'login'}, {username: username, password: password});
        }
        // After we get the user back, we'll basically do exactly what we did in the signUp method.
        user.$promise.then(function () {
          var data = {
            sessionToken: user.sessionToken
          };
          // Delete the sessionToken from the user
          delete user.sessionToken;
          // Emit a SIGN_IN event with the sessionToken as data.
          eventBus.emit(PARSE_APP_EVENTS.SIGN_IN, data);
        });
        // jshint boss:true
        // Cache the user in storage and return it
        return storage.user = user;
        // jshint boss:false
      };

      // Signing out. This is fairly simple, since we don't have to talk to the server at all (Parse never invalidates
      // session tokens). Need to think more about the security implications there.
      User.signOut = function () {
        // Delete the user from the cache
        delete storage.user;
        // Emit a SIGN_OUT event, in case anyone else is interested (hint: they are)
        eventBus.emit(PARSE_APP_EVENTS.SIGN_OUT);
      };

      // This is for retrieving the current user
      User.current = function () {
        // Check the cache
        var user = storage.user,
          Self = this;
        // If there's nothing there...
        if (!user) {
          eventBus.emit(PARSE_APP_EVENTS.SIGN_OUT);
        } else {
          user = new Self(user);
        }
        return user;
      };

      // backburner: Add the ability to link accounts (e.g. Facebook, Twitter)

      User.resetPassword = function (email) {
        return this.POST({urlSegment1: 'requestPasswordReset'}, {email: email});
      };
    };

    parseUser.createUserModel = function (appResourceFactory, appStorage, appEventBus) {
      // This is a slightly ugly url, but I can't think of any names that better capture what's going on here.
      var url = '/:urlSegment1/:urlSegment2',
        // By default, the first segment is the literal string 'users'
        defaultParams = {
          urlSegment1: 'users',
          urlSegment2: '@objectId'
        },
        // Grab custom actions from the library
        customActions = {
          get: parseResourceActions.getActionConfig('get'),
          query: parseResourceActions.getActionConfig('query'),
          save: parseResourceActions.getActionConfig('save'),
          delete: parseResourceActions.getActionConfig('delete'),
          PUT: parseResourceActions.getActionConfig('PUT'),
          POST: parseResourceActions.getActionConfig('POST')
        },
        // Create the User model using our application's resource factory
        User = appResourceFactory(url, defaultParams, customActions),
        moduleStorage = (appStorage.parseUser = appStorage.parseUser || {});

      // Add functionality from above decorator
      userDecorator(User, appEventBus, moduleStorage);

      return User;
    };

    return parseUser;
  });