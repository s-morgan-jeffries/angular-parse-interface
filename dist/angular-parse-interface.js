angular
  .module('angularParseInterface', [
    'ngResource',
    'ngStorage'
  ])
;

// You still need to get cloud functions, roles, files, and user linking working at minimum. Roles are an extension of
// ACLs, and getting working ACLs will depend on having your decorators set up correctly. The decorators will depend on
// the behavior of non-Resource "Resources" (e.g. cloud functions and files). So you should probably save roles until
// after you get those working.

// Okay, it turns out files are pretty complicated. Do cloud functions (or FB integration) first, then roles.
angular
  .module('angularParseInterface')
  .factory('ParseAppEventBus', function ($rootScope) {
    'use strict';

    // Create a new isolated scope for the event bus
    var ParseAppEventBus = function ParseAppEventBus() {
      this._$scope = $rootScope.$new(true);
      this._events = {};
    };

    // Register an event handler
    ParseAppEventBus.prototype.on = function (eventName, handler) {
      // Delegate to the scope's $on method
      var unregisterHandler = this._$scope.$on(eventName, handler);
      // Add the handler and deregistration function to the event handlers array
      var eventHandlers = this._events[eventName] = (this._events[eventName] || []);
      eventHandlers.push({
        handler: handler,
        unregisterHandler: unregisterHandler
      });
    };

    // Unregister an event handler
    ParseAppEventBus.prototype.off = function (eventName, handler) {
      var eventHandlers = (this._events[eventName] || []),
        updatedEventHandlers = [];
      // Loop through all the eventHandlers
      angular.forEach(eventHandlers, function (handlerObj) {
        // If there's no handler (i.e. we're unregistering all handlers for this event) or we've found the handler
        if (!handler || (handlerObj.handler === handler)) {
          // Unregister the handler on the _$scope
          handlerObj.unregisterHandler();
        } else {
          // If neither of the above is true, add this to the new eventHandlers array
          updatedEventHandlers.push(handlerObj);
        }
      });
      // Set the handlersArray to the updated value or, if the new array is empty, to undefined
      this._events[eventName] = updatedEventHandlers.length ? updatedEventHandlers : undefined;
    };

    // Calls the handler function the first time the named event is emitted
    ParseAppEventBus.prototype.once = function (eventName, handler) {
      var eventBus = this;
      // Make a wrapped handler function that will call the handler and then unregister it
      var wrappedHandler = function () {
        handler.apply(handler, arguments);
        eventBus.off(eventName, handler);
      };
      // Delegate to the scope's $on method
      var unregisterHandler = this._$scope.$on(eventName, wrappedHandler);
      // Add the handler and deregistration function to the event handlers array (using the original function allows
      // consumers to use the off function in the expected way)
      var eventHandlers = this._events[eventName] = (this._events[eventName] || []);
      eventHandlers.push({
        handler: handler,
        unregisterHandler: unregisterHandler
      });
    };

    // Trigger an event
    ParseAppEventBus.prototype.emit = function (/* event, args */) {
      var scope = this._$scope;
      // Delegate to the scope's emit method
      scope.$emit.apply(scope, arguments);
    };

    return ParseAppEventBus;
  })
  // A map of event names to the strings that are used on the event bus
  .value('PARSE_APP_EVENTS', {
    SIGN_IN: 'SIGN_IN',
    SIGN_OUT: 'SIGN_OUT',
    USE_JS_API: 'USE_JS_API',
    USE_REST_API: 'USE_REST_API',
    MODULE_REGISTERED: 'MODULE_REGISTERED',
    MODULE_INIT: 'MODULE_INIT'
  });
// d0ne: Verify this works with JS API
angular
  .module('angularParseInterface')
  .factory('parseCloudCode', function (parseResourceActions/*, $log*/) {
    'use strict';

    var parseCloudCode = {};

    parseCloudCode.createCallerFactory = function (appResourceFactory) {
      // We call cloud functions by posting to their url
      var url = '/functions/:functionName',
        // The only parameter we'll use is functionName, and there shouldn't be any default value for that
        defaultParams = {},
        // The only action we need is POST
        customActions = {
          POST: parseResourceActions.getActionConfig('POST')
        },
        // Create the Function model using our application's resource factory
        Function = appResourceFactory(url, defaultParams, customActions);

      // This is the application's cloud caller factory. It returns a function that will call the named cloud function
      return function cloudCallerFactory(functionName) {
        // The params for this cloud caller
        var params = {functionName: functionName};
        // Return a function that will call the named cloud function
        return function (/* cloudFunctionArgs, onSuccess, onError */) {
          // Capture the arguments that were passed in
          var args = [].slice.call(arguments);
          // The first argument should be an object with keys and values representing the arguments to the cloud
          // function. If the cloud function takes no arguments, there's no need to pass this in. In that case, the
          // arguments array could be empty, or it could contain a success callback and possibly and error callback. We
          // have to pass an object as the first argument to the POST method, so this deals with that.
          if (!angular.isObject(args[0])) {
            // Push an empty object to the front of the args array
            args.unshift({});
          }
          // Now push the params to the front of the arguments array.
          args.unshift(params);

          // NB: We are assuming that the only trailing arguments will be a success callback and an error callback, but
          // we're not checking for that. IF we decide to introduce some error-checking on that point, it should
          // probably go in the action definition.
          // backburner: Update API so consumers of cloud callers can pass in streamlined handler functions
            // The streamlined functions should only have to deal with the actual response and the actual error without
            // having to know where they're stored within the response object. The only question is whether that change
            // should be made here or in the definition of the POST action, which isn't yet clear to me.

          // Now we just call Function's POST method and return the result
          return Function.POST.apply(Function, args);
        };
      };
    };

    return parseCloudCode;
  });
angular
  .module('angularParseInterface')
  .factory('parseEvent', function ($q, parseResourceActions, PARSE_APP_EVENTS) {
    'use strict';

    var parseEvent = {};

    // Currently a do-little function. But because I'm going to have to pack a lot of functionality into the basic
    // ParseResource (because some things just can't be added later), this might be necessary for removing some
    // functionality (e.g. making arbitrary HTTP requests).
    parseEvent._parseEventDecorator = function (ParseEvent, eventName) {
      ParseEvent.className = eventName;
    };

    parseEvent._encodeDate = function (date) {
      if (date instanceof Date) {
        return {
          __type: 'Date',
          iso: date.toISOString()
        };
      }
    };

    parseEvent.createEventFactory = function (appResourceFactory, appEventBus) {
      var parseEventDecorator = this._parseEventDecorator,
        encodeDate = parseEvent._encodeDate,
        useJsApi = false,
        moduleName = 'parseEvent',
        // Namespaced initialization event. The appInterface will emit this with the appConfig when the
        // MODULE_REGISTERED event is emitted with our moduleName.
        INIT_EVENT = PARSE_APP_EVENTS.MODULE_INIT + '.' + moduleName;

      // Register event handlers
      // This is the handler for the INIT_EVENT
      // Register the handler for the INIT_EVENT
      appEventBus.once(INIT_EVENT, function (event, appConfig) {
        // Determine whether we're using the JS API
        useJsApi = appConfig.currentAPI === 'JS';
      });
      // Now that the handler is set up, we can emit the MODULE_REGISTERED event, which will cause the appInterface to
      // emit the INIT_EVENT with the appConfig
      appEventBus.emit(PARSE_APP_EVENTS.MODULE_REGISTERED, moduleName);
      // On a USE_REST_API event, set useJsApi to false
      appEventBus.on(PARSE_APP_EVENTS.USE_REST_API, function () {
        useJsApi = false;
      });
      // On a USE_JS_API event, set useJsApi to true
      appEventBus.on(PARSE_APP_EVENTS.USE_JS_API, function () {
        useJsApi = true;
      });

      // The objectFactory function that will be returned
      return function (eventName/*, defaultParams, customActions*/) {
        // Parse's URL scheme for Objects
        var url = '/events/' + eventName,
          defaultParams = {},
        // Custom actions from the action library
          customActions = {
            POST: parseResourceActions.getActionConfig('POST')
          },
          ParseEvent;

        ParseEvent = appResourceFactory(url, defaultParams, customActions);

        parseEventDecorator(ParseEvent, eventName);

        //t0d0: Add tests for this
        return function logEvent(data, time) {
          var postData = {
            dimensions: data
          };
          if (time) {
            postData.at = encodeDate(time);
          }
          if (useJsApi) {
            return ParseEvent.POST(postData);
          }
        };
      };
    };

    return parseEvent;
  });
angular
  .module('angularParseInterface')
  .factory('parseFile', function () {
    'use strict';

    // This should create the File service for an application. I need to see what's out there in terms of file
    // uploaders, but I feel like this should only upload pre-serialized data and that something else should take
    // responsibility for that part of it.
    var parseFile = {};

    // You could use FormData to serialize data and pass that in, but that doesn't work in some older browsers, which
    // might bother some people.

    return parseFile;
  });
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
angular
  .module('angularParseInterface')
  .factory('parseObjectFactory', function (parseResourceActions) {
    'use strict';

    // Currently a do-little function. But because I'm going to have to pack a lot of functionality into the basic
    // ParseResource (because some things just can't be added later), this might be necessary for removing some
    // functionality (e.g. making arbitrary HTTP requests).
    var parseObjectDecorator = function (ParseObject, className) {
      ParseObject.className = className;
    };

    var parseObjectFactory = {};

    parseObjectFactory.createObjectFactory = function (appResourceFactory) {
      // The objectFactory function that will be returned
      return function (className/*, defaultParams, customActions*/) {
        // Parse's URL scheme for Objects
        var url = '/classes/' + className + '/:objectId',
          defaultParams = {objectId: '@objectId'},
        // Custom actions from the action library
          customActions = {
            get: parseResourceActions.getActionConfig('get'),
            query: parseResourceActions.getActionConfig('query'),
            save: parseResourceActions.getActionConfig('save'),
            delete: parseResourceActions.getActionConfig('delete'),
            PUT: parseResourceActions.getActionConfig('PUT')
          },
          ParseObject;

        ParseObject = appResourceFactory(url, defaultParams, customActions);

        parseObjectDecorator(ParseObject, className);

        return ParseObject;
      };
    };

    return parseObjectFactory;
  });
angular
  .module('angularParseInterface')
  .factory('parseQueryBuilder', function () {
    'use strict';

    var isNonArrayObj = function (val) {
      return angular.isObject(val) && !angular.isArray(val);
    };

    // jshint bitwise:false
    var pick = function (obj, keys) {
      var newObj = {};
      angular.forEach(obj, function (v, k) {
        if (~keys.indexOf(k)) {
          newObj[k] = v;
        }
      });
      return newObj;
    };
    // jshint bitwise:true

    var omit = function (obj, keys) {
      var newObj = {};
      angular.forEach(obj, function (v, k) {
        if (keys.indexOf(k) < 0) {
          newObj[k] = v;
        }
      });
      return newObj;
    };

    var parseQueryBuilder = {};

    var Query = parseQueryBuilder.Query = function (Resource) {
      this._Resource = Resource;
      this._params = {};
    };

    Query.prototype._getConstraints = function () {
      return angular.copy(this._params.where) || {};
    };

    Query.prototype._setConstraints = function (constraints) {
      this._params.where = constraints;
    };

    Query.prototype._getFieldConstraints = function (fieldName) {
      var constraints = this._getConstraints();
      return angular.copy(constraints[fieldName]) || {};
    };

    Query.prototype._setFieldConstraints = function (fieldName, val) {
      var constraints = this._getConstraints();
      constraints[fieldName] = val;
      this._setConstraints(constraints);
    };

    Query.prototype._setFieldConstraintsKey = function (fieldName, key, val, opts) {
      var compatibleKeys = opts.compatibleKeys,
        incompatibleKeys = opts.incompatibleKeys,
        fieldConstraints = this._getFieldConstraints(fieldName);

      fieldConstraints = isNonArrayObj(fieldConstraints) ? fieldConstraints : {};
      if (compatibleKeys) {
        fieldConstraints = pick(fieldConstraints, compatibleKeys);
      }
      if (incompatibleKeys) {
        fieldConstraints = omit(fieldConstraints, incompatibleKeys);
      }
      fieldConstraints[key] = val;
      this._setFieldConstraints(fieldName, fieldConstraints);
      return this;
    };

    // equalTo
    Query.prototype.equalTo = function (fieldName, val) {
      this._setFieldConstraints(fieldName, val);
      return this;
    };
//    var allKeys = ['$lt', '$lte', '$gt', '$gte', '$ne', '$in', '$nin', '$exists', '$select', '$dontSelect', '$inQuery', '$notInQuery', '$regex', '$all'];

    // notEqualTo
    Query.prototype.notEqualTo = function (fieldName, val) {
      var key = '$ne',
        incompatibleConstraints = ['$all'];
      this._setFieldConstraintsKey(fieldName, key, val, {incompatibleKeys: incompatibleConstraints});
      return this;
    };

    // lessThan
    Query.prototype.lessThan = function (fieldName, val) {
      var key = '$lt',
        incompatibleConstraints = ['$lte', '$all'];
      this._setFieldConstraintsKey(fieldName, key, val, {incompatibleKeys: incompatibleConstraints});
      return this;
    };
    // lessThanOrEqualTo
    Query.prototype.lessThanOrEqualTo = function (fieldName, val) {
      var key = '$lte',
        incompatibleConstraints = ['$lt', '$all'];
      this._setFieldConstraintsKey(fieldName, key, val, {incompatibleKeys: incompatibleConstraints});
      return this;
    };
    // greaterThan
    Query.prototype.greaterThan = function (fieldName, val) {
      var key = '$gt',
        incompatibleConstraints = ['$gte', '$all'];
      this._setFieldConstraintsKey(fieldName, key, val, {incompatibleKeys: incompatibleConstraints});
      return this;
    };
    // greaterThanOrEqualTo
    Query.prototype.greaterThanOrEqualTo = function (fieldName, val) {
      var key = '$gte',
        incompatibleConstraints = ['$gt', '$all'];
      this._setFieldConstraintsKey(fieldName, key, val, {incompatibleKeys: incompatibleConstraints});
      return this;
    };

    // containedIn
    Query.prototype.containedIn = function (fieldName, val) {
      var key = '$in',
        incompatibleConstraints = ['$all'];
      this._setFieldConstraintsKey(fieldName, key, val, {incompatibleKeys: incompatibleConstraints});
      return this;
    };
    // notContainedIn
    Query.prototype.notContainedIn = function (fieldName, val) {
      var key = '$nin',
        incompatibleConstraints = ['$all'];
      this._setFieldConstraintsKey(fieldName, key, val, {incompatibleKeys: incompatibleConstraints});
      return this;
    };

    // exists
    Query.prototype.exists = function (fieldName) {
      var key = '$exists',
        val = true,
        incompatibleConstraints = ['$gt', '$gte', '$lt', '$lte', '$in', '$nin', '$all'];
      this._setFieldConstraintsKey(fieldName, key, val, {incompatibleKeys: incompatibleConstraints});
      return this;
    };
    // doesNotExist
    Query.prototype.doesNotExist = function (fieldName) {
      var key = '$exists',
        val = false,
        // This will remove all other keys
        compatibleConstraints = [];
      this._setFieldConstraintsKey(fieldName, key, val, {compatibleKeys: compatibleConstraints});
      return this;
    };

    // startsWith
    Query.prototype.startsWith = function (fieldName, str) {
      var key = '$regex',
        incompatibleConstraints = ['$all'],
        regexStr = '^\\Q' + str + '\\E';
      this._setFieldConstraintsKey(fieldName, key, regexStr, {incompatibleKeys: incompatibleConstraints});
      return this;
    };

    // Relational
    // isRelationOf
    Query.prototype.isRelationOf = function (fieldName, obj) {
      var constraints = this._getConstraints();
      constraints.$relatedTo = {
        object: {
          __type: 'Pointer',
          className: obj.className,
          objectId: obj.objectId
        },
        key: fieldName
      };
      this._setConstraints(constraints);
      return this;
    };
    // isRelatedTo
    Query.prototype.isRelatedTo = function (fieldName, obj) {
      var fieldConstraints = {
        __type: 'Pointer',
        className: obj.className,
        objectId: obj.objectId
      };
      this._setFieldConstraints(fieldName, fieldConstraints);
      return this;
    };

    // Arrays
    // contains
    Query.prototype.contains = function (fieldName, val) {
      this._setFieldConstraints(fieldName, val);
      return this;
    };
    // containsAll
    Query.prototype.containsAll = function (fieldName/*, vals */) {
      var key = '$all',
        val = (angular.isArray(arguments[1]) && arguments.length === 2) ? arguments[1] : [].slice.call(arguments, 1),
        compatibleConstraints = [];
      this._setFieldConstraintsKey(fieldName, key, val, {compatibleKeys: compatibleConstraints});
      return this;
    };

    // matchesQuery
    Query.prototype.matchesQuery = function (fieldName, query, queryKey) {
      var key = '$select',
        incompatibleConstraints = ['$all'];
      queryKey = queryKey || 'objectId';
      var selectParams = {
        query: query._yieldParams(),
        key: queryKey
      };
      this._setFieldConstraintsKey(fieldName, key, selectParams, {incompatibleKeys: incompatibleConstraints});
      return this;
    };
    // doesNotMatchQuery
    Query.prototype.doesNotMatchQuery = function (fieldName, query, queryKey) {
      var key = '$dontSelect',
        incompatibleConstraints = ['$all'];
      queryKey = queryKey || 'objectId';
      var selectParams = {
        query: query._yieldParams(),
        key: queryKey
      };
      this._setFieldConstraintsKey(fieldName, key, selectParams, {incompatibleKeys: incompatibleConstraints});
      return this;
    };

    // Powerful
    Query.or = function (Resource) {
      var Query = this;
      var subQueries = [].slice.call(arguments, 1);
      var compoundQuery = new Query(Resource);
      var className = Resource.className;
      var queryArray = [];
      angular.forEach(subQueries, function (query) {
        var subQueryParams = query._yieldParams();
        if (subQueryParams.className === className) {
          queryArray.push(subQueryParams.where);
        }
      });
      compoundQuery._setConstraints({'$or': queryArray});
      return compoundQuery;
    };

    // This is for the next version
//    Query.prototype.include = function (/* relations */) {
//      var args = angular.isArray(arguments[0]) ? arguments[0] : [].slice.call(arguments);
//      // Need to filter that list according to which are known pointers
//      var includedFields = this._params.include || [];
//      var Resource = this._Resource;
//      var isIncludable = function (fieldName) {
//        return angular.equals(Resource._getFieldDataType(fieldName), 'Pointer') &&
//          !!Resource._getFieldClassName(fieldName) &&
//          !!Resource._getFieldRelationConstructor(fieldName);
//      };
//      angular.forEach(args, function (val, idx) {
////        if (isIncludable(val)) {
//          includedFields.push(val);
////        } else {
////          $log.warn('Cannot include a field without a known constructor');
////        }
//      });
//      this._params.include = includedFields;
//      return this;
//    };

    Query.prototype.skip = function (n) {
      this._params.skip = n;
      return this;
    };
    Query.prototype.limit = function (n) {
      this._params.limit = n;
      return this;
    };
    Query.prototype.count = function () {
      this._params.limit = 0;
      this._params.count = 1;
      return this;
    };
    Query.prototype.select = function () {
      this._params.keys = angular.isArray(arguments[0]) ? arguments[0] : [].slice.call(arguments);
      return this;
    };

    // ascending
    Query.prototype.ascending = function (fieldName) {
      this._params.order = this._params.order || [];
      this._params.order.push(fieldName);
      return this;
    };
    // descending
    Query.prototype.descending = function (fieldName) {
      this._params.order = this._params.order || [];
      this._params.order.push('-' + fieldName);
      return this;
    };
    // order
    Query.prototype.order = function (/* keys */) {
      this._params.order = angular.isArray(arguments[0]) ? arguments[0] : [].slice.call(arguments);
      return this;
    };

    Query.prototype._yieldParams = function () {
      var params = angular.copy(this._params);
      params.order = (params.order && params.order.length) ? params.order.join(',') : undefined;
//      params.include = params.include && params.include.length && params.include.join(',');
      params.className = this._Resource.className;
      return params;
    };
    // backburner: Update Query.prototype.exec so it can take callback functinos
    // backburner: Rename Query.prototype.exec to find
    // backburner: Refactor Query.prototype.count so it executes the query
    Query.prototype.exec = function () {
      var params = this._yieldParams();
      delete params.className;
      params.where = (typeof params.where !== 'undefined') ? JSON.stringify(params.where) : undefined;
      return this._Resource.query(params);
    };

    return parseQueryBuilder;
  });
//d0ne: Make sure this works with JS API
angular
  .module('angularParseInterface')
  .factory('parseRole', function ($q, parseResourceActions, parseQueryBuilder) {
    'use strict';

    var parseRole = {};

    var Query = parseQueryBuilder.Query;

    var roleDecorator = function (Role, User) {
      Role.className = '_Role';
      Role.hasMany('roles', Role);
      Role.hasMany('users', User);
    };

    parseRole.createRoleFactory = function (appResourceFactory, User) {
      // NB: This is not the URL pattern described in the Parse REST API documentation. That's because the official REST
      // endpoints don't accept OPTIONS requests. See here:
      // https://www.parse.com/questions/creating-a-role-cors-not-allowed-by-access-control-allow-origin
      var url = 'classes/_Role/:objectId',
      // The only default parameter is the objectId
        defaultParams = {
          objectId: '@objectId'
        },
      // Grab custom actions from the library
        customActions = {
          get: parseResourceActions.getActionConfig('get'),
          query: parseResourceActions.getActionConfig('query'),
          save: parseResourceActions.getActionConfig('save'),
          delete: parseResourceActions.getActionConfig('delete'),
          PUT: parseResourceActions.getActionConfig('PUT')
        },
      // Create the Role model using our application's resource factory
        Role = appResourceFactory(url, defaultParams, customActions);

      // Add functionality from above decorator
      roleDecorator(Role, User);

      // What we actually return is a factory function. This function takes a name and uses it to either 1) get the
      // named role from the server, or 2) create a new role with the provided name. For security reasons, this function
      // doesn't return the actual role. Instead, it returns a simplified interface for interacting with the role.
      return function roleFactory(name) {
        // Create a Role instance
        var role = new Role({name: name}),
          deferred = $q.defer(),
          roleFacade = {
            $promise: deferred.promise,
            $resolved: false
          };
//        roleFacade.role = role;

        var onQuerySuccess = function (data) {
          var savedRole;
          if (data.length === 1) {
            savedRole = data[0];
            angular.forEach(savedRole, function (v, k) {
//              console.log(k);
              role[k] = v;
            });
          }
          deferred.resolve();
          roleFacade.$resolved = true;
        };

        var onQueryError = function (err) {
          deferred.reject(err);
          roleFacade.$resolved = true;
        };

        // Check the server for the named role
        (new Query(Role))
          .equalTo('name', name)
          .exec().$promise
          .then(onQuerySuccess, onQueryError);


        // This function will be executed once the preceding query returns. I'm keeping it separate because it handles
        // all the logic for the queryFacade.
        var createFacadeInterface = function () {

          // backburner: Add logic for making sure the object is saved before you try to addRelations
          // backburner: Add logic for making sure the object has an ACL before you try to save it
          // backburner: Add logic for handling errors, particularly auth errors

          // name, className, and getPointer are needed to make the facade Resource-like
          Object.defineProperty(roleFacade, 'name', {
            get: function () {
              return role.name;
            },
            set: function () {}
          });

          Object.defineProperty(roleFacade, 'className', {
            get: function () {
              return role.className;
            },
            set: function () {}
          });

          // getPointer
          roleFacade.getPointer = function () {
            return role.getPointer();
          };

          // $save - this should really only allow you to pass success and error callbacks. And what should be the
          // return value?
          roleFacade.$save = function () {
            var args = [].slice.call(arguments);
            role.$save.apply(role, args);
          };

          // addUsers
          roleFacade.addUsers = function (/* users */) {
            var args = [].slice.call(arguments);
            args.unshift('users');
            role.addRelations.apply(role, args);
          };

          // removeUsers
          roleFacade.removeUsers = function (/* users */) {
            var args = [].slice.call(arguments);
            args.unshift('users');
            role.removeRelations.apply(role, args);
          };

          // addIncludedRoles
          roleFacade.addIncludedRoles = function (/* roles */) {
            var args = [].slice.call(arguments);
            args.unshift('roles');
            role.addRelations.apply(role, args);
          };

          // removeIncludedRoles
          roleFacade.removeIncludedRoles = function (/* roles */) {
            var args = [].slice.call(arguments);
            args.unshift('roles');
            role.removeRelations.apply(role, args);
          };
        };

        // This will be executed in case of a query error. Again, it's separate because it only deals with the
        // queryFacade.
        var processQueryError = function (err) {
          roleFacade.error = err;
        };

        roleFacade.$promise.then(createFacadeInterface, processQueryError);

        // Return the Role instance
        return roleFacade;
      };
    };

    return parseRole;
  });
angular
  .module('angularParseInterface')
  .factory('parseStorage', function ($localStorage, $sessionStorage) {
    'use strict';

    var parseStorage = {};

    parseStorage.localStorage = $localStorage;

    parseStorage.sessionStorage = $sessionStorage;

    return parseStorage;
  });
angular
  .module('angularParseInterface')
  .factory('parseUser', function (parseResourceActions, PARSE_APP_EVENTS) {
    'use strict';

    var parseUser = {};

    var userDecorator = function (User, eventBus, storage) {
      var useRestApi = false,
        moduleName = 'parseUser',
      // Namespaced initialization event. The appInterface will emit this with the appConfig when the
      // MODULE_REGISTERED event is emitted with our moduleName.
        INIT_EVENT = PARSE_APP_EVENTS.MODULE_INIT + '.' + moduleName;

      // Set the className to _User (Parse uses leading underscore names for certain built-in classes)
      User.className = '_User';
      // These should never be sent with PUT requests
      User._addRequestBlacklistProps('emailVerified');

      // Register event handlers
      // This is the handler for the INIT_EVENT
      // Register the handler for the INIT_EVENT
      eventBus.once(INIT_EVENT, function (event, appConfig) {
        // Determine whether we're using the JS API
        useRestApi = appConfig.currentAPI === 'REST';
      });
      // Now that the handler is set up, we can emit the MODULE_REGISTERED event, which will cause the appInterface to
      // emit the INIT_EVENT with the appConfig
      eventBus.emit(PARSE_APP_EVENTS.MODULE_REGISTERED, moduleName);
      // On a USE_REST_API event, set useRestApi to true
      eventBus.on(PARSE_APP_EVENTS.USE_REST_API, function () {
        useRestApi = true;
      });
      // On a USE_JS_API event, set useRestApi to false
      eventBus.on(PARSE_APP_EVENTS.USE_JS_API, function () {
        useRestApi = false;
      });

      // This both creates a user and signs in
      User.signUp = function (username, password, email) {
        // Save, because this is a new user, will delegate to the create method, which will be a POST request
        var user = this.save({
          username: username,
          password: password,
          email: email
        });
        // Once the user has been saved...
        user.$promise.then(function () {
          var data = {
            sessionToken: user.sessionToken
          };
          // Delete the sessionToken from the user
          delete user.sessionToken;
          // Emit a SIGN_IN event with the sessionToken as data. Currently (as of this writing), the coreAppResourceFactory
          // uses this to keep track of the sessionToken, but this prevents us from having to hard-code that. The point
          // is that something else is keeping track of it.
          eventBus.emit(PARSE_APP_EVENTS.SIGN_IN, data);
        });
        // jshint boss:true
        // Cache the user in storage and return it
        return storage.user = user;
        // jshint boss:false
      };

      // This is for signing in (duh)
      User.signIn = function (username, password) {
        // Maybe you should have a way for Resources to send arbitrary requests (e.g. custom actions with capitalized
        // HTTP verb names) in addition to the convenience methods.
        var user;
        if (useRestApi) {
          user = this.get({urlSegment1: 'login', username: username, password: password});
        } else {
          user = this.get({urlSegment1: 'login'}, {username: username, password: password});
        }
        // After we get the user back, we'll basically do exactly what we did in the signUp method.
        user.$promise.then(function () {
          var data = {
            sessionToken: user.sessionToken
          };
          // Delete the sessionToken from the user
          delete user.sessionToken;
          // Emit a SIGN_IN event with the sessionToken as data.
          eventBus.emit(PARSE_APP_EVENTS.SIGN_IN, data);
        });
        // jshint boss:true
        // Cache the user in storage and return it
        return storage.user = user;
        // jshint boss:false
      };

      // Signing out. This is fairly simple, since we don't have to talk to the server at all (Parse never invalidates
      // session tokens). Need to think more about the security implications there.
      User.signOut = function () {
        // Delete the user from the cache
        delete storage.user;
        // Emit a SIGN_OUT event, in case anyone else is interested (hint: they are)
        eventBus.emit(PARSE_APP_EVENTS.SIGN_OUT);
      };

      // This is for retrieving the current user
      User.current = function () {
        // Check the cache
        var user = storage.user,
          Self = this;
        // If there's nothing there...
        if (!user) {
          eventBus.emit(PARSE_APP_EVENTS.SIGN_OUT);
        } else {
          user = new Self(user);
        }
        return user;
      };

      // backburner: Add the ability to link accounts (e.g. Facebook, Twitter)

      User.resetPassword = function (email) {
        return this.POST({urlSegment1: 'requestPasswordReset'}, {email: email});
      };
    };

    parseUser.createUserModel = function (appResourceFactory, appStorage, appEventBus) {
      // This is a slightly ugly url, but I can't think of any names that better capture what's going on here.
      var url = '/:urlSegment1/:urlSegment2',
        // By default, the first segment is the literal string 'users'
        defaultParams = {
          urlSegment1: 'users',
          urlSegment2: '@objectId'
        },
        // Grab custom actions from the library
        customActions = {
          get: parseResourceActions.getActionConfig('get'),
          query: parseResourceActions.getActionConfig('query'),
          save: parseResourceActions.getActionConfig('save'),
          delete: parseResourceActions.getActionConfig('delete'),
          PUT: parseResourceActions.getActionConfig('PUT'),
          POST: parseResourceActions.getActionConfig('POST')
        },
        // Create the User model using our application's resource factory
        User = appResourceFactory(url, defaultParams, customActions),
        moduleStorage = (appStorage.parseUser = appStorage.parseUser || {});

      // Add functionality from above decorator
      userDecorator(User, appEventBus, moduleStorage);

      return User;
    };

    return parseUser;
  });
angular.module('angularParseInterface')
  .factory('parseDataCodecs', function ($log) {
    'use strict';

    // Predicate to check if an object has the keys expected (useful for checking whether it's the expected type)
    var hasExpectedKeys = function (obj/*, expectedKeys */) {
      var expectedKeys, i, len, key;
      expectedKeys = (arguments[1] instanceof Array) ? arguments[1] : [].slice.call(arguments, 1);
      // return false if it's not an object
      if (obj === null || typeof obj !== 'object') {
        return false;
      }
      // return false if it's missing any of the Pointer properties
      for (i = 0, len = expectedKeys.length; i < len; i++) {
        if (!obj.hasOwnProperty(expectedKeys[i])) {
          return false;
        }
      }
      // return false if it has any own properties not associated with Pointers
      for (key in obj) {
        if (obj.hasOwnProperty(key)) {
          if (expectedKeys.indexOf(key) < 0) {
            return false;
          }
        }
      }
      // otherwise return true
      return true;
    };

    // A lookup table for codecs.
    var codecs = {};

    // Bytes
    codecs.Bytes = {};
    // encoder
    codecs.Bytes.createEncoder = function () {
      return function (val) {
        var base64Val;

        // This simplest option here will be to store all of our client-side binary data in base64 format. If we stick
        // to that, this will work as is. If we deviate from it, we'll have to have some ad hoc polymorphism here to
        // deal with it.
        base64Val = val;

        return {
          __type: 'Bytes',
          base64: base64Val
        };
      };
    };
    // decoder
    codecs.Bytes.createDecoder = function () {
      // Predicate to check if the input value is a Bytes object
      var isBytesObject = function (obj) {
        return hasExpectedKeys(obj, ['__type', 'base64']) && obj.__type === 'Bytes';
      };
      // This take a Parse Bytes object and "converts" it into a base64 string (which it does by returning its base64
      // property. We can use other formats client-side, but that conversion should take place elsewhere. Doing it here
      // would require this function to know too much.
      return function (val) {
        // Throw an error if it's not a Bytes object
        if (typeof val !== 'object' || !isBytesObject(val)) {
          throw new Error('Expecting Bytes object but got ' + (angular.isArray(val) ? 'array' : typeof val));
        }
        // Otherwise return the base64-encoded string
        return val.base64;
      };
    };

    // Date
    codecs.Date = {};
    // encoder
    codecs.Date.createEncoder = function () {
      return function (val) {
        var isoString;

        // Not really implementing it yet, but this is a setup for introducing some ad hoc polymorphism to deal with
        // different input types.
        isoString = val.toISOString();

        return {
          __type: 'Date',
          iso: isoString
        };
      };
    };
    // decoder
    codecs.Date.createDecoder = function () {
      // Predicate to check if the input value is a Date object
      var isDateObject = function (obj) {
        return hasExpectedKeys(obj, ['__type', 'iso']) && obj.__type === 'Date';
      };
      // This take a Parse Date object and converts it to a JS Date object. This is really the only reasonable approach.
      // We can use other formats client-side, but that conversion should take place elsewhere. Doing it here would
      // require this function to know too much.
      return function (val) {
        // Throw an error if it's not a Parse Date object
        if (typeof val !== 'object' || !isDateObject(val)) {
          throw new Error('Expecting Parse Date object but got ' + (angular.isArray(val) ? 'array' : typeof val));
        }
        var isoString = val.iso;
        return new Date(isoString);
      };
    };

    // File
    codecs.File = {};
    // encoder
    // decoder

    // GeoPoint
    codecs.GeoPoint = {};
    // encoder
    // decoder

    // Pointer
    codecs.Pointer = {};
    // encoder
    codecs.Pointer.createEncoder = function (params) {
      // Extract the relevant parameter from the params object
      var className = params.className;

      // Don't fail silently
      if (!className) {
        throw new Error('Must provide a className for Pointers');
      }

      // The actual encoder
      return function (val) {
        var objectId;

        // Ad hoc polymorphism to account for two cases: 1) the value is an object ID, or 2) the value is the actual
        // object pointed to by the pointer
        if (angular.isString(val)) {
          objectId = val;
        } else if (angular.isObject(val)) {
          objectId = val.objectId;
          // Throw an error if the className doesn't match (otherwise this will be harder to track down)
//          $log.log(val);
          if (val.className !== className) {
            throw new Error('Object in Pointer field does not match expect class (expected ' + className +
              ' but got ' + val.className + ').');
          }
          // Throw an error if there's no objectId (otherwise this will be harder to track down)
          if (!objectId) {
            throw new Error('No objectId found for object in Pointer field. Try saving it first.');
          }
          $log.warn('Objects in Pointer fields will not be automatically persisted; only their objectIds will be' +
            'saved. If you want to save other data from those objects, you\'ll need to do so separately.');
        }

        // In any case, the encoder returns a pointer object
        return {
          __type: 'Pointer',
          className: className,
          objectId: objectId
        };
      };
    };
    // decoder
    codecs.Pointer.createDecoder = function (params) {
      var className = params.className;
      // Predicate to check if the input value is a Pointer object
      var isPointerObject = function (obj) {
        return hasExpectedKeys(obj, ['__type', 'className', 'objectId']) && obj.__type === 'Pointer';
      };

      // Throw error if there's no className
      if (!className) {
        throw new Error('Must provide a className for Pointers');
      }

      return function (val) {
        // In general, we should be liberal with decoders. However, if you're expecting a pointer (or a Parse object),
        // and you get some other arbitrary data type from the server, if we just return that value, I feel like it will
        // be harder to diagnose what went wrong. By using the Pointer decoder, you're saying, "I know I should be
        // getting a Pointer." If you don't know what type of data to expect, you should use one of the pass-through
        // decoders, which will give you everything we got from the server.
        if (!isPointerObject(val)) {
          throw new Error('Expecting Pointer object but got ' + (angular.isArray(val) ? 'array' : typeof val));
        }
        // If it's a Pointer, return the objectId as a string (NB: if you want the original Pointer object, you should
        // use the decoder for the Object type).
        return val.objectId;
      };
    };

    // Relation
    codecs.Relation = {};
    // encoder
    codecs.Relation.createEncoder = function (params) {

      // Extract the relevant parameter from the params object
      var className = params.className;

      // Don't fail silently
      if (!className) {
        throw new Error('Must provide a className for Relations');
      }

      // This is really the only format Parse will accept for relations. Since we already know the className from the
      // parameters, it doesn't matter how we store other information on the client.
      return function () {
        return {
          __type: 'Relation',
          className: className
        };
      };
    };
    // decoder
    codecs.Relation.createDecoder = function (params) {
      // Extract the relevant parameter from the params object
      var className = params.className;
      // Predicate to check if the input value is a Relation object
      var isRelationObject = function (obj) {
        return hasExpectedKeys(obj, ['__type', 'className']) && obj.__type === 'Relation';
      };

      // Throw error if there's no className
      if (!className) {
        throw new Error('Must provide a className for Relations');
      }

      return function (val) {
        if (!isRelationObject(val)) {
          throw new Error('Expecting Relation object but got ' + (angular.isArray(val) ? 'array' : typeof val));
        }
        if (val.className !== className) {
          throw new Error('Expecting Relation with className of ' + className + ' but got one with className of ' + val.className);
        }
        return val;
      };
    };

    // An identity function for when lookup fails.
    var identityFactory = function () {
      return function (val) {
        return val;
      };
    };

    // The service object we'll be returning
    var parseDataCodecs = {};

    // Look up an encoder
    parseDataCodecs.getEncoderForType = function (dataType, params) {
      var codecsForType = codecs[dataType] || {},
        encoderFactory = codecsForType.createEncoder || identityFactory;
      // Encoders can be parameterized, which is why we work with encoder factories instead of actual encoders.
      return encoderFactory(params);
    };

    parseDataCodecs.getDecoderForType = function (dataType, params) {
      var codecsForType = codecs[dataType] || {},
        decoderFactory = codecsForType.createDecoder || identityFactory;
      // Decoders can be parameterized, which is why we work with decoder factories instead of actual decoders.
      return decoderFactory(params);
    };

    return parseDataCodecs;
  });
angular.module('angularParseInterface')
  .factory('parseDataEncoding', function (parseDataCodecs) {
    'use strict';

    var capitalize = function (str) {
      return str[0].toUpperCase() + str.slice(1);
    };

    // Predicate to check if an object has the keys expected (useful for checking whether it's the expected type)
    var hasExpectedKeys = function (obj/*, expectedKeys */) {
      var expectedKeys, i, len, key;
      expectedKeys = (arguments[1] instanceof Array) ? arguments[1] : [].slice.call(arguments, 1);
      // return false if it's not an object
      if (obj === null || typeof obj !== 'object') {
        return false;
      }
      // return false if it's missing any of the expected properties
      for (i = 0, len = expectedKeys.length; i < len; i++) {
        if (!obj.hasOwnProperty(expectedKeys[i])) {
          return false;
        }
      }
      // return false if it has any own properties that aren't in the list
      for (key in obj) {
        if (obj.hasOwnProperty(key)) {
          if (expectedKeys.indexOf(key) < 0) {
            return false;
          }
        }
      }
      // otherwise return true
      return true;
    };

    // Predicate to check if the input value is a Date object
    var isDateObject = function (obj) {
      return hasExpectedKeys(obj, ['__type', 'iso']) && obj.__type === 'Date';
    };

    var parseDataEncoding = {};

    // backburner: Move the codecs into this module
    parseDataEncoding.getTransformFunctions = function () {
      var Resource;

      // Get the registered className for a field if it exists (it's up to Resource to return undefined if it doesn't).
      var getClassName = function (fieldName) {
        return Resource._getFieldClassName(fieldName);
      };

      var getRequestDataType = function (fieldName, val) {
        // The canonical source is the dataType registered with the Resource
        var dataType = Resource._getFieldDataType(fieldName) ||
          // If that's not available, check to see if it's an array
          (angular.isArray(val) && 'Array') ||
          // See if it's a Date object (these can be decoded and re-encoded without any additional metadata, so it's
          // okay to detect them automatically.
          (val instanceof Date && 'Date') ||
          // Check to see if it's null (it's possible but unlikely that I'll ever need to do anything with this).
          (val === null && 'Null') ||
          // Failing all of that, just get the value from typeof.
          typeof val;
        return capitalize(dataType);
      };

      // Decode a single field using its fieldName and value.
      var encodeField = function (fieldName, val) {
        var dataType, params, encoder;
        // Don't encode operation requests
        if (angular.isObject(val) && val.__op) {
          return val;
        }
        dataType = getRequestDataType(fieldName, val);
        params = {
          className: getClassName(fieldName)
        };
        encoder = parseDataCodecs.getEncoderForType(dataType, params);
//        console.log(val);
        return encoder(val);
      };

      // Encode an entire object by iterating over all of its own properties
      var encodeData = function (data) {
        var key, encodedData;
        encodedData = {};
        for (key in data) {
          if (data.hasOwnProperty(key) && (typeof data[key] !== 'function')) {
            encodedData[key] = encodeField(key, data[key]);
            // You can implement this when you write a test for it:
//            try {
//              encodedData[key] = encodeField(key, data[key]);
//            } catch (e) {
//              throw new Error('Got error when attempting to encode "' + key + '" field: "' + e.message + '"');
//            }
          }
        }
//        console.log(data);
//        console.log(encodedData);
        return encodedData;
      };

      // Get the dataType for a single field
      var getResponseDataType = function (fieldName, val) {
        // The canonical source is the dataType registered with the Resource
        var dataType = Resource._getFieldDataType(fieldName) ||
          // If that's not available, check to see if it's an array
          (angular.isArray(val) && 'Array') ||
          // See if it's a Parse Date object (these can be decoded and re-encoded without any additional metadata, so
          // it's okay to detect them automatically.
          (isDateObject(val) && 'Date') ||
          // Check to see if it's null (it's possible but unlikely that I'll ever need to do anything with this).
          (val === null && 'Null') ||
          // Failing all of that, just get the value from typeof.
          typeof val;
        // By convention, Parse uses capitalized names for dataTypes.
        return capitalize(dataType);
      };

      // Decode a single field using its fieldName and value.
      var decodeField = function (fieldName, val) {
        var dataType, params, decoder;
        dataType = getResponseDataType(fieldName, val);
        params = {
          className: getClassName(fieldName)
        };
        decoder = parseDataCodecs.getDecoderForType(dataType, params);
        return decoder(val);
      };

      // Decode an entire object by iterating over all of its own properties
      var decodeData = function (data) {
        var key, decodedData;
        decodedData = {};
        for (key in data) {
          if (data.hasOwnProperty(key) && (typeof data[key] !== 'function')) {
            decodedData[key] = decodeField(key, data[key]);
//            try {
//              decodedData[key] = decodeField(key, data[key]);
//            } catch (e) {
//              throw new Error('Got error when attempting to encode "' + key + '" field: "' + e.message + '"');
//            }
          }
        }
        return decodedData;
      };

      return {
        transformRequest: function (data /*, headersGetter*/) {
//        var encodedData;
//
//        // If the data to decode is an array, we apply the decoder to each element.
//        if (angular.isArray(data)) {
//          encodedData = [];
//          angular.forEach(data, function (val) {
//            encodedData.push(encodeData(val));
//          });
//        } else {
//          // Otherwise, we apply the decoder directly to the data object.
//          encodedData = encodeData(data);
//        }
          return encodeData(data);
        },
        transformResponse: function (data /*, headersGetter*/) {
          var decodedData;

          // If the data to decode is an array, we apply the decoder to each element.
          if (angular.isArray(data)) {
            decodedData = [];
            angular.forEach(data, function (val) {
              decodedData.push(decodeData(val));
            });
          } else {
            // Otherwise, we apply the decoder directly to the data object.
            decodedData = decodeData(data);
          }
          return decodedData;
        },
        setResource: function (ParseResource) {
          Resource = ParseResource;
        }
      };
    };
    return parseDataEncoding;
  });
angular.module('angularParseInterface')
  .factory('parseJSAuth', function (PARSE_APP_EVENTS) {
    'use strict';

    // The service has only one method, getTransformRequest. It returns a transformRequest function that will add the
    // correct headers to the request but will not otherwise modify the headers or data
    var parseJSAuth = {};

    parseJSAuth.getTransformRequest = function (appEventBus, appStorage) {
      var APPLICATION_ID,
        INSTALLATION_ID,
        CLIENT_VERSION,
        JS_KEY,
      // Whether we're using the REST API
        useJsApi = false,
        moduleName = 'parseJSAuth',
      // Namespaced initialization event. The appInterface will emit this with the appConfig when the
      // MODULE_REGISTERED event is emitted with our moduleName.
        INIT_EVENT = PARSE_APP_EVENTS.MODULE_INIT + '.' + moduleName,
      // Create module-specific namespace for storage
        modStorage = appStorage[moduleName] = (appStorage[moduleName] || {});

      // Register event handlers
      // This is the handler for the INIT_EVENT
      // Register the handler for the INIT_EVENT
      appEventBus.once(INIT_EVENT, function (event, appConfig) {
        // Get the APPLICATION_ID
        APPLICATION_ID = appConfig.APPLICATION_ID;
        // Get the JS_KEY
        JS_KEY = appConfig.JS_KEY;
        // Installation ID set in parseInterface.js
        INSTALLATION_ID = appConfig.INSTALLATION_ID;
        // Version string set in parseInterface.js
        CLIENT_VERSION = appConfig.CLIENT_VERSION;
        // Determine whether we're using the JS API
        useJsApi = appConfig.currentAPI === 'JS';
      });
      // Now that the handler is set up, we can emit the MODULE_REGISTERED event, which will cause the appInterface to
      // emit the INIT_EVENT with the appConfig
      appEventBus.emit(PARSE_APP_EVENTS.MODULE_REGISTERED, moduleName);
      // On a SIGN_IN event, cache the sessionToken
      appEventBus.on(PARSE_APP_EVENTS.SIGN_IN, function (e, data) {
        modStorage.sessionToken = data.sessionToken;
      });
      // On a SIGN_OUT event, delete the sessionToken from the cache
      appEventBus.on(PARSE_APP_EVENTS.SIGN_OUT, function (/*e, data*/) {
        delete modStorage.sessionToken;
      });
      // On a USE_REST_API event, set useJsApi to false
      appEventBus.on(PARSE_APP_EVENTS.USE_REST_API, function () {
        useJsApi = false;
      });
      // On a USE_JS_API event, set useJsApi to true
      appEventBus.on(PARSE_APP_EVENTS.USE_JS_API, function () {
        useJsApi = true;
      });

      // The transformRequest function
      return function (data, headersGetter) {
        // Get the current value of the session token
        var headers = headersGetter(),
          sessionToken = modStorage.sessionToken;
        // Only add auth keys if we're using the JS API
        if (useJsApi) {
          // Set the application ID and JS key values
          data._ApplicationId = APPLICATION_ID;
          data._JavaScriptKey = JS_KEY;
          data._InstallationId = INSTALLATION_ID;
          data._ClientVersion = CLIENT_VERSION;

          // If the session token has a reasonably existy value, set the _SessionToken key
          if (sessionToken && sessionToken.length) {
            data._SessionToken = sessionToken;
          }

          // Set the Content-Type to text/plain to prevent a preflight
          headers['Content-Type'] = 'text/plain';
        }
        // Return the data unmodified
        return data;
      };
    };

    return parseJSAuth;
  });
angular.module('angularParseInterface')
  .factory('parseRESTAuth', function (PARSE_APP_EVENTS) {
    'use strict';

    // The service has only one method, getTransformRequest. It returns a transformRequest function that will add the
    // correct headers to the request but will not otherwise modify the headers or data
    var parseRESTAuth = {};

    parseRESTAuth.getTransformRequest = function (appEventBus, appStorage) {
      var APPLICATION_ID,
        REST_KEY,
        // Whether we're using the REST API
        useRestApi = false,
        moduleName = 'parseRESTAuth',
        // Namespaced initialization event. The appInterface will emit this with the appConfig when the
        // MODULE_REGISTERED event is emitted with our moduleName.
        INIT_EVENT = PARSE_APP_EVENTS.MODULE_INIT + '.' + moduleName,
        // Create module-specific namespace for storage
        modStorage = appStorage[moduleName] = (appStorage[moduleName] || {});


      // Register event handlers
      // Register a one-time handler for the INIT_EVENT
      appEventBus.once(INIT_EVENT, function (event, appConfig) {
        // Get the APPLICATION_ID
        APPLICATION_ID = appConfig.APPLICATION_ID;
        // Get the REST_KEY
        REST_KEY = appConfig.REST_KEY;
        // Determine whether we're using the REST API
        useRestApi = appConfig.currentAPI === 'REST';
      });
      // Now that the handler is set up, we can emit the MODULE_REGISTERED event, which will cause the appInterface to
      // emit the INIT_EVENT with the appConfig
      appEventBus.emit(PARSE_APP_EVENTS.MODULE_REGISTERED, moduleName);
      // On a SIGN_IN event, cache the sessionToken
      appEventBus.on(PARSE_APP_EVENTS.SIGN_IN, function (e, data) {
        modStorage.sessionToken = data.sessionToken;
      });
      // On a SIGN_OUT event, delete the sessionToken from the cache
      appEventBus.on(PARSE_APP_EVENTS.SIGN_OUT, function (/*e, data*/) {
        delete modStorage.sessionToken;
      });
      // On a USE_REST_API event, set useRestApi to true
      appEventBus.on(PARSE_APP_EVENTS.USE_REST_API, function () {
        useRestApi = true;
      });
      // On a USE_JS_API event, set useRestApi to false
      appEventBus.on(PARSE_APP_EVENTS.USE_JS_API, function () {
        useRestApi = false;
      });

      // The transformRequest function
      return function (data, headersGetter) {
        var headers = headersGetter(),
          // Get the current value of the session token
          sessionToken = modStorage.sessionToken;

        // Only add the headers if we're using the REST API
        if (useRestApi) {
          // Set the application ID and REST key headers
          headers['X-Parse-Application-Id'] = APPLICATION_ID;
          headers['X-Parse-REST-API-Key'] = REST_KEY;

          // If the session token has a reasonably existy value, set the session token header
          if (sessionToken && sessionToken.length) {
            headers['X-Parse-Session-Token'] = sessionToken;
          }
        }
        // Return the data unmodified
        return data;
      };
    };

    return parseRESTAuth;
  });
angular.module('angularParseInterface')
  .factory('parseResource', function ($resource, PARSE_APP_EVENTS, parseRESTAuth, parseJSAuth, parseDataEncoding, parseResourceDecorator) {
    'use strict';

    var parseResource = {};

    //   The purpose of this function is to modify the $resource service so that it adds appropriate headers and
    // encodes/decodes data in the correct format for Parse.
    parseResource.createAppResourceFactory = function (appEventBus, appStorage) {
      var coreAppResourceFactory = this._createCoreAppResourceFactory(appEventBus, appStorage),
        createApiSpecificConfigs = this._createApiSpecificConfigs.bind(this),
        generateBaseActions = this._generateBaseActions,
        configureActions = this._configureActions.bind(this),
        apiNames = ['REST', 'JS'],
        moduleState = {},
        moduleName = 'parseResource',
      // Namespaced initialization event. The appInterface will emit this with the appConfig when the
      // MODULE_REGISTERED event is emitted with our moduleName.
        INIT_EVENT = PARSE_APP_EVENTS.MODULE_INIT + '.' + moduleName;

      // Register event handlers
      // Register the handler for the INIT_EVENT
      appEventBus.once(INIT_EVENT, function (event, appConfig) {
        // Determine which API we're using
        moduleState.currentAPI = appConfig.currentAPI;
      });
      // Now that the handler is set up, we can emit the MODULE_REGISTERED event, which will cause the appInterface to
      // emit the INIT_EVENT with the appConfig
      appEventBus.emit(PARSE_APP_EVENTS.MODULE_REGISTERED, moduleName);
      // On a USE_REST_API event, set useRestApi to true
      appEventBus.on(PARSE_APP_EVENTS.USE_REST_API, function () {
        moduleState.currentAPI = 'REST';
      });
      // On a USE_JS_API event, set useRestApi to false
      appEventBus.on(PARSE_APP_EVENTS.USE_JS_API, function () {
        moduleState.currentAPI = 'JS';
      });

      // Okay for now. What do you want this to do ultimately? You probably don't want to leave customActions in its
      // current state. For example, you probably want objects to have certain actions but not others.
      return function appResourceFactory(url, defaultParams, actions) {
        var Resource,
          baseActions;

        actions = createApiSpecificConfigs(actions, apiNames);

        baseActions = generateBaseActions(actions);

        // Create the Resource
        Resource = coreAppResourceFactory(url, defaultParams, baseActions);

        configureActions(Resource, actions, moduleState);

        // Apply the decorator
        parseResourceDecorator(Resource);

        return Resource;
      };
    };

    parseResource._getPseudoMethodTransform = function (method) {
      return function (data/*, headersGetter */) {
        data = data || {};
        data._method = method;
        return data;
      };
    };

    // This should generate a set of namespaced actions
    parseResource._namespaceBaseActions = function (action, nameSpace) {
      var namespacedAction = angular.copy(action);
      namespacedAction.nameSpace = nameSpace;
      angular.forEach(action.baseActions, function (baseAction, baseActionName) {
        var newBaseActionName = nameSpace + baseActionName;
        delete namespacedAction.baseActions[baseActionName];
        namespacedAction.baseActions[newBaseActionName] = angular.copy(baseAction);
      });
      return namespacedAction;
    };

    // Generates a REST API-specific version of an action
    parseResource._generateRESTActionConfig = function (action, nameSpace) {
      var namespaceBaseActions = this._namespaceBaseActions;
      return namespaceBaseActions(action, nameSpace);
    };

    // Generates a JS API-specific version of an action
    parseResource._generateJSActionConfig = function (action, nameSpace) {
      var namespaceBaseActions = this._namespaceBaseActions,
        getPseudoMethodTransform = this._getPseudoMethodTransform,
        jsAction = namespaceBaseActions(action, nameSpace);
      angular.forEach(jsAction.baseActions, function (subAction/*, subActionName*/) {
        if (subAction.method !== 'POST') {
          var addPseudoMethod = getPseudoMethodTransform(subAction.method);
          subAction.method = 'POST';
          subAction.transformRequest = subAction.transformRequest || [];
          // Add the addPseudoMethod function to the transformRequest array
          subAction.transformRequest.push(addPseudoMethod);
        }
      });
      return jsAction;
    };

    // Delegates to API-specific methods for generating API-specific actions from actions
    parseResource._generateAPIActionConfig = function (action, API) {
      var generateRESTActionConfig = this._generateRESTActionConfig.bind(this),
        generateJSActionConfig = this._generateJSActionConfig.bind(this),
        generateAPIActionFx;
      if (API === 'REST') {
        generateAPIActionFx = generateRESTActionConfig;
      } else if (API === 'JS') {
        generateAPIActionFx = generateJSActionConfig;
      }
      return generateAPIActionFx(action, API);
    };

    parseResource._createApiSpecificConfigs = function (actions, apiNames) {
      var newActions = {},
        self = this;
      // Configure actions for each API and generate baseActions that will be fed into coreAppResourceFactory
      angular.forEach(actions, function (action, actionName) {
        var origAction = angular.copy(action);
        action.apiActions = {};
        angular.forEach(apiNames, function (apiName) {
          action.apiActions[apiName] = self._generateAPIActionConfig(origAction, apiName);
        });
        newActions[actionName] = action;
      });
      return newActions;
    };

    parseResource._generateBaseActions = function (actions) {
      var baseActions = {};
      angular.forEach(actions, function (action) {
        angular.forEach(action.apiActions, function (apiActionConfig) {
          angular.extend(baseActions, apiActionConfig.baseActions);
        });
      });
      return baseActions;
    };

    // This creates the core app resource. It's concerned with encoding/decoding of data and the addition of the
    // appropriate headers. A separate function deals with actions.
    // I'm not crazy about exposing this on the service when it's actually only used within this file, but it does make
    // it very testable. Also, I briefly toyed with combining this function with createAppResourceFactory, but it was an
    // inscrutable mess.
    parseResource._createCoreAppResourceFactory = function (appEventBus, appStorage) {

      var hasRequestBody = function (action) {
        // For Parse, these are currently the only methods for which a request body has any meaning
        var requestBodyMethods = ['POST', 'PUT'];
        return requestBodyMethods.indexOf(action.method) >= 0;
      };

      var stringifyData = function (data) {
        if (!angular.isString(data)) {
          data = angular.toJson(data);
        }
        return data;
      };

      var parseJSON = function (data) {
        if (angular.isString(data)) {
          data = angular.fromJson(data);
        }
        return data;
      };

      var addRESTAuth = parseRESTAuth.getTransformRequest(appEventBus, appStorage);

      var addJSAuth = parseJSAuth.getTransformRequest(appEventBus, appStorage);

      return function coreAppResourceFactory(url, defaultParams, actions) {
        var restApiBaseUrl = 'https://api.parse.com/1',
          Resource;

        var prependBaseUrl = function (url) {
          return restApiBaseUrl.replace(/\/+$/, '') + '/' + url.replace(/^\/+/, '');
        };

        var dataEncodingFunctions = parseDataEncoding.getTransformFunctions();

        var addTransformRequestFxs = function (action) {
          var transformReqArray;
          // If the action already has a transformRequest property, one of two things is true...
          if (action.transformRequest) {
            // ... either it's a function, and we need to put it in an array...
            if (angular.isFunction(action.transformRequest)) {
              action.transformRequest = [action.transformRequest];
            }
            // ... or it's already an array and we don't have to do anything with it.
          } else {
            // If it doesn't have a transformRequest property, we give it one and set it to an empty array
            action.transformRequest = [];
          }
          // In any case, I'm giving it a shorter name
          transformReqArray = action.transformRequest;
          // Check to see if we need to modify the data (only if the action has a request body)
          if (hasRequestBody(action)) {
            // If there's anything in the array, it might jsonify the data.
            if (transformReqArray.length) {
              // This does a conditional transformation (only parses if the data is already a string).
              transformReqArray.push(parseJSON);
            }
            // This is for the actual data encoding
            transformReqArray.push(dataEncodingFunctions.transformRequest);
          }
          // Every request will add the auth transforms
          transformReqArray.push(addRESTAuth);
          transformReqArray.push(addJSAuth);
          if (hasRequestBody(action)) {
            // Lastly, this is for stringifying the data. Again, it's done conditionally.
            transformReqArray.push(stringifyData);
          }
        };

        var addTransformResponseFxs = function (action) {
          var transformResArray;
          // If the action already has a transformResponse property, one of two things is true...
          if (action.transformResponse) {
            // ... either it's a function, and we need to put it in an array...
            if (angular.isFunction(action.transformResponse)) {
              action.transformResponse = [action.transformResponse];
            }
            // ... or it's already an array and we don't have to do anything with it.
          } else {
            // If it doesn't have a transformResponse property, we give it one and set it to an empty array
            action.transformResponse = [];
          }
          // In any case, I'm giving it a shorter name
          transformResArray = action.transformResponse;
          //   In contrast to encoding, decoding has to happen for every action, so we'll be responsible for the whole
          // process. Another, more important contrast with encoding is that we'll want any transformations that were
          // part of the custom action to be processed *last*. The reason for that is that consumers of this service
          // will expect the data to be in its decoded form already. Unfortunately, this means we can't make our
          // transformations fool-proof; since consumers will get at the data after we do, they'll either need to
          // expect that it's JSONified or parsed, but not either/or. I'm going with parsed, because converting the
          // data back to JSON seems stupid.
          //   Since we're adding our transformRequest functions to the front of the queue, we'll need to work in
          // reverse. The last step before we hand off the data is to decode it:
          transformResArray.unshift(dataEncodingFunctions.transformResponse);
          // The "first" step (the final step in this function) is parsing the JSON
          transformResArray.unshift(parseJSON);
        };

        url = prependBaseUrl(url);
        defaultParams = defaultParams || {};
        // In theory, this should be an error, but I'm going to leave it as is for now
        actions = actions || {};

        angular.forEach(actions, function (action) {
          addTransformRequestFxs(action);
          addTransformResponseFxs(action);
        });

        // Create the Resource
        Resource = $resource(url, defaultParams, actions);

        // Funny story. I forgot how closures work when I first wrote these. Now I'm backtracking, and the result is a
        // really clunky API.
        dataEncodingFunctions.setResource(Resource);
        // And then I decided to make a thing out of it. This will let you define custom actions from outside of this
        // function, even if they require a reference to the Resource.
        angular.forEach(actions, function (action) {
          if (action.setResource) {
            action.setResource(Resource);
          }
        });

        // Return the Resource
        return Resource;
      };
    };

    // This removes the namespacing from the baseActions. This is done so that the decorators, which aren't written
    // with any assumptions about namespacing, will still work (otherwise they couldn't find the properties they
    // reference).
    parseResource._deNamespaceBaseActions = function (Resource, action) {
      var nameSpace = action.nameSpace;
      angular.forEach(action.baseActions, function (baseAction, namespacedActionName) {
        var namespacedStaticName = namespacedActionName,
          baseStaticName = namespacedActionName.slice(nameSpace.length),
          namespacedInstanceName = nameSpace + '$' + baseStaticName,
          baseInstanceName = '$' + baseStaticName,
          staticAction = Resource[namespacedStaticName],
          instanceAction = Resource.prototype[namespacedInstanceName];
        delete Resource[namespacedStaticName];
        delete Resource.prototype[namespacedInstanceName];
        Resource[baseStaticName] = staticAction;
        if (instanceAction) {
          Resource.prototype[baseInstanceName] = instanceAction;
        }
      });
    };

    // This deletes the action from Resource and its prototype and returns the static action
    parseResource._deleteAndReturnAction = function (Resource, actionName) {
      var instanceActionName = '$' + actionName,
        staticAction = Resource[actionName];
      delete Resource[actionName];
      delete Resource.prototype[instanceActionName];
      return staticAction;
    };

    // This loops through each action for both APIs and creates API-specific versions of that action. It then
    // creates a non-namespaced version of the action that delegates to the correct API-specific version based on
    // which API we're using. At the end of this, all the namespaced properties should be deleted from both Resource
    // and its prototype.
    parseResource._createApiSpecificActions = function (Resource, actions) {
      var apiActions = {},
        self = this;
      // Loop through each action
      angular.forEach(actions, function (action, actionName) {
        apiActions[actionName] = {};
        // Loop through each API
        angular.forEach(action.apiActions, function (thisApiAction, apiName) {
          // This removes the namespacing of API-specific actions (e.g. RESTsave -> save)
          self._deNamespaceBaseActions(Resource, thisApiAction);
          // Apply the decorator if it exists. Assuming the action is configured correctly, it should only leave a
          // single static action and, optionally, a single instance action. This is the API-specific version of the
          // action.
          if (angular.isFunction(thisApiAction.decorator)) {
            thisApiAction.decorator(Resource);
          }
          // Check here whether the action has an instance action
          action.hasInstanceAction = angular.isFunction(Resource.prototype['$' + actionName]);
          // Delete the API-specific action from the Resource and store it in our data structure
          apiActions[actionName][apiName] = self._deleteAndReturnAction(Resource, actionName);
        });
      });
      return apiActions;
    };

    // This loops through each of Resource's properties and tries to identify actions (based on whether there's a
    // $-prefixed version of the property on Resource.prototype. If it finds any that aren't in the actions object, it
    // deletes them from Resource and Resource.prototype.
    parseResource._destroyUndefinedActions = function (Resource, actions) {
      var isAction = function (name) {
        return Resource.hasOwnProperty(name) && Resource.prototype.hasOwnProperty('$' + name);
      };
      angular.forEach(Resource, function (v, k) {
        if (isAction(k) && !actions[k]) {
          delete Resource[k];
          delete Resource.prototype['$' + k];
        }
      });
    };

    // Creates the named action on the prototype. This is copied with minimal modifications from
    // angular-resource.js.
    parseResource._createInstanceAction = function (Resource, actionName) {
      Resource.prototype['$' + actionName] = function (params, success, error) {
        if (angular.isFunction(params)) {
          error = success;
          success = params;
          params = {};
        }
        var result = Resource[actionName].call(this, params, this, success, error);
        return result.$promise || result;
      };
    };

    parseResource._resetPrototype = function (Resource, actions) {
      var self = this;
      // You should detect above whether a given action has an associated instance action
      // Just to be safe, let's reset the prototype...
      Resource.prototype = {};
      // ... and add the instance actions back in
      angular.forEach(actions, function (action, actionName) {
        if (action.hasInstanceAction) {
          self._createInstanceAction(Resource, actionName);
        }
      });
    };

    parseResource._configureActions = function (Resource, actions, moduleState) {
      var apiActions = this._createApiSpecificActions(Resource, actions);

      angular.forEach(apiActions, function (apiAction, actionName) {
        Resource[actionName] = function () {
          return apiAction[moduleState.currentAPI].apply(this, arguments);
        };
      });
      // Now it's time for some cleanup. This loops through each of Resource's properties and tries to identify
      // actions (based on whether there's a $-prefixed version of the property on Resource.prototype. If it finds any
      // that aren't in the actions object, it deletes them from Resource and Resource.prototype.
      this._destroyUndefinedActions(Resource, actions);
      this._resetPrototype(Resource, actions);
    };

    return parseResource;
  });
angular.module('angularParseInterface')
  .factory('parseResourceActions', function () {
    'use strict';

    // The point of this module is to serve as a library of actions for the parseResource service. Actions are tricky
    // to write, so this is definitely an area where you want the code to be reusable. Rather than relying inheritance,
    // these function like mixins.
    var actionLib = {};

    // Find the first item in an array for which the predicate is true
    var find = function (ar, pred) {
      for (var i = 0, len = ar.length; i < len; i++) {
        if (pred(ar[i])) {
          return ar[i];
        }
      }
    };

    // Find the last item in an array for which the predicate is true
    var findLast = function (ar, pred) {
      for (var i = ar.length - 1; i >= 0; i--) {
        if (pred(ar[i])) {
          return ar[i];
        }
      }
    };

    // Replacement for _.defaults.
    var setDefaults = function (dst, src) {
      angular.forEach(src, function (val, key) {
        dst[key] = dst[key] || src[key];
      });
      return dst;
    };

    // Return an object with the non-method own properties of an object
    var ownDataProps = function (obj) {
      var objData = {};
      angular.forEach(obj, function (val, key) {
        if (!angular.isFunction(val)) {
          objData[key] = val;
        }
      });
      return objData;
    };

    actionLib.get = {
      baseActions: {
//        get: (function () {
//          var Resource;
//
//          return {
//            method: 'GET',
//            transformResponse: function (data) {
//              return new Resource(data);
//            },
//            setResource: function (R) {
//              Resource = R;
//            }
//          };
//        }())
        // Try it this way first
        get: {
          method: 'GET'
        }
      }
    };

    // Could do a GET action here analogous to POST and PUT below, but I don't know where I would use it, and I don't
    // want to write extra tests right now. But this is a pin in it.

    actionLib.delete = {
      baseActions: {
        delete: {
          method: 'DELETE'
        }
      }
    };

    // A POST action for posting arbitrary data to the server
    actionLib.POST = {
      baseActions: {
        POST: {
          method: 'POST'
        }
      },
      decorator: function (Resource) {
        // The prototype doesn't need to have this.
        delete Resource.prototype.$POST;

        // Create a modified POST static method
        Resource.POST = (function () {
          // The original POST method
          var POST = Resource.POST;

          // Since we're not interested in a Resource for arbitrary POST data, this function returns a non-Resource
          // object.
          return function () {
            // Delegate to the original POST method. This returns an instance of Resource.
            var instance = POST.apply(this, arguments),
              // This is the POJO we'll actually be returning.
              res = {
                $promise: instance.$promise,
                $resolved: instance.$resolved
              };
            // NB: Both of the handlers leave the $promise object on the POJO.
            // This copies all the own properties from the response data (which is an instance of Resource) to the POJO
            var onSuccess = function (data) {
              // "Data" is actually just the instance again.
              angular.forEach(data, function (v, k) {
                // This *should* be the same promise object, but just in case...
                if (k === '$promise') {
                  return;
                }
                // Otherwise, copy the property to the result
                res[k] = v;
              });
            };
            // This copies some useful information about the error to the POJO.
            var onError = function (err) {
              res.data = err.data;
              res.status = err.status;
              res.headersGetter = err.headers;
              res.config = err.config;
              res.statusText = err.statusText;
              res.$resolved = true;
            };
            instance.$promise.then(onSuccess, onError);
            // Return the POJO
            return res;
            // POJO!
          };
        }());
      }
    };

    actionLib.PUT = {
      baseActions: {
        PUT: {
          method: 'PUT'
        }
      },
      decorator: function (Resource) {

        // For the instance method, we just want to delegate to the static method but with an objectId parameter set to
        // the instance's objectId (possibly other params in the future).
        Resource.prototype.$PUT = function (data, successFunc, errorFunc) {
          var params = {
            objectId: this.objectId
          };
          return Resource.PUT(params, data, successFunc, errorFunc);
        };

        // Create a modified PUT static method
        Resource.PUT = (function () {
          // The original PUT method
          var PUT = Resource.PUT;

          // Since we're not interested in a Resource for arbitrary PUT data, this function returns a non-Resource
          // object.
          return function () {
            // Delegate to the original PUT method. This returns an instance of Resource.
            var instance = PUT.apply(this, arguments),
            // This is the POJO we'll actually be returning.
              res = {
                $promise: instance.$promise,
                $resolved: instance.$resolved
              };
            // NB: Both of the handlers leave the $promise object on the POJO.
            // This copies all the own properties from the response data (which is an instance of Resource) to the POJO
            var onSuccess = function (data) {
              // "Data" is actually just the instance again.
              angular.forEach(data, function (v, k) {
                // This *should* be the same promise object, but just in case...
                if (k === '$promise') {
                  return;
                }
                // Otherwise, copy the property to the result
                res[k] = v;
              });
            };
            // This copies some useful information about the error to the POJO.
            var onError = function (err) {
              res.data = err.data;
              res.status = err.status;
              res.headersGetter = err.headers;
              res.config = err.config;
              res.statusText = err.statusText;
              res.$resolved = true;
            };
            instance.$promise.then(onSuccess, onError);
            // Return the POJO
            return res;
          };
        }());

      }
    };

    actionLib.query = {
      baseActions: {
        query: (function () {
          var Resource;

          return {
            method: 'GET',
            isArray: true,
            transformResponse: function (data) {
              var results = data.results;
              if (!results) {
                return [];
              }
              return angular.forEach(results, function (item, idx, col) {
                col[idx] = new Resource(item);
              });
            },
            setResource: function (R) {
              Resource = R;
            }
          };
        }()),
        count: {
          method: 'GET',
          isArray: false,
          transformResponse: function (data) {
//            var count = angular.fromJson(data).count;
            return {count: data.count};
          }
        }
      },
      decorator: function (Resource) {
        Resource.query = (function () {
          var query = Resource.query,
            count = Resource.count;

          delete Resource.count;
          delete Resource.prototype.$count;
          delete Resource.prototype.$query;

          return function () {
            var queryParams,
              isCountQuery,
              queryFx,
              args = [].slice.call(arguments);

            // Get the query parameters or an empty object
            queryParams = angular.isObject(args[0]) ? args[0] : {};
            // Determine whether this is a count query based on whether the count parameter is set
            isCountQuery = angular.equals(queryParams.count, 1);
            // If it's a count query, use the count action; otherwise, use the query action
            queryFx = isCountQuery ? count : query;
            // Delegate to the appropriate function...
            return queryFx.apply(this, args);
          };
        }());
      }
    };

    // ngResource uses save to persist data, which is nice and clean. Unfortunately, Parse.com uses POSTs for object
    // creation and PUT for updates (even though it lets you make partial updates, where PATCH would be more
    // appropriate). Anyway, this action does the hard work of making those two interfaces work together. The save
    // action this creates can be used just like the ngResource save action.
    actionLib.save = {
      baseActions: {
        save: {
          method: 'POST'
        },
        create: {
          method: 'POST'
        },
        update: {
          method: 'PUT'
        }
      },
      decorator: function (Resource) {

        // No changes to the instance method

        // The static method has to do two things:
        // 1) delegate to separate functions under the hood for creating (using POST) and updating (using PUT), and
        // 2) restore instance properties after success or failure
        //    The first issue is easy to deal with. You just check to see if the data (or instance) has an objectId. If
        // it doesn't, use create; if it does, use update.
        //    The second issue is a little trickier. What we want is for the local instance to be in sync with the saved
        // data, except for client-side changes that haven't been saved yet. On success, it should be updated with any
        // updated properties (the ones we saved, plus server-generated stuff like createdAt, updatedAt, etc.). On
        // error, it should revert to its pre-save state. Parse only sends createdAt and objectId in the response to
        // successful creation, and it only sends updatedAt in the response to successful updates. Angular takes that
        // and assumes that's all there is to the instance, so it deletes any other properties. So what we have to do
        // here of this is keep track of the pre-save properties so we can restore them afterwards.
        Resource.save = (function () {
          // Capture these methods here so we can delegate to them below.
          var create = Resource.create,
            update = Resource.update;

          // These shouldn't be directly accessible
          delete Resource.create;
          delete Resource.update;
          delete Resource.prototype.$create;
          delete Resource.prototype.$update;

          return function () {
            var args,
              params,
              data,
              instance,
              originalInstanceProps,
              successFunc,
              wrappedSuccessFunc,
              errorFunc,
              wrappedErrorFunc,
              isNew,
              saveFunc;

            // Turn arguments into an actual array
            args = [].slice.call(arguments);
            // We're always going to need to send data on a save, so there should always be a data object. There may or
            // may not be a params object, but if it does exist, it will be the first one.
            params = find(args, angular.isObject);
            data = findLast(args, angular.isObject);
            // If both of those are the same, there is no params object, and we just set it to an empty object.
            if (params === data) {
              params = {};
            }
            // If we already have a Resource instance, fine. If not, we'll create one.
            instance = (data instanceof Resource) ? data : new Resource(data);
            // These are all the the own properties that aren't methods. We need to keep track of these here so we can
            // restore them later.
            originalInstanceProps = ownDataProps(instance);

            // The success function that was passed in, or a do-nothing function if there wasn't one
            successFunc = find(args, angular.isFunction) || angular.noop;
            // Provide updatedInstanceProps as default values to the new instance (if there are conflicting
            // properties from the server, those will win)
            wrappedSuccessFunc = function (newInstance, responseHeaders) {
              setDefaults(newInstance, originalInstanceProps);
              successFunc(newInstance, responseHeaders);
            };
            // The error function that was passed in, or a do-nothing function if there wasn't one
            errorFunc = findLast(args, angular.isFunction) || angular.noop;
            // If the error function is the same as the save function, set errorFunc to angular.noop
            errorFunc = (errorFunc === successFunc) ? angular.noop : errorFunc;
            // In case there's a problem, this basically resets the instance
            wrappedErrorFunc = function (response) {
              angular.extend(instance, originalInstanceProps);
              errorFunc(response);
            };

            // Delegate to the correct function depending on whether the instance is new or not
            isNew = !instance.objectId;
            saveFunc = isNew ? create : update;
            // Delegate to the original function...
            return saveFunc.call(this, params, instance, wrappedSuccessFunc, wrappedErrorFunc);
          };
        }());
      }
    };

    var parseResourceActions = {
      getActionConfig: function (actionName) {
        return angular.copy(actionLib[actionName]);
      }
    };

    return parseResourceActions;

  });
angular.module('angularParseInterface')
  .factory('parseResourceDecorator', function ($log) {
    'use strict';

    // backburner: Refactor this so there are multiple decorators
    //    consider which methods every Resource will need, which may get easier as you add more features
    //backburner: Move this into the core resource module
    return function (Resource) {
      // Static methods
      Resource._getMetaData = function () {
        return this._metaData || {};
      };

      // backburner: Consider specifying some allowed inputs here
      Resource._setMetaData = function (data) {
//        if (typeof data === 'object') {
        this._metaData = data;
//        }
      };

      Resource._getMetaDataProp = function (propName) {
        var resourceMetaData = this._getMetaData();
        return resourceMetaData[propName];
      };

      Resource._setMetaDataProp = function (propName, val) {
        var resourceMetaData = this._getMetaData();
        resourceMetaData[propName] = val;
        this._setMetaData(resourceMetaData);
      };

      // A self-defining function
      var setClassName = function (val) {
        Resource._setMetaDataProp('className', val);
        // Calling it once causes the name to be redefined
        setClassName = function (val) {
          var oldVal = Resource._getMetaDataProp('className'),
            warning = 'You are renaming the Parse Object class ' + oldVal + ' to ' + val;
          // It still works, but now it issues a warning. This is mostly for me to see how often this comes up in
          // ordinary use.
          Resource._setMetaDataProp('className', val);
          $log.warn(warning);
        };
      };
      Object.defineProperty(Resource, 'className', {
        enumerable: true,
        configurable: false,
        get: function () {
          return this._getMetaDataProp('className');
        },
        set: function (val) {
          // Call the self-defining setter
          setClassName(val);
        }
      });

      Resource._getFieldsMetaData = function () {
        return this._getMetaDataProp('fields') || {};
      };

      Resource._setFieldsMetaData = function (data) {
        this._setMetaDataProp('fields', data);
      };

      Resource._getFieldMetaData = function (fieldName) {
        var fieldsMetaData = this._getFieldsMetaData();
        return fieldsMetaData[fieldName] || {};
      };

      Resource._setFieldMetaData = function (fieldName, data) {
        var fieldsMetaData = this._getFieldsMetaData();
        fieldsMetaData[fieldName] = data;
        this._setFieldsMetaData(fieldsMetaData);
      };

      Resource._getFieldMetaDataProp = function (fieldName, propName) {
        var fieldMetaData = this._getFieldMetaData(fieldName);
        return fieldMetaData[propName];
      };

      Resource._setFieldMetaDataProp = function (fieldName, propName, val) {
        var fieldMetaData = this._getFieldMetaData(fieldName);
        fieldMetaData[propName] = val;
        this._setFieldMetaData(fieldName, fieldMetaData);
      };

      Resource._getFieldDataType = function (fieldName) {
        return this._getFieldMetaDataProp(fieldName, 'dataType');
      };

      Resource._setFieldDataType = function (fieldName, val) {
        this._setFieldMetaDataProp(fieldName, 'dataType', val);
      };

      Resource._getFieldClassName = function (fieldName) {
        return this._getFieldMetaDataProp(fieldName, 'className');
      };

      Resource._setFieldClassName = function (fieldName, val) {
        this._setFieldMetaDataProp(fieldName, 'className', val);
      };

//      Resource._getFieldRelationConstructor = function (fieldName) {
//        return this._getFieldMetaDataProp(fieldName, 'relationConstructor');
//      };

//      Resource._setFieldRelationConstructor = function (fieldName, val) {
//        return this._setFieldMetaDataProp(fieldName, 'relationConstructor', val);
//      };

      Resource._addRequestBlacklistProp = function (fieldName) {
        this._setFieldMetaDataProp(fieldName, 'isRequestBlacklisted', true);
      };

      Resource._addRequestBlacklistProps = function () {
        var props = angular.isArray(arguments[0]) ? arguments[0] : [].slice.call(arguments),
          self = this,
          addBlacklistProp = function (propName) {
            self._addRequestBlacklistProp(propName);
          };
        angular.forEach(props, addBlacklistProp);
      };

      Resource._isRequestBlacklisted = function (fieldName) {
        return !!this._getFieldMetaDataProp(fieldName, 'isRequestBlacklisted');
      };

      // Blacklist createdAt and updatedAt properties
      Resource._addRequestBlacklistProps('createdAt', 'updatedAt');

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//      Resource.prototype.constructor = Resource;
      // Instance methods
//      Resource.prototype.isNew = function () {
//        return !this.objectId;
//      };
      // className
      Object.defineProperty(Resource.prototype, 'className', {
        enumerable: true,
        configurable: false,
        get: function () {
          return Resource.className;
        },
        set: function () {}
      });
      // getPointer
      Resource.prototype.getPointer = function () {
        return {
          __type: 'Pointer',
          className: this.className,
          objectId: this.objectId
        };
      };

      // Relational methods
      // hasOne
      Resource.hasOne = function (fieldName, other) {
        this._setFieldDataType(fieldName, 'Pointer');
        this._setFieldClassName(fieldName, other.className);
      };
      // hasMany
      Resource.hasMany = function (fieldName, other) {
        this._setFieldDataType(fieldName, 'Relation');
        this._setFieldClassName(fieldName, other.className);
      };
      // addRelations
      Resource.prototype.addRelations = function (fieldName/*, relations */) {
        var relations = angular.isArray(arguments[1]) ? arguments[1] : [].slice.call(arguments, 1),
          data = {};

        data[fieldName] = {
          __op: 'AddRelation',
          objects: []
        };
        angular.forEach(relations, function (o) {
          data[fieldName].objects.push(o.getPointer());
        });

        return this.$PUT(data);
      };
      // removeRelations
      Resource.prototype.removeRelations = function (fieldName/*, other*/) {
        var relations = angular.isArray(arguments[1]) ? arguments[1] : [].slice.call(arguments, 1),
          data = {};

        data[fieldName] = {
          __op: 'RemoveRelation',
          objects: []
        };
        angular.forEach(relations, function (o) {
          data[fieldName].objects.push(o.getPointer());
        });

        return this.$PUT(data);
      };

//      // Probably not worth using Parse's increment operator
//      // increment
//      Resource.prototype.increment = function (fieldName, v) {
//        this[fieldName] += v;
//        return this.$save();
//      };
//      // decrement
//      Resource.prototype.decrement = function (fieldName, v) {
//        this[fieldName] -= v;
//        return this.$save();
//      };

//      // deleteField
//      Resource.prototype.deleteField = function (fieldName) {
//        var data = {},
//          self = this;
//        data[fieldName] = {
//          __op: 'Delete'
//        };
//        return this.PUT(data).then(function () {
//          delete self[fieldName];
//        });
//      };

      // Security
      Resource.prototype._getACLMetaData = function () {
        return this.ACL || {};
      };
      Resource.prototype._setACLMetaData = function (val) {
        this.ACL = val;
      };
      Resource.prototype._setReadPrivileges = function (obj, canRead) {
        var id, ACL;
        if (arguments.length === 1 && (typeof obj === 'boolean')) {
          canRead = obj;
          id = '*';
        } else {
          if ((obj.className !== '_User') && (obj.className !== '_Role')) {
            throw new Error('Can only set privileges for User or Role objects');
          }
          id = obj.objectId;
        }
        ACL = this._getACLMetaData();
        ACL[id] = ACL[id] || {};
        ACL[id].read = canRead;
        this._setACLMetaData(ACL);
      };
      Resource.prototype._setWritePrivileges = function (obj, canWrite) {
        var id, ACL;
        if (arguments.length === 1 && (typeof obj === 'boolean')) {
          canWrite = obj;
          id = '*';
        } else {
          if ((obj.className !== '_User') && (obj.className !== '_Role')) {
            throw new Error('Can only set privileges for User or Role objects');
          }
          id = obj.objectId;
        }
        ACL = this._getACLMetaData();
        ACL[id] = ACL[id] || {};
        ACL[id].write = canWrite;
        this._setACLMetaData(ACL);
      };
      Resource.prototype.canBeReadBy = function (obj) {
        var id = obj.objectId;
        this._setReadPrivileges(id, true);
      };
      Resource.prototype.cannotBeReadBy = function (obj) {
        var id = obj.objectId;
        this._setReadPrivileges(id, false);
      };
      Resource.prototype.canBeWrittenBy = function (obj) {
        var id = obj.objectId;
        this._setWritePrivileges(id, true);
      };
      Resource.prototype.cannotBeWrittenBy = function (obj) {
        var id = obj.objectId;
        this._setWritePrivileges(id, false);
      };
      Resource.prototype.allCanRead = function () {
        this._setReadPrivileges(true);
      };
      Resource.prototype.allCanWrite = function () {
        this._setWritePrivileges(true);
      };
    };
  });