angular
  .module('angularParseInterface')
  .factory('parseInterface', function () {
    'use strict';

    // Create a new isolated scope for the event bus
    var parseInterface = {};

    parseInterface.createAppInterface = function (appConfig, clientStorage) {
      var appId,
        appStorage,
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

      appInterface = {};

      appInterface.objectFactory = function () {};

      appInterface.User = function () {};

      appInterface.Query = function () {};

      return appInterface;
    };

    return parseInterface;
  });