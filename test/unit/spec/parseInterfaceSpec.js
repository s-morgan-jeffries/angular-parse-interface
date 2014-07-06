'use strict';

describe('Factory: parseInterface', function () {
  var parseInterface,
    mocks;
  // KEEP THIS IN SYNC WITH THE VALUE IN parseInterface.js
  var JS_SDK_VERSION = 'js1.2.18';

  beforeEach(function () {
    mocks = {};
    mocks.parseStorage = {
      localStorage: {},
      sessionStorage: {}
    };
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
      $provide.value('parseStorage', mocks.parseStorage);
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
//      clientStorage,
      clientLocalStorage,
      clientSessionStorage;

    beforeEach(function () {
      appConfig = {
        APPLICATION_ID: '12345',
        REST_KEY: 'abcde',
        JS_KEY: 'fghijk'
      };
      clientLocalStorage = mocks.parseStorage.localStorage;
      clientSessionStorage = mocks.parseStorage.sessionStorage;
    });

    it('should create a new ParseAppEventBus', function () {
      appInterface = parseInterface.createAppInterface(appConfig);
      expect(mocks.ParseAppEventBus).toHaveBeenCalled();
      expect(mocks.appEventBus.ctx).toEqual({});
    });

    it('should error if appConfig does not have an APPLICATION_ID property', function () {
      var create = function () {
          parseInterface.createAppInterface(badConfig);
        },
        badConfig = angular.copy(appConfig);

      delete badConfig.APPLICATION_ID;
      expect(create).toThrowError();
    });

    it('should set appConfig.currentAPI to "REST" if appConfig has a REST_KEY', function () {
      parseInterface.createAppInterface(appConfig);
      expect(appConfig.currentAPI).toEqual('REST');
    });

    it('should set appConfig.currentAPI to "JS" if appConfig has a JS_KEY but no REST_KEY', function () {
      delete appConfig.REST_KEY;
      parseInterface.createAppInterface(appConfig);
      expect(appConfig.currentAPI).toEqual('JS');
    });

    it('should error if appConfig is missing both JS_KEY and REST_KEY properties', function () {
      var create = function () {
        parseInterface.createAppInterface(appConfig);
      };
      delete appConfig.REST_KEY;
      delete appConfig.JS_KEY;
      expect(create).toThrowError();
    });

    it('should create a namespace for application storage within the parseStorage.localStorage object', function () {
      var appId = appConfig.APPLICATION_ID,
        appLocalStorage;
      appInterface = parseInterface.createAppInterface(appConfig);
      appLocalStorage = clientLocalStorage.parseApp[appId];
      expect(appLocalStorage).toBeObject();
    });

    it('should create a namespace for application storage within the parseStorage.sessionStorage object', function () {
      var appId = appConfig.APPLICATION_ID,
        appSessionStorage;
      appInterface = parseInterface.createAppInterface(appConfig);
      appSessionStorage = clientSessionStorage.parseApp[appId];
      expect(appSessionStorage).toBeObject();
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

    it('should set the CLIENT_VERSION key on appConfig to the current JS SDK version', function () {
      appInterface = parseInterface.createAppInterface(appConfig);
      expect(appConfig.CLIENT_VERSION).toEqual(JS_SDK_VERSION);
    });

    it('should set the INSTALLATION_ID key on appConfig to the value stored in appLocalStorage if it exists', function () {
      var installationId = 'asdfjk;l;',
        appId = appConfig.APPLICATION_ID,
        appLocalStorage;
      clientLocalStorage.parseApp = {};
      appLocalStorage = clientLocalStorage.parseApp[appId] = {};
      appLocalStorage.INSTALLATION_ID = installationId;
      appInterface = parseInterface.createAppInterface(appConfig, clientLocalStorage);
      expect(appConfig.INSTALLATION_ID).toEqual(installationId);
    });

    it('should create a new INSTALLATION_ID if it does not exist and add it both to appConfig and to appLocalStorage', function () {
      var appId = appConfig.APPLICATION_ID,
        appLocalStorage;
      appInterface = parseInterface.createAppInterface(appConfig, clientLocalStorage);
      appLocalStorage = clientLocalStorage.parseApp[appId];
      expect(appConfig.INSTALLATION_ID).toBeNonEmptyString();
      expect(appLocalStorage.INSTALLATION_ID).toBeNonEmptyString();
      expect(appConfig.INSTALLATION_ID).toEqual(appLocalStorage.INSTALLATION_ID);
    });

    it('should create a new appResource', function () {
      appInterface = parseInterface.createAppInterface(appConfig);
      var appSessionStorage = clientSessionStorage.parseApp[appConfig.APPLICATION_ID];
      expect(mocks.parseResource.createAppResourceFactory).toHaveBeenCalledWith(mocks.appEventBus, appSessionStorage);
    });

    it('should return an object', function () {
      appInterface = parseInterface.createAppInterface(appConfig);
      expect(appInterface).toBeObject();
    });

    describe('appInterface object', function () {
      var appSessionStorage;

      beforeEach(function () {
        appInterface = parseInterface.createAppInterface(appConfig);
        appSessionStorage = clientSessionStorage.parseApp[appConfig.APPLICATION_ID];
      });

      it('should have an objectFactory property', function () {
        expect(mocks.parseObjectFactory.createObjectFactory).toHaveBeenCalledWith(mocks.appResource);
        expect(appInterface.objectFactory).toBe(mocks.appObjectFactory);
      });

      it('should have a User property', function () {
        expect(mocks.parseUser.createUserModel).toHaveBeenCalledWith(mocks.appResource, appSessionStorage, mocks.appEventBus);
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