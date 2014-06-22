'use strict';

describe('Factory: parseInterface', function () {
  var parseInterface;

  beforeEach(function () {
    module('angularParseInterface', function (/*$provide*/) {
//      $provide.value('$rootScope', mockRootScope);
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

    it('should return a new appInterface', function () {
      appInterface = parseInterface.createAppInterface(appConfig, clientStorage);
      expect(appInterface).toBeObject();
      expect(appInterface.objectFactory).toBeFunction();
      expect(appInterface.User).toBeFunction();
      expect(appInterface.Query).toBeFunction();
//      expect(appInterface.roleFactory).toBeFunction();
//      expect(appInterface.cloudFunctions).toBeFunction();
//      expect(appInterface.fileUploader).toBeFunction();
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
  });
});