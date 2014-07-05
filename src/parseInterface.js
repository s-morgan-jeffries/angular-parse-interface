angular
  .module('angularParseInterface')
  .factory('parseInterface', function (ParseAppEventBus,
                                       PARSE_APP_EVENTS,
                                       parseResource,
                                       parseObjectFactory,
                                       parseUser,
                                       parseQueryBuilder,
                                       parseCloudCode,
                                       parseRole,
                                       parseEvent) {
    'use strict';

    var parseInterface = {};

    // The only API entry point
    parseInterface.createAppInterface = function (appConfig, clientStorage) {
      var appId,
        appStorage,
        appEventBus,
        appResource,
        appInterface;

      // Create an application-specific event bus
      appEventBus = new ParseAppEventBus();

      // Throw error if we're missing an application ID
      if (!(appConfig.APPLICATION_ID)) {
        throw new Error('appConfig must have an "APPLICATION_ID" property');
      }
      // ... otherwise, capture the application ID for use below
      appId = appConfig.APPLICATION_ID;

      if (appConfig.REST_KEY) {
        // If there's a REST key, use the REST API by default
        appConfig.currentAPI = 'REST';
      } else if (appConfig.JS_KEY) {
        // Otherwise, if there's a JS key, use the JS API by default
        appConfig.currentAPI = 'JS';
      } else {
        // Otherwise, throw an error
        throw new Error('appConfig must have either a "REST_KEY" or a "JS_KEY" property');
      }

      // We need a way to pass initial configuration info to the rest of the app. Rather than pass the appConfig to the
      // different modules, I'm using an event bus. Once a module is up and running, it should trigger a
      // MODULE_REGISTERED event and pass its name as data.
      appEventBus.on(PARSE_APP_EVENTS.MODULE_REGISTERED, function (e, modName) {
        var eventName = PARSE_APP_EVENTS.MODULE_INIT + '.' + modName;
        // The response is to emit a namespaced event with the appConfig.
        appEventBus.emit(eventName, appConfig);
      });

      // Get or create appStorage object
      clientStorage = clientStorage || {};
      clientStorage.parseApp = clientStorage.parseApp || {};
      appStorage = clientStorage.parseApp[appId] = (clientStorage.parseApp[appId] || {});

      // Create an application-specific resource factory (analogous to $resource). This will add headers to all requests
      // that are specific to this application, including a sessionToken when appropriate. It will also encode and
      // decode data with the correct format for Parse's API.
      appResource = parseResource.createAppResourceFactory(appEventBus, appStorage);

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
      // A factory that generates role objects that can be used for setting permissions
      appInterface.roleFactory = parseRole.createRoleFactory(appResource, appInterface.User);
      // A factory that generates custom event objects
      appInterface.eventFactory = parseEvent.createEventFactory(appResource);
      // This allows you to trigger an event that tells the rest of the application we're using the JS API.
      appInterface.useJsApi = function () {
        if (appConfig.JS_KEY) {
          appConfig.currentAPI = 'JS';
          appEventBus.emit(PARSE_APP_EVENTS.USE_JS_API);
        }
      };
      // This allows you to trigger an event that tells the rest of the application we're using the REST API.
      appInterface.useRestApi = function () {
        if (appConfig.REST_KEY) {
          appConfig.currentAPI = 'REST';
          appEventBus.emit(PARSE_APP_EVENTS.USE_REST_API);
        }
      };

      return appInterface;
    };

    return parseInterface;
  });