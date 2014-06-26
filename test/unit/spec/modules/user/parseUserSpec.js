'use strict';

describe('Factory: parseUser', function () {
  var parseUser,
    SIGN_IN = 'signin',
    SIGN_OUT = 'signout',
    mocks;

  beforeEach(function () {
    module('angularParseInterface.userMod', function ($provide) {
      $provide.value('SIGN_IN', SIGN_IN);
      $provide.value('SIGN_OUT', SIGN_OUT);
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
      mocks.storage = {};
      User = parseUser.createUserModel(mocks.resourceFactory, mocks.eventBus, mocks.storage);
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
        customActions = resourceFactoryArgs[2];
      expect(mocks.resourceFactory).toHaveBeenCalled();
      expect(User).toBe(mocks.Resource);
      expect(url).toEqual('/:urlRoot/:objectId');
      expect(defaultParams).toEqual({ urlRoot: 'users', objectId: '@objectId' });
      expect(customActions).toEqual({});
    });

    it('should set the className of the User to \'_User\'', function () {
      expect(mocks.Resource._setClassName).toHaveBeenCalledWith('_User');
    });

    it('should add sessionToken and emailVerified to the request blacklist', function () {
      expect(mocks.Resource._addRequestBlacklistProps).toHaveBeenCalledWith('sessionToken', 'emailVerified');
    });

    describe('User model', function () {

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
          expect(mocks.eventBus.emit).toHaveBeenCalledWith(SIGN_IN, {
            sessionToken: sessionToken
          });
        });

        it('should delete the sessionToken from the user', function () {
          expect(mocks.user.sessionToken).toBeUndefined();
        });

        it('should cache the user in its storage', function () {
          expect(mocks.storage.user).toBe(mocks.user);
        });
      });

      describe('signIn method', function () {

        beforeEach(function () {
          User.signIn(username, password);
        });

        it('should call the User\'s get method with the provided username, password, and email', function () {
          expect(User.get).toHaveBeenCalledWith({
            urlRoot: 'login',
            username: username,
            password: password
          });
        });

        it('should emit a SIGN_IN event with the sessionToken', function () {
          expect(mocks.eventBus.emit).toHaveBeenCalledWith(SIGN_IN, {
            sessionToken: sessionToken
          });
        });

        it('should delete the sessionToken from the user', function () {
          expect(mocks.user.sessionToken).toBeUndefined();
        });

        it('should cache the user in its storage', function () {
          expect(mocks.storage.user).toBe(mocks.user);
        });
      });

      describe('signOut method', function () {
        it('should delete the user property from its storage', function () {
          mocks.storage.user = mocks.user;
          User.signOut();
          expect(mocks.storage.user).toBeUndefined();
        });

        it('should trigger the SIGN_OUT event on the eventBus', function () {
          User.signOut();
          expect(mocks.eventBus.emit).toHaveBeenCalledWith(SIGN_OUT);
        });
      });

      describe('current method', function () {
        it('should return the user from its storage if it\'s set', function () {
          mocks.storage.user = 'a user';
          user = User.current();
          expect(user).toBe(mocks.storage.user);
        });

        it('should call the User\'s get method with the correct arguments', function () {
          user = User.current();
          expect(User.get).toHaveBeenCalledWith({objectId: 'me'});
        });

        it('should delete the sessionToken from the user', function () {
          user = User.current();
          expect(user.sessionToken).toBeUndefined();
        });

        it('should cache the user in its storage', function () {
          user = User.current();
          expect(mocks.storage.user).toBe(user);
        });
      });
    });
  });
});