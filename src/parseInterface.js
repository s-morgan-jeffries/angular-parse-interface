angular
  .module('angularParseInterface')
  .factory('parseInterface', function (ParseAppEventBus,
                                       parseResource,
                                       parseObjectFactory,
                                       parseUser,
                                       parseQueryBuilder,
                                       parseCloudCode,
                                       parseRole) {
    'use strict';

    var parseInterface = {};

    // The only API entry point
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

      // Create an application-specific event bus
      appEventBus = new ParseAppEventBus();

      // Create an application-specific resource factory (analogous to $resource). This will add headers to all requests
      // that are specific to this application, including a sessionToken when appropriate. It will also encode and
      // decode data with the correct format for Parse's API.
      appResource = parseResource.createAppResourceFactory(appConfig, appStorage, appEventBus);

      // Compose the application interface
      appInterface = {};
        // An object factory. This takes a className argument and returns a Resource mapped to a Parse Object
      appInterface.objectFactory = parseObjectFactory.createObjectFactory(appResource);
        // A User model. It has the same capabilities as other Resources, as well as some additional user-specific
        // methods.
      appInterface.User = parseUser.createUserModel(appResource, appStorage, appEventBus);
        // A constructor that takes a Resource and returns a query builder.
      appInterface.Query = parseQueryBuilder.Query;
        // A factory that generates functions that call cloud functions
      appInterface.getCloudCaller = parseCloudCode.createCallerFactory(appResource);
        // t0d0: Add test for this
      appInterface.roleFactory = parseRole.createRoleFactory(appResource, appInterface.User);


      return appInterface;
    };

    return parseInterface;
  });