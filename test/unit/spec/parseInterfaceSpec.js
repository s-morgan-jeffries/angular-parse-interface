'use strict';

describe('Factory: parseInterface', function () {
  var parseInterface,
    mocks;

  beforeEach(function () {
    mocks = {};
    mocks.appEventBus = {
      on: function () {},
      emit: function () {}
    };
    spyOn(mocks.appEventBus, 'on').andCallThrough();
    spyOn(mocks.appEventBus, 'emit').andCallThrough();
    mocks.ParseAppEventBus = function () {
      // If this function is called with new, it will add an empty object to mocks.appEventBus as the ctx property.
      mocks.appEventBus.ctx = this;
      return mocks.appEventBus;
    };
    spyOn(mocks, 'ParseAppEventBus').andCallThrough();
    mocks.PARSE_APP_EVENTS = {
      USE_JS_API: 'USE_JS_API',
      USE_REST_API: 'USE_REST_API',
      MODULE_REGISTERED: 'MODULE_REGISTERED',
      MODULE_INIT: 'MODULE_INIT'
    };
    mocks.appResource = {};
    mocks.parseResource = {
      createAppResourceFactory: function () {
        return mocks.appResource;
      }
    };
    spyOn(mocks.parseResource, 'createAppResourceFactory').andCallThrough();
    mocks.appObjectFactory = function () {};
    mocks.parseObjectFactory = {
      createObjectFactory: function () {
        return mocks.appObjectFactory;
      }
    };
    spyOn(mocks.parseObjectFactory, 'createObjectFactory').andCallThrough();
    mocks.User = {};
    mocks.parseUser = {
      createUserModel: function () {
        return mocks.User;
      }
    };
    spyOn(mocks.parseUser, 'createUserModel').andCallThrough();
    mocks.parseQueryBuilder = {
      Query: function () {}
    };
    mocks.getCloudCaller = {};
    mocks.parseCloudCode = {
      createCallerFactory: function () {
        return mocks.getCloudCaller;
      }
    };
    spyOn(mocks.parseCloudCode, 'createCallerFactory').andCallThrough();
    mocks.roleFactory = {};
    mocks.parseRole = {
      createRoleFactory: function () {
        return mocks.roleFactory;
      }
    };
    spyOn(mocks.parseRole, 'createRoleFactory').andCallThrough();
    mocks.eventFactory = {};
    mocks.parseEvent = {
      createEventFactory: function () {
        return mocks.eventFactory;
      }
    };
    spyOn(mocks.parseEvent, 'createEventFactory').andCallThrough();
    module('angularParseInterface', function ($provide) {
      $provide.value('ParseAppEventBus', mocks.ParseAppEventBus);
      $provide.value('PARSE_APP_EVENTS', mocks.PARSE_APP_EVENTS);
      $provide.value('parseResource', mocks.parseResource);
      $provide.value('parseObjectFactory', mocks.parseObjectFactory);
      $provide.value('parseUser', mocks.parseUser);
      $provide.value('parseQueryBuilder', mocks.parseQueryBuilder);
      $provide.value('parseCloudCode', mocks.parseCloudCode);
      $provide.value('parseRole', mocks.parseRole);
      $provide.value('parseEvent', mocks.parseEvent);
    });
    inject(function ($injector) {
      parseInterface = $injector.get('parseInterface');
    });
  });

  describe('createAppInterface', function () {
    var appInterface,
      appConfig,
      clientStorage;

    beforeEach(function () {
      appConfig = {
        APPLICATION_ID: '12345',
        REST_KEY: 'abcde',
        JS_KEY: 'fghijk'
      };
      clientStorage = {};
    });

    it('should create a new ParseAppEventBus', function () {
      appInterface = parseInterface.createAppInterface(appConfig, clientStorage);
      expect(mocks.ParseAppEventBus).toHaveBeenCalled();
      expect(mocks.appEventBus.ctx).toEqual({});
    });

    it('should error if appConfig does not have an APPLICATION_ID property', function () {
      var create = function () {
          parseInterface.createAppInterface(badConfig, clientStorage);
        },
        badConfig = angular.copy(appConfig);

      delete badConfig.APPLICATION_ID;
      expect(create).toThrowError();
    });

    it('should set appConfig.currentAPI to "REST" if appConfig has a REST_KEY', function () {
      parseInterface.createAppInterface(appConfig, clientStorage);
      expect(appConfig.currentAPI).toEqual('REST');
    });

    it('should set appConfig.currentAPI to "JS" if appConfig has a JS_KEY but no REST_KEY', function () {
      delete appConfig.REST_KEY;
      parseInterface.createAppInterface(appConfig, clientStorage);
      expect(appConfig.currentAPI).toEqual('JS');
    });

    it('should error if appConfig is missing both JS_KEY and REST_KEY properties', function () {
      var create = function () {
        parseInterface.createAppInterface(appConfig, clientStorage);
      };
      delete appConfig.REST_KEY;
      delete appConfig.JS_KEY;
      expect(create).toThrowError();
    });

    it('should create a namespace for application storage within the provided clientStorage object', function () {
      var appId = appConfig.APPLICATION_ID,
        appStorage;
      appInterface = parseInterface.createAppInterface(appConfig, clientStorage);
      appStorage = clientStorage.parseApp[appId];
      expect(appStorage).toBeObject();
    });

    it('should not error if no clientStorage object is provided', function () {
      var create = function () {
        appInterface = parseInterface.createAppInterface(appConfig);
      };
      expect(create).not.toThrowError();
    });

    it('should respond to a MODULE_REGISTERED event by emitting a namespaced MODULE_INIT event with appConfig', function () {
      var expectOnEvent = mocks.PARSE_APP_EVENTS.MODULE_REGISTERED,
        actualOnEvent,
        mockEvent = {},
        modName = 'foo',
        eventHandler,
        expectedEmitEvent = mocks.PARSE_APP_EVENTS.MODULE_INIT + '.' + modName;
      appInterface = parseInterface.createAppInterface(appConfig);
      expect(mocks.appEventBus.on).toHaveBeenCalled();
      actualOnEvent = mocks.appEventBus.on.argsForCall[0][0];
      expect(actualOnEvent).toEqual(expectOnEvent);

      eventHandler = mocks.appEventBus.on.argsForCall[0][1];
      expect(mocks.appEventBus.emit).not.toHaveBeenCalled();
      eventHandler(mockEvent, modName);
      expect(mocks.appEventBus.emit).toHaveBeenCalledWith(expectedEmitEvent, appConfig);
    });

    it('should create a new appResource', function () {
      appInterface = parseInterface.createAppInterface(appConfig, clientStorage);
      var appStorage = clientStorage.parseApp[appConfig.APPLICATION_ID];
      expect(mocks.parseResource.createAppResourceFactory).toHaveBeenCalledWith(mocks.appEventBus, appStorage);
    });

    it('should return an object', function () {
      appInterface = parseInterface.createAppInterface(appConfig, clientStorage);
      expect(appInterface).toBeObject();
    });

    describe('appInterface object', function () {
      var appStorage;

      beforeEach(function () {
        appInterface = parseInterface.createAppInterface(appConfig, clientStorage);
        appStorage = clientStorage.parseApp[appConfig.APPLICATION_ID];
      });

      it('should have an objectFactory property', function () {
        expect(mocks.parseObjectFactory.createObjectFactory).toHaveBeenCalledWith(mocks.appResource);
        expect(appInterface.objectFactory).toBe(mocks.appObjectFactory);
      });

      it('should have a User property', function () {
        expect(mocks.parseUser.createUserModel).toHaveBeenCalledWith(mocks.appResource, appStorage, mocks.appEventBus);
        expect(appInterface.User).toBe(mocks.User);
      });

      it('should have a Query property', function () {
        expect(appInterface.Query).toBe(mocks.parseQueryBuilder.Query);
      });

      it('should have a getCloudCaller property', function () {
        expect(mocks.parseCloudCode.createCallerFactory).toHaveBeenCalledWith(mocks.appResource);
        expect(appInterface.getCloudCaller).toBe(mocks.getCloudCaller);
      });

      it('should have a roleFactory property', function () {
        expect(mocks.parseRole.createRoleFactory).toHaveBeenCalledWith(mocks.appResource, mocks.User);
        expect(appInterface.roleFactory).toBe(mocks.roleFactory);
      });

      it('should have an eventFactory property', function () {
        expect(mocks.parseEvent.createEventFactory).toHaveBeenCalledWith(mocks.appResource);
        expect(appInterface.eventFactory).toBe(mocks.eventFactory);
      });

      describe('useJsApi method', function () {

        it('should be a function', function () {
          expect(appInterface.useJsApi).toBeFunction();
        });

        it('should trigger a USE_JS_API event on the appEventBus and set appConfig.currentAPI to "JS"', function () {
          // Delete this first
          delete appConfig.currentAPI;
          // Now call the method
          appInterface.useJsApi();
          // This should have been emitted...
          expect(mocks.appEventBus.emit).toHaveBeenCalledWith(mocks.PARSE_APP_EVENTS.USE_JS_API);
          // ... and this should have been set
          expect(appConfig.currentAPI).toEqual('JS');
        });

        it('should not do anything if the JS_KEY is not set on appConfig', function () {
          delete appConfig.JS_KEY;
          delete appConfig.currentAPI;
          appInterface.useJsApi();
          expect(mocks.appEventBus.emit).not.toHaveBeenCalled();
          expect(appConfig.currentAPI).toBeUndefined();
        });

      });

      describe('useRestApi method', function () {

        it('should be a function', function () {
          expect(appInterface.useRestApi).toBeFunction();
        });

        it('should trigger a USE_REST_API event on the appEventBus and set appConfig.currentAPI to "REST"', function () {
          // Delete this first
          delete appConfig.currentAPI;
          // Now call the method
          appInterface.useRestApi();
          // This should have been emitted...
          expect(mocks.appEventBus.emit).toHaveBeenCalledWith(mocks.PARSE_APP_EVENTS.USE_REST_API);
          // ... and this should have been set
          expect(appConfig.currentAPI).toEqual('REST');
        });

        it('should not do anything if the REST_KEY is not set on appConfig', function () {
          delete appConfig.REST_KEY;
          delete appConfig.currentAPI;
          appInterface.useRestApi();
          expect(mocks.appEventBus.emit).not.toHaveBeenCalled();
          expect(appConfig.currentAPI).toBeUndefined();
        });

      });
    });
  });
});