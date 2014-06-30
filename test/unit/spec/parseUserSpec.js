'use strict';

describe('Factory: parseUser', function () {
  var parseUser,
    mockParseResourceActions,
    EVENTS = {
      SIGN_IN: 'signin',
      SIGN_OUT: 'signout'
    };

  beforeEach(function () {
    mockParseResourceActions = {
      get: {},
      save: {},
      query: {},
      delete: {},
      PUT: {}
    };
    module('angularParseInterface', function ($provide) {
      $provide.value('EVENTS', EVENTS);
      $provide.value('parseResourceActions', mockParseResourceActions);
    });
    inject(function ($injector) {
      parseUser = $injector.get('parseUser');
    });
  });

  describe('createUserModel method', function () {
    var mocks,
      User,
      user,
      username,
      password,
      email,
      sessionToken = '!@#$%';

    beforeEach(function () {
      mocks = {};
      mocks.user = {
        $promise: {
          then: function (f) {
            f();
          }
        },
        sessionToken: sessionToken
      };
      mocks.Resource = function () {};
      mocks.Resource._setClassName = jasmine.createSpy();
      mocks.Resource._addRequestBlacklistProps = jasmine.createSpy();
      mocks.Resource.save = function () {
        return mocks.user;
      };
      spyOn(mocks.Resource, 'save').andCallThrough();
      mocks.Resource.get = function () {
        return mocks.user;
      };
      spyOn(mocks.Resource, 'get').andCallThrough();
      mocks.resourceFactory = function () {
        return mocks.Resource;
      };
      spyOn(mocks, 'resourceFactory').andCallThrough();
      mocks.eventBus = {
        on: jasmine.createSpy(),
        emit: jasmine.createSpy()
      };
      mocks.appStorage = {};
      User = parseUser.createUserModel(mocks.resourceFactory, mocks.appStorage, mocks.eventBus);
      username = 'JimJefferies';
      password = 'password';
      email = 'jim@gmail.com';
    });

    it('should return a User object', function () {
      expect(User).toBeObject();
    });

    it('should create the User object by calling the resource factory function with the correct arguments', function () {
      var resourceFactoryArgs = mocks.resourceFactory.argsForCall[0],
        url = resourceFactoryArgs[0],
        defaultParams = resourceFactoryArgs[1],
        customActions = resourceFactoryArgs[2],
        expectedActions = ['delete', 'get', 'PUT', 'query', 'save'];
      expect(mocks.resourceFactory).toHaveBeenCalled();
      expect(User).toBe(mocks.Resource);
      expect(url).toEqual('/:urlSegment1/:urlSegment2');
      expect(defaultParams).toEqual({ urlSegment1: 'users', urlSegment2: '@objectId' });
      angular.forEach(expectedActions, function (actionName) {
        expect(customActions[actionName]).toBe(mockParseResourceActions[actionName]);
      });
    });

    it('should set the className of the User to \'_User\'', function () {
      expect(User.className).toEqual('_User');
    });

    it('should add sessionToken and emailVerified to the request blacklist', function () {
      expect(mocks.Resource._addRequestBlacklistProps).toHaveBeenCalledWith('sessionToken', 'emailVerified');
    });

    it('should create a module-specific namespace for storage', function () {
      expect(mocks.appStorage.parseUser).toBeObject();
    });

    describe('User model', function () {
      var modStorage;
      beforeEach(function () {
        modStorage = mocks.appStorage.parseUser;
      });

      describe('signUp method', function () {

        beforeEach(function () {
          User.signUp(username, password, email);
        });

        it('should call the User\'s save method with the provided username, password, and email', function () {
          expect(User.save).toHaveBeenCalledWith({
            username: username,
            password: password,
            email: email
          });
        });

        it('should emit a SIGN_IN event with the sessionToken', function () {
          expect(mocks.eventBus.emit).toHaveBeenCalledWith(EVENTS.SIGN_IN, {
            sessionToken: sessionToken
          });
        });

        it('should delete the sessionToken from the user', function () {
          expect(mocks.user.sessionToken).toBeUndefined();
        });

        it('should cache the user in its modStorage', function () {
          expect(modStorage.user).toBe(mocks.user);
        });
      });

      describe('signIn method', function () {

        beforeEach(function () {
          User.signIn(username, password);
        });

        it('should call the User\'s get method with the provided username, password, and email', function () {
          expect(User.get).toHaveBeenCalledWith({
            urlSegment1: 'login',
            username: username,
            password: password
          });
        });

        it('should emit a SIGN_IN event with the sessionToken', function () {
          expect(mocks.eventBus.emit).toHaveBeenCalledWith(EVENTS.SIGN_IN, {
            sessionToken: sessionToken
          });
        });

        it('should delete the sessionToken from the user', function () {
          expect(mocks.user.sessionToken).toBeUndefined();
        });

        it('should cache the user in its modStorage', function () {
          expect(modStorage.user).toBe(mocks.user);
        });
      });

      describe('signOut method', function () {
        it('should delete the user property from its modStorage', function () {
          modStorage.user = mocks.user;
          User.signOut();
          expect(modStorage.user).toBeUndefined();
        });

        it('should trigger the SIGN_OUT event on the eventBus', function () {
          User.signOut();
          expect(mocks.eventBus.emit).toHaveBeenCalledWith(EVENTS.SIGN_OUT);
        });
      });

      describe('current method', function () {
        it('should return the user from its modStorage if it\'s set', function () {
          modStorage.user = 'a user';
          user = User.current();
          expect(user).toBe(modStorage.user);
        });

        it('should call the User\'s get method with the correct arguments', function () {
          user = User.current();
          expect(User.get).toHaveBeenCalledWith({urlSegment2: 'me'});
        });

        it('should delete the sessionToken from the user', function () {
          user = User.current();
          expect(user.sessionToken).toBeUndefined();
        });

        it('should cache the user in its modStorage', function () {
          user = User.current();
          expect(modStorage.user).toBe(user);
        });
      });
    });
  });
});