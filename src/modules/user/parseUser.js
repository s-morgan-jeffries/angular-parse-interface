angular
  .module('angularParseInterface.userMod', [
    'angularParseInterface.configMod'
  ])
  .factory('parseUser', function (SIGN_IN, SIGN_OUT) {
    'use strict';

    var parseUser = {};

    var userDecorator = function (User, eventBus, storage) {
      // Set the className to _User (Parse uses leading underscore names for certain built-in classes)
      User._setClassName('_User');
      // These should never be sent with PUT requests
      // backburner: Maybe remove sessionToken from request blacklist (it should be deleted, anyway)
      User._addRequestBlacklistProps('sessionToken', 'emailVerified');

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
          // Emit a SIGN_IN event with the sessionToken as data. Currently (as of this writing), the appResourceFactory
          // uses this to keep track of the sessionToken, but this prevents us from having to hard-code that. The point
          // is that something else is keeping track of it.
          eventBus.emit(SIGN_IN, data);
        });
        // jshint boss:true
        // Cache the user in storage and return it
        return storage.user = user;
        // jshint boss:false
      };

      // This is for signing in (duh)
      User.signIn = function (username, password) {
        // backburner: Figure out a cleaner, more intuitive way of representing arbitrary HTTP requests
        // Maybe you should have a way for Resources to send arbitrary requests (e.g. custom actions with capitalized
        // HTTP verb names) in addition to the convenience methods.
        var user = this.get({urlSegment1: 'login', username: username, password: password});
        // After we get the user back, we'll basically do exactly what we did in the signUp method.
        user.$promise.then(function () {
          var data = {
            sessionToken: user.sessionToken
          };
          // Delete the sessionToken from the user
          delete user.sessionToken;
          // Emit a SIGN_IN event with the sessionToken as data.
          eventBus.emit(SIGN_IN, data);
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
        eventBus.emit(SIGN_OUT);
      };

      // This is for retrieving the current user
      User.current = function () {
        // Check the cache
        var user = storage.user;
        // If there's nothing there...
        if (!user) {
          // Get the current user from the server. Again, this is not 100% clear to me (I have to *think* about how this
          // maps to the URL in Parse's documentation), so it would be nice if there were a better way to make arbitrary
          // requests like this.
          user = this.get({urlSegment2: 'me'});
          // Once we get a response...
          user.$promise.then(function () {
            // In this case, we're only deleting the sessionToken. Not sure if Parse sends us a new one, but since the
            // old one (which must have been used to make this request) never expires, it's fine.
            delete user.sessionToken;
          });
          // Cache the user
          storage.user = user;
        }
        return user;
      };

      // backburner: Add the ability to link accounts (e.g. Facebook, Twitter)
      // backburner: Add ability to request a password reset

    };

    parseUser.createUserModel = function (appResourceFactory, appEventBus, appStorage) {
      var url = '/:urlSegment1/:urlSegment2',
        defaultParams = {
          urlSegment1: 'users',
          urlSegment2: '@objectId'
        },
        customActions = {},
        // Create the User model using our application's resource factory
        User = appResourceFactory(url, defaultParams, customActions);

      // Add functionality from above decorator
      userDecorator(User, appEventBus, appStorage);

      return User;
    };

    return parseUser;
  });