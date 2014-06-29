angular
  .module('angularParseInterface')
  .factory('parseInterface', function (ParseAppEventBus, parseResource, parseObjectFactory, parseUser, parseQueryBuilder) {
    'use strict';

    // Create a new isolated scope for the event bus
    var parseInterface = {};

    parseInterface.createAppInterface = function (appConfig, clientStorage) {
      var appId,
        appStorage,
        appEventBus,
        appResource,
        appInterface;

      // Throw error if we're missing required properties from appConfig
      if (!('applicationId' in appConfig)) {
        throw new Error('appConfig must have an "applicationId" property');
      }
      appId = appConfig.applicationId;
      if (!('restKey' in appConfig)) {
        throw new Error('appConfig must have a "restKey" property');
      }

      // Get or create appStorage object
      clientStorage = clientStorage || {};
      clientStorage.parseApp = clientStorage.parseApp || {};
      appStorage = clientStorage.parseApp[appId] = (clientStorage.parseApp[appId] || {});

      appEventBus = new ParseAppEventBus();

      appResource = parseResource.createAppResourceFactory(appConfig, appStorage, appEventBus);

      appInterface = {};

      appInterface.objectFactory = parseObjectFactory.createObjectFactory(appResource);

      appInterface.User = parseUser.createUserModel(appResource, appStorage, appEventBus);

      appInterface.Query = parseQueryBuilder.Query;

      return appInterface;
    };

    return parseInterface;
  });