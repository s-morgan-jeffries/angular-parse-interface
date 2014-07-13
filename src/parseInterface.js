angular
  .module('angularParseInterface')
  .factory('parseInterface', function (parseStorage,
                                       ParseAppEventBus,
                                       PARSE_APP_EVENTS,
                                       parseResource,
                                       parseObjectFactory,
                                       parseUser,
                                       parseQueryBuilder,
                                       parseCloudCode,
                                       parseRole,
                                       parseEvent) {
    'use strict';

    // Version string (JS SDK uses this)
    // KEEP THIS IN SYNC WITH THE VALUE IN parseInterfaceSpec.js
    var JS_SDK_VERSION = 'js1.2.18';

    var clientLocalStorage = parseStorage.localStorage;
    clientLocalStorage.parseApp = clientLocalStorage.parseApp || {};

    var clientSessionStorage = parseStorage.sessionStorage;
    clientSessionStorage.parseApp = clientSessionStorage.parseApp || {};

    var parseInterface = {};

    // The only API entry point
    parseInterface.createAppInterface = function (appConfig) {
      var appId,
        appLocalStorage,
        appSessionStorage,
        appEventBus,
        appResource,
        appInterface;

      // Create a local copy to prevent any unpleasant side effects
      appConfig = angular.copy(appConfig);

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

      //backburner: Update this so you can switch between local, session, and volatile storage
      // Get or create appLocalStorage object
      appLocalStorage = clientLocalStorage.parseApp[appId] = (clientLocalStorage.parseApp[appId] || {});

      // Get or create appSessionStorage object
      appSessionStorage = clientSessionStorage.parseApp[appId] = (clientSessionStorage.parseApp[appId] || {});

      // Installation ID used by JS SDK
      if (!appLocalStorage.INSTALLATION_ID || appLocalStorage.INSTALLATION_ID === '') {
        // It wasn't in localStorage, so create a new one.
        var hexOctet = function () {
          return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
        };
        // This is how the Parse JS SDK does it
        appLocalStorage.INSTALLATION_ID = (
          hexOctet() + hexOctet() + '-' +
          hexOctet() + '-' +
          hexOctet() + '-' +
          hexOctet() + '-' +
          hexOctet() + hexOctet() + hexOctet());
      }
      // Now set INSTALLATION_ID on appConfig
      appConfig.INSTALLATION_ID = appLocalStorage.INSTALLATION_ID;

      // Version string
      appConfig.CLIENT_VERSION = JS_SDK_VERSION;

      // We need a way to pass initial configuration info to the rest of the app. Rather than pass the appConfig to the
      // different modules, I'm using an event bus. Once a module is up and running, it should trigger a
      // MODULE_REGISTERED event and pass its name as data.
      appEventBus.on(PARSE_APP_EVENTS.MODULE_REGISTERED, function (e, modName) {
        var eventName = PARSE_APP_EVENTS.MODULE_INIT + '.' + modName;
        // The response is to emit a namespaced event with the appConfig.
        appEventBus.emit(eventName, appConfig);
      });

      // Create an application-specific resource factory (analogous to $resource). This will add headers to all requests
      // that are specific to this application, including a sessionToken when appropriate. It will also encode and
      // decode data with the correct format for Parse's API.
      appResource = parseResource.createAppResourceFactory(appEventBus, appSessionStorage);

      // Compose the application interface
      appInterface = {};
      // An object factory. This takes a className argument and returns a Resource mapped to a Parse Object
      appInterface.objectFactory = parseObjectFactory.createObjectFactory(appResource);
      // A User model. It has the same capabilities as other Resources, as well as some additional user-specific
      // methods.
      appInterface.User = parseUser.createUserModel(appResource, appSessionStorage, appEventBus);
      // A constructor that takes a Resource and returns a query builder.
      appInterface.Query = parseQueryBuilder.Query;
      // A factory that generates functions that call cloud functions
      appInterface.getCloudCaller = parseCloudCode.createCallerFactory(appResource);
      // A factory that generates role objects that can be used for setting permissions
      appInterface.roleFactory = parseRole.createRoleFactory(appResource, appInterface.User);
      // A factory that generates custom event objects
      appInterface.eventFactory = parseEvent.createEventFactory(appResource, appEventBus);
      // This allows you to switch to using the JS API at runtime.
      appInterface.useJsApi = function () {
        if (appConfig.JS_KEY) {
          // For any modules that haven't yet registered
          appConfig.currentAPI = 'JS';
          appEventBus.emit(PARSE_APP_EVENTS.USE_JS_API);
        }
      };
      // This allows you to switch to using the REST API at runtime.
      appInterface.useRestApi = function () {
        if (appConfig.REST_KEY) {
          // For any modules that haven't yet registered
          appConfig.currentAPI = 'REST';
          appEventBus.emit(PARSE_APP_EVENTS.USE_REST_API);
        }
      };

      return appInterface;
    };

    return parseInterface;
  });