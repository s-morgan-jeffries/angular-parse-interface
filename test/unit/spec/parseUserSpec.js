'use strict';

describe('Factory: parseUser', function () {
  var parseUser,
    mockParseResourceActions,
    mockActionLib,
    PARSE_APP_EVENTS = {
      SIGN_IN: 'SIGN_IN',
      SIGN_OUT: 'SIGN_OUT',
      USE_JS_API: 'USE_JS_API',
      USE_REST_API: 'USE_REST_API',
      MODULE_REGISTERED: 'MODULE_REGISTERED',
      MODULE_INIT: 'MODULE_INIT'
    };

  beforeEach(function () {
    mockActionLib = {
      get: {},
      save: {},
      query: {},
      delete: {},
      PUT: {},
      POST: {}
    };
    mockParseResourceActions = {
      getActionConfig: function (actionName) {
        return mockActionLib[actionName];
      }
    };
    module('angularParseInterface', function ($provide) {
      $provide.value('PARSE_APP_EVENTS', PARSE_APP_EVENTS);
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
      sessionToken = '!@#$%',
      initializeMod;

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
        once: jasmine.createSpy(),
        emit: jasmine.createSpy()
      };
      mocks.appStorage = {};
      mocks.appConfig = {
        currentAPI: 'REST'
      };
      User = parseUser.createUserModel(mocks.resourceFactory, mocks.appStorage, mocks.eventBus);
      initializeMod = mocks.eventBus.once.argsForCall[0][1];
      initializeMod(null, mocks.appConfig);
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
        expectedActions = ['delete', 'get', 'POST', 'PUT', 'query', 'save'];
      expect(mocks.resourceFactory).toHaveBeenCalled();
      expect(User).toBe(mocks.Resource);
      expect(url).toEqual('/:urlSegment1/:urlSegment2');
      expect(defaultParams).toEqual({ urlSegment1: 'users', urlSegment2: '@objectId' });
      angular.forEach(expectedActions, function (actionName) {
        expect(customActions[actionName]).toBe(mockActionLib[actionName]);
      });
    });

    it('should set the className of the User to \'_User\'', function () {
      expect(User.className).toEqual('_User');
    });

    it('should add emailVerified to the request blacklist', function () {
      expect(mocks.Resource._addRequestBlacklistProps).toHaveBeenCalledWith('emailVerified');
    });

    it('should create a module-specific namespace for storage', function () {
      expect(mocks.appStorage.parseUser).toBeObject();
    });

    it('should emit a MODULE_REGISTERED event with its module name', function () {
      var moduleName = 'parseUser';
      expect(mocks.eventBus.emit).toHaveBeenCalledWith(PARSE_APP_EVENTS.MODULE_REGISTERED, moduleName);
    });

    it('should register a one-time event handler for a namespaced MODULE_INIT event', function () {
      var moduleName = 'parseUser',
        eventName = PARSE_APP_EVENTS.MODULE_INIT + '.' + moduleName,
        eventHasHandler = false;
      expect(mocks.eventBus.once).toHaveBeenCalled();
      angular.forEach(mocks.eventBus.once.argsForCall, function (args) {
        eventHasHandler = eventHasHandler || (args[0] === eventName);
        eventHasHandler = eventHasHandler && angular.isFunction(args[1]);
      });
      expect(eventHasHandler).toBeTrue();
    });

    it('should register an event handler for the USE_REST_API event', function () {
      var eventName = PARSE_APP_EVENTS.USE_REST_API,
        eventHasHandler = false;
      expect(mocks.eventBus.on).toHaveBeenCalled();
      angular.forEach(mocks.eventBus.on.argsForCall, function (args) {
        eventHasHandler = eventHasHandler || (args[0] === eventName);
        eventHasHandler = eventHasHandler && angular.isFunction(args[1]);
      });
      expect(eventHasHandler).toBeTrue();
    });

    it('should be registered as an event handler for the USE_JS_API event', function () {
      var eventName = PARSE_APP_EVENTS.USE_JS_API,
        eventHasHandler = false;
      expect(mocks.eventBus.on).toHaveBeenCalled();
      angular.forEach(mocks.eventBus.on.argsForCall, function (args) {
        eventHasHandler = eventHasHandler || (args[0] === eventName);
        eventHasHandler = eventHasHandler && angular.isFunction(args[1]);
      });
      expect(eventHasHandler).toBeTrue();
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
          expect(mocks.eventBus.emit).toHaveBeenCalledWith(PARSE_APP_EVENTS.SIGN_IN, {
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

        describe('server request', function () {
          var queryParams,
            queryData;

          it('should use the User\'s get method', function () {
            expect(User.get).toHaveBeenCalled();
          });

          it('should pass urlSegment1 == login as a query parameter to the get method', function () {
            queryParams = User.get.argsForCall[0][0];
            expect(queryParams.urlSegment1).toBeDefined();
            expect(queryParams.urlSegment1).toEqual('login');
          });

          it('should pass the username and password as query parameters if appConfig.currentAPI is set to "REST"', function () {
            // First, to show that the data are usually modified
            mocks.eventBus.once.reset();
            mocks.eventBus.on.reset();
            mocks.Resource.get.reset();
            User = parseUser.createUserModel(mocks.resourceFactory, mocks.appStorage, mocks.eventBus);
            initializeMod = mocks.eventBus.once.argsForCall[0][1];
            // Use JS for currentAPI
            mocks.appConfig.currentAPI = 'REST';
            initializeMod(null, mocks.appConfig);
            // Call the function
            User.signIn(username, password);
            // SOMETHING
            queryParams = User.get.argsForCall[0][0];
            queryData = User.get.argsForCall[0][1] || {};
            expect(queryParams.username).toBeDefined();
            expect(queryParams.username).toEqual(username);
            expect(queryData.username).toBeUndefined();
            expect(queryParams.password).toBeDefined();
            expect(queryParams.password).toEqual(password);
            expect(queryData.password).toBeUndefined();
          });

          it('should pass the username and password as post data if appConfig.currentAPI is set to "JS"', function () {
            // First, to show that the data are usually modified
            mocks.eventBus.once.reset();
            mocks.eventBus.on.reset();
            mocks.Resource.get.reset();
            User = parseUser.createUserModel(mocks.resourceFactory, mocks.appStorage, mocks.eventBus);
            initializeMod = mocks.eventBus.once.argsForCall[0][1];
            // Use JS for currentAPI
            mocks.appConfig.currentAPI = 'JS';
            initializeMod(null, mocks.appConfig);
            // Call the function
            User.signIn(username, password);
            // SOMETHING
            queryParams = User.get.argsForCall[0][0];
            queryData = User.get.argsForCall[0][1] || {};
            expect(queryData.username).toBeDefined();
            expect(queryData.username).toEqual(username);
            expect(queryParams.username).toBeUndefined();
            expect(queryData.password).toBeDefined();
            expect(queryData.password).toEqual(password);
            expect(queryParams.password).toBeUndefined();
          });

          it('should pass the username and password as query parameters after receiving a USE_REST_API event, even if appConfig.currentAPI was initially set to "JS"', function () {
            var handler;
            mocks.eventBus.once.reset();
            mocks.eventBus.on.reset();
            mocks.Resource.get.reset();
            User = parseUser.createUserModel(mocks.resourceFactory, mocks.appStorage, mocks.eventBus);
            initializeMod = mocks.eventBus.once.argsForCall[0][1];
            // Use REST for currentAPI
            mocks.appConfig.currentAPI = 'JS';
            initializeMod(null, mocks.appConfig);
            // Now, call the handler for the USE_JS_API event
            handler = mocks.eventBus.on.argsForCall[0][1];
            handler();
            // Call the function
            User.signIn(username, password);
            // SOMETHING
            queryParams = User.get.argsForCall[0][0];
            queryData = User.get.argsForCall[0][1] || {};
            expect(queryParams.username).toBeDefined();
            expect(queryParams.username).toEqual(username);
            expect(queryData.username).toBeUndefined();
            expect(queryParams.password).toBeDefined();
            expect(queryParams.password).toEqual(password);
            expect(queryData.password).toBeUndefined();
          });

          it('should pass the username and password as post data after receiving a USE_JS_API event, even if appConfig.currentAPI was initially set to "REST"', function () {
            var handler;
            mocks.eventBus.once.reset();
            mocks.eventBus.on.reset();
            mocks.Resource.get.reset();
            User = parseUser.createUserModel(mocks.resourceFactory, mocks.appStorage, mocks.eventBus);
            initializeMod = mocks.eventBus.once.argsForCall[0][1];
            // Use REST for currentAPI
            mocks.appConfig.currentAPI = 'REST';
            initializeMod(null, mocks.appConfig);
            // Now, call the handler for the USE_JS_API event
            handler = mocks.eventBus.on.argsForCall[1][1];
            handler();
            // Call the function
            User.signIn(username, password);
            // SOMETHING
            queryParams = User.get.argsForCall[0][0];
            queryData = User.get.argsForCall[0][1] || {};
            expect(queryData.username).toBeDefined();
            expect(queryData.username).toEqual(username);
            expect(queryParams.username).toBeUndefined();
            expect(queryData.password).toBeDefined();
            expect(queryData.password).toEqual(password);
            expect(queryParams.password).toBeUndefined();
          });

        });

        it('should emit a SIGN_IN event with the sessionToken', function () {
          expect(mocks.eventBus.emit).toHaveBeenCalledWith(PARSE_APP_EVENTS.SIGN_IN, {
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
          expect(mocks.eventBus.emit).toHaveBeenCalledWith(PARSE_APP_EVENTS.SIGN_OUT);
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

      describe('resetPassword method', function () {
        it('should call its own POST method with the correct arguments and return the response', function () {
          var paramsArg = {urlSegment1: 'requestPasswordReset'},
            dataArg = {email: email},
            mockResponse = {},
            response;
          User.POST = function () {
            return mockResponse;
          };
          spyOn(User, 'POST').andCallThrough();
          response = User.resetPassword(email);
          expect(User.POST).toHaveBeenCalledWith(paramsArg, dataArg);
          expect(response).toBe(mockResponse);
        });
      });
    });
  });
});