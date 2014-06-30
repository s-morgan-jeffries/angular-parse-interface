'use strict';

describe('Factory: parseInterface', function () {
  var parseInterface,
    mocks;

  beforeEach(function () {
    mocks = {};
    mocks.appEventBus = {};
    mocks.ParseAppEventBus = function () {
      // If this function is called with new, it will add an empty object to mocks.appEventBus as the ctx property.
      mocks.appEventBus.ctx = this;
      return mocks.appEventBus;
    };
    spyOn(mocks, 'ParseAppEventBus').andCallThrough();
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
    module('angularParseInterface', function ($provide) {
      $provide.value('ParseAppEventBus', mocks.ParseAppEventBus);
      $provide.value('parseResource', mocks.parseResource);
      $provide.value('parseObjectFactory', mocks.parseObjectFactory);
      $provide.value('parseUser', mocks.parseUser);
      $provide.value('parseQueryBuilder', mocks.parseQueryBuilder);
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
        applicationId: '12345',
        restKey: 'abcde'
      };
      clientStorage = {};
    });

    it('should error if appConfig does not have applicationId and restKey properties', function () {
      var create = function () {
          parseInterface.createAppInterface(badConfig, clientStorage);
        },
        badConfig = angular.copy(appConfig);

      delete badConfig.applicationId;
      expect(create).toThrowError();
      badConfig = angular.copy(appConfig);
      delete badConfig.restKey;
      expect(create).toThrowError();
    });

    it('should create a namespace for application storage within the provided clientStorage object', function () {
      var appId = appConfig.applicationId,
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

    it('should create a new ParseAppEventBus', function () {
      appInterface = parseInterface.createAppInterface(appConfig, clientStorage);
      expect(mocks.ParseAppEventBus).toHaveBeenCalled();
      expect(mocks.appEventBus.ctx).toEqual({});
    });

    it('should create a new appResource', function () {
      appInterface = parseInterface.createAppInterface(appConfig, clientStorage);
      var appStorage = clientStorage.parseApp[appConfig.applicationId];
      expect(mocks.parseResource.createAppResourceFactory).toHaveBeenCalledWith(appConfig, appStorage, mocks.appEventBus);
    });

    it('should return a new appInterface', function () {
      appInterface = parseInterface.createAppInterface(appConfig, clientStorage);
      expect(appInterface).toBeObject();
      expect(appInterface.objectFactory).toBeDefined();
      expect(appInterface.User).toBeDefined();
      expect(appInterface.Query).toBeDefined();
//      expect(appInterface.roleFactory).toBeFunction();
//      expect(appInterface.cloudFunctions).toBeFunction();
//      expect(appInterface.fileUploader).toBeFunction();
    });

    describe('appInterface object', function () {
      var appStorage;

      beforeEach(function () {
        appInterface = parseInterface.createAppInterface(appConfig, clientStorage);
        appStorage = clientStorage.parseApp[appConfig.applicationId];
      });

      it('should have an objectFactory', function () {
        expect(mocks.parseObjectFactory.createObjectFactory).toHaveBeenCalledWith(mocks.appResource);
        expect(appInterface.objectFactory).toBe(mocks.appObjectFactory);
      });

      it('should have a User', function () {
        expect(mocks.parseUser.createUserModel).toHaveBeenCalledWith(mocks.appResource, appStorage, mocks.appEventBus);
        expect(appInterface.User).toBe(mocks.User);
      });

      it('should have a Query', function () {
        expect(appInterface.Query).toBe(mocks.parseQueryBuilder.Query);
      });
    });
  });
});