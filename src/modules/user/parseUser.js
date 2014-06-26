angular
  .module('angularParseInterface.userMod', [
    'angularParseInterface.configMod'
  ])
  .factory('parseUser', function (SIGN_IN, SIGN_OUT) {
    'use strict';

    var parseUser = {};

    var userDecorator = function (User, eventBus, storage) {
      User._setClassName('_User');
      User._addRequestBlacklistProps('sessionToken', 'emailVerified');

      User.signUp = function (username, password, email) {
        var user = this.save({
          username: username,
          password: password,
          email: email
        });
        user.$promise.then(function () {
          var data = {
            sessionToken: user.sessionToken
          };
          delete user.sessionToken;
          eventBus.emit(SIGN_IN, data);
        });
        // jshint boss:true
        return storage.user = user;
        // jshint boss:false
      };

      User.signIn = function (username, password) {
        var user = this.get({urlRoot: 'login', username: username, password: password});
        user.$promise.then(function () {
          var data = {
            sessionToken: user.sessionToken
          };
          delete user.sessionToken;
          eventBus.emit(SIGN_IN, data);
        });
        // jshint boss:true
        return storage.user = user;
        // jshint boss:false
      };

      User.signOut = function () {
        delete storage.user;
        eventBus.emit(SIGN_OUT);
      };

      User.current = function () {
        var user = storage.user;
        if (!user) {
          user = this.get({objectId: 'me'});
          user.$promise.then(function () {
            delete user.sessionToken;
          });
          storage.user = user;
        }
        return user;
      };
    };

    parseUser.createUserModel = function (appResourceFactory, appEventBus, appStorage) {
      var url = '/:urlRoot/:objectId',
        defaultParams = {
          urlRoot: 'users',
          objectId: '@objectId'
        },
        customActions = {},
        User = appResourceFactory(url, defaultParams, customActions);

      userDecorator(User, appEventBus, appStorage);

      return User;
    };

    return parseUser;
  });