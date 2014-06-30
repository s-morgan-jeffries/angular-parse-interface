angular
  .module('angularParseInterface', [
    'ngResource'
  ])
;
angular
  .module('angularParseInterface')
  .factory('ParseAppEventBus', function ($rootScope) {
    'use strict';

    // Create a new isolated scope for the event bus
    var ParseAppEventBus = function ParseAppEventBus() {
      this._$scope = $rootScope.$new(true);
    };

    // Register an event handler
    ParseAppEventBus.prototype.on = function (event, handler) {
      // Delegate to the scope's $on method
      this._$scope.$on(event, handler);
    };

    // Trigger an event
    ParseAppEventBus.prototype.emit = function (/* event, args */) {
      var scope = this._$scope;
      // Delegate to the scope's emit method
      scope.$emit.apply(scope, arguments);
    };

    return ParseAppEventBus;
  });
angular
  .module('angularParseInterface')
  .value('SIGN_IN', 'signin')
  .value('SIGN_OUT', 'signout')
;
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
angular
//  .module('angularParseInterface.objectFactoryMod', [
//    'angularParseInterface.configMod'
//  ])
  .module('angularParseInterface')
  .factory('parseObjectFactory', function (parseResourceActions) {
    'use strict';

    // Currently a do-little function. But because I'm going to have to pack a lot of functionality into the basic
    // ParseResource (because some things just can't be added later), this might be necessary for removing some
    // functionality (e.g. making arbitrary HTTP requests).
    var parseObjectDecorator = function (ParseObject, className) {
//      ParseObject._setClassName(className);
      ParseObject.className = className;
    };

    var parseObjectFactory = {};

    parseObjectFactory.createObjectFactory = function (appResourceFactory) {
      // The objectFactory function that will be returned
      return function (className/*, defaultParams, customActions*/) {
        // Parse's URL scheme for Objects
        var url = '/classes/' + className + '/:objectId',
          defaultParams = {objectId: '@objectId'},
          customActions = {
            get: parseResourceActions.get,
            query: parseResourceActions.query,
            save: parseResourceActions.save,
            delete: parseResourceActions.delete
          },
          ParseObject;

//        customActions.get = parseResourceActions.get;

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
    Query.prototype.exec = function () {
      var params = this._yieldParams();
      delete params.className;
      params.where = (typeof params.where !== 'undefined') ? JSON.stringify(params.where) : undefined;
      return this._Resource.query(params);
    };

    return parseQueryBuilder;
  });
angular
  .module('angularParseInterface')
  .factory('parseUser', function (parseResourceActions, SIGN_IN, SIGN_OUT) {
    'use strict';

    var parseUser = {};

    var userDecorator = function (User, eventBus, storage) {
      // Set the className to _User (Parse uses leading underscore names for certain built-in classes)
      User.className = '_User';
      // These should never be sent with PUT requests
      // backburner: Maybe remove sessionToken from request blacklist (it should be deleted, anyway)
      User._addRequestBlacklistProps('sessionToken', 'emailVerified');

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
          eventBus.emit(SIGN_IN, data);
        });
        // jshint boss:true
        // Cache the user in storage and return it
        return storage.user = user;
        // jshint boss:false
      };

      // This is for signing in (duh)
      User.signIn = function (username, password) {
        // backburner: Figure out a cleaner, more intuitive way of representing arbitrary HTTP requests
        // Maybe you should have a way for Resources to send arbitrary requests (e.g. custom actions with capitalized
        // HTTP verb names) in addition to the convenience methods.
        var user = this.get({urlSegment1: 'login', username: username, password: password});
        // After we get the user back, we'll basically do exactly what we did in the signUp method.
        user.$promise.then(function () {
          var data = {
            sessionToken: user.sessionToken
          };
          // Delete the sessionToken from the user
          delete user.sessionToken;
          // Emit a SIGN_IN event with the sessionToken as data.
          eventBus.emit(SIGN_IN, data);
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
        eventBus.emit(SIGN_OUT);
      };

      // This is for retrieving the current user
      User.current = function () {
        // Check the cache
        var user = storage.user;
        // If there's nothing there...
        if (!user) {
          // Get the current user from the server. Again, this is not 100% clear to me (I have to *think* about how this
          // maps to the URL in Parse's documentation), so it would be nice if there were a better way to make arbitrary
          // requests like this.
          user = this.get({urlSegment2: 'me'});
          // Once we get a response...
          user.$promise.then(function () {
            // In this case, we're only deleting the sessionToken. Not sure if Parse sends us a new one, but since the
            // old one (which must have been used to make this request) never expires, it's fine.
            delete user.sessionToken;
          });
          // Cache the user
          storage.user = user;
        }
        return user;
      };

      // backburner: Add the ability to link accounts (e.g. Facebook, Twitter)
      // backburner: Add ability to request a password reset

    };

    parseUser.createUserModel = function (appResourceFactory, appStorage, appEventBus) {
      var url = '/:urlSegment1/:urlSegment2',
        defaultParams = {
          urlSegment1: 'users',
          urlSegment2: '@objectId'
        },
        customActions = {
          get: parseResourceActions.get,
          query: parseResourceActions.query,
          save: parseResourceActions.save,
          delete: parseResourceActions.delete
        },
        // Create the User model using our application's resource factory
        User = appResourceFactory(url, defaultParams, customActions);

      // Add functionality from above decorator
      userDecorator(User, appEventBus, appStorage);

      return User;
    };

    return parseUser;
  });
angular.module('angularParseInterface')
  .factory('parseDataCodecs', function () {
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

        // Ad hoc polymorphism to account for two cases: 1) the value is an object ID, or 2) the value is the pointer target
        if (angular.isString(val)) {
          objectId = val;
        } else if (angular.isObject(val)) {
          objectId = val.objectId;
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
        dataType = getRequestDataType(fieldName, val);
        params = {
          className: getClassName(fieldName)
        };
        encoder = parseDataCodecs.getEncoderForType(dataType, params);
        return encoder(val);
      };

      // Decode an entire object by iterating over all of its own properties
      var encodeData = function (data) {
        var key, encodedData;
        encodedData = {};
        for (key in data) {
          if (data.hasOwnProperty(key) && (typeof data[key] !== 'function')) {
            encodedData[key] = encodeField(key, data[key]);
          }
        }
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
  .factory('parseRequestHeaders', function (SIGN_IN, SIGN_OUT) {
    'use strict';

    var parseRequestHeaders = {};

    // The service has only one method, getTransformRequest. It returns a requestTransform function that will add the
    // correct headers to the request but will not otherwise modify the headers or data
    parseRequestHeaders.getTransformRequest = function (appConfig, appStorage, appEventBus) {
      // Capture the application ID and REST API key
      var appId = appConfig.applicationId,
        restKey = appConfig.restKey;

      // Register event handlers
      // On a SIGN_IN event, cache the sessionToken
      appEventBus.on(SIGN_IN, function (e, data) {
        appStorage.sessionToken = data.sessionToken;
      });
      // On a SIGN_OUT event, delete the sessionToken from the cache
      appEventBus.on(SIGN_OUT, function (/*e, data*/) {
        delete appStorage.sessionToken;
      });

      // The requestTransform function
      return function (data, headersGetter) {
        var headers = headersGetter(),
          // Get the current value of the session token
          sessionToken = appStorage.sessionToken;

        // Set the application ID and REST key headers
        headers['X-Parse-Application-Id'] = appId;
        headers['X-Parse-REST-API-Key'] = restKey;

        // If the session token has a reasonably existy value, set the session token header
        if (sessionToken && sessionToken.length) {
          headers['X-Parse-Session-Token'] = sessionToken;
        }
        // Return the data unmodified
        return data;
      };
    };

    return parseRequestHeaders;
  });
angular.module('angularParseInterface')
  .factory('parseResource', function ($resource, parseRequestHeaders, parseDataEncoding, parseResourceDecorator) {
    'use strict';

    var parseResource = {};


    parseResource.createAppResourceFactory = function (appConfig, appStorage, appEventBus) {
      var coreAppResourceFactory = this.createCoreAppResourceFactory(appConfig, appStorage, appEventBus);

      // Okay for now. What do you want this to do ultimately? You probably don't want to leave customActions in its
      // current state. For example, you probably want objects to have certain actions but not others.
      return function appResourceFactory(url, defaultParams, actionAdders) {
        var Resource,
          customActions = {};

        // Add actions
        angular.forEach(actionAdders, function (actionAdder) {
          // Extend the customActions with any actions defined on the actionAdder (will work even if that property
          // isn't defined)
          angular.extend(customActions, actionAdder.actions);
        });

        // Create the Resource
        Resource = coreAppResourceFactory(url, defaultParams, customActions);

        // Decorate with decorators
        angular.forEach(actionAdders, function (actionAdder) {
          if (angular.isFunction(actionAdder.decorator)) {
            actionAdder.decorator(Resource);
          }
        });

        // Remove any actions that weren't part of the actionAdders object
        angular.forEach(Resource, function (v, k) {
          var isAction = function (name) {
            return Resource.hasOwnProperty(name) && Resource.prototype.hasOwnProperty('$' + name);
          };
          if (isAction(k) && !actionAdders[k]) {
            delete Resource[k];
            delete Resource.prototype['$' + k];
          }
        });

        // Apply the decorator
        parseResourceDecorator(Resource);

        return Resource;
      };
    };

    // This creates the core app resource. It's concerned with encoding/decoding of data and the addition of the
    // appropriate headers. A separate function deals with actions.
    parseResource.createCoreAppResourceFactory = function (appConfig, appStorage, appEventBus) {

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

      var addRequestHeaders = parseRequestHeaders.getTransformRequest(appConfig, appStorage, appEventBus);

      return function coreAppResourceFactory(url, defaultParams, customActions) {
        var restApiBaseUrl = 'https://api.parse.com/1',
          baseActions,
          actions,
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
            // And this is for stringifying the data
            transformReqArray.push(stringifyData);
          }
          // Every request will add headers
          transformReqArray.push(addRequestHeaders);
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
        //   From here to the end of the comment is basically code that deals with custom actions. Something interesting
        // here: you could almost wrap the definition of each of these actions around the underlying code, with the call
        // to coreAppResourceFactory in the middle, except for the fact that some of the actions use Resource in their
        // definitions. So you may have to think of a way to pass them in so that Resource can be passed to them as an
        // argument. (Maybe pass an argument to customActions that are functions?)
        //   In any case, these don't really belong here, as they require this function to do too much. The purpose of
        // this function is to modify the $resource service so that it adds appropriate headers and encodes/decodes data
        // in the correct format for Parse.
        //   Right, so how to do that? The request headers part is easy. Every action will get the transformRequest for
        // adding headers. Every non-GET action will also get a transformRequest function to convert the data to JSON if
        // it isn't already (since they all get at least one transformRequest function, angular won't do this
        // automatically). Data encoding transformRequests only need to be added to non-GET requests, since GET requests
        // don't have a body. Conversely, data decoding has to be applied to every response.

        url = prependBaseUrl(url);
        defaultParams = defaultParams || {};
        customActions = customActions || {};

        // backburner: Get rid of these, and rewrite your tests to deal with the change.
        // In order for us to add the required transformRequest and transformResponse functions to our actions, they
        // have to be visible inside this function. That means we have to re-define all the built-in actions here.
        baseActions = {
          get: {
            method: 'GET'
          },
          save: {
            method: 'POST'
          },
          query: {
            method: 'GET',
            isArray: true
          },
          remove: {
            method: 'DELETE'
          },
          delete: {
            method: 'DELETE'
          }
        };

        // This allows us to override the above definitions with any customActions that were passed in:
        actions = angular.extend(baseActions, customActions);

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
    return parseResource;
  });
angular.module('angularParseInterface')
  .factory('parseResourceActions', function () {
    'use strict';

    var parseResourceActions = {};

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

//    var isIn = function (val, col) {
//      if (col.indexOf) {
//        return col.indexOf(val) >= 0;
//      } else {
//        for (var k in col) {
//          if (col.hasOwnProperty(k) && (col[k] === val)) {
//            return true;
//          }
//        }
//        return false;
//      }
//    };

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

//    // jshint bitwise:false
//    var pick = function (obj, keys) {
//      var newObj = {};
//      angular.forEach(obj, function (v, k) {
//        if (~keys.indexOf(k)) {
//          newObj[k] = v;
//        }
//      });
//      return newObj;
//    };
//    // jshint bitwise:true

//    var omit = function (obj, keys) {
//      var newObj = {};
//      angular.forEach(obj, function (v, k) {
//        if (keys.indexOf(k) < 0) {
//          newObj[k] = v;
//        }
//      });
//      return newObj;
//    };

    parseResourceActions.get = {
      actions: {
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

    parseResourceActions.delete = {
      actions: {
        delete: {
          method: 'DELETE'
        }
      }
    };

    parseResourceActions.POST = {
      actions: {
        POST: {
          method: 'POST'
        }
      },
      decorator: function (Resource) {
        // The prototype doesn't need to have this.
        delete Resource.prototype.$POST;
      }
    };

    parseResourceActions.PUT = {
      actions: {
        PUT: {
          method: 'PUT'
        }
      },
      // This is sort of magical, and the PUT request itself is actually kind of weird. Instead of doing it this way,
      // it might be better to call the function directly on the Resource the way it's written in the last line:
      //    return put.call(this, params, data, successFunc, errorFunc);
      // If the instance needs to use this, it could do something like this:
      //    instance.constructor.PUT({objectId: instance.objectId}, data, successFunc, errorFunc);
      // Is there any way to prevent it from returning a Resource? And is that worth it? If you want to do that, you're
      // going to have to use promises. Arguably not worth it for now. Just make sure you don't give the Resource method
      // the actual instance.
      decorator: function (Resource) {
        Resource.PUT = (function () {
          var PUT = Resource.PUT;

          // backburner: Rewrite this so it returns something other than a Resource instance.
          return PUT;
//          return function () {
//            var args,
//              data,
//              instance,
//              params,
//              successFunc,
//              errorFunc;
//
//            var returnVal = {};
//
//            // Turn arguments into an actual array
//            args = [].slice.call(arguments);
//            // Get the data for the put request
//            data = find(args, isParams);
//            // Figure out which argument is the instance; this has to exist so we can get its objectId
//            instance = find(args, isInstance);
//            // Create the parameters
//            params = {
//              objectId: instance.objectId
//            };
//
//            // The success function that was passed in, or a do-nothing function if there wasn't one
//            successFunc = find(args, angular.isFunction) || angular.noop;
//            // The error function that was passed in, or a do-nothing function if there wasn't one
//            errorFunc = findLast(args, angular.isFunction) || angular.noop;
//            // If the error function is the same as the save function, set errorFunc to angular.noop
//            errorFunc = (errorFunc === successFunc) ? angular.noop : errorFunc;
//
//            // Delegate to the original function...
//            return put.call(this, params, data, successFunc, errorFunc);
//          };
        }());

        // Maybe?
        Resource.prototype.$PUT = function (data, successFunc, errorFunc) {
          var params = {
            objectId: this.objectId
          };
          return Resource.PUT(params, data, successFunc, errorFunc);
        };
      }
    };

    parseResourceActions.query = {
      actions: {
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
              queryFx;

            // Get the query parameters or an empty object
            queryParams = angular.isObject(arguments[0]) ? arguments[0] : {};
            // Determine whether this is a count query based on whether the count parameter is set
            isCountQuery = angular.equals(queryParams.count, 1);
            // If it's a count query, use the count action; otherwise, use the query action
            queryFx = isCountQuery ? count : query;
            // Delegate to the appropriate function...
            return queryFx.apply(this, arguments);
          };
        }());
      }
    };

    // A test
    parseResourceActions.save = {
      actions: {
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

//        console.log(Resource);

        // Have to do something smart here so that:
        // 1) save delegates to separate functions under the hood for creating (using POST) and updating (using PUT), and
        // 2) instance properties are restored after a successful save
        // The first issue is easy to fix. You always get the instance as one of the arguments, so you just check to see if
        // it's new and call the appropriate function accordingly.
        // The second issue is a little trickier. For reasons I don't fully understand yet, when you save an instance to
        // Parse, you wind up losing all of its properties, except for the ones that are returned from the server. That only
        // happens when you call the instance method (so probably related to "this" within angular-resource.js).
        // Key point to remember is that you want this to behave just like $resource's built-in save function.
        Resource.save = (function () {
          var create = Resource.create,
            update = Resource.update;

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

    return parseResourceActions;

  });
angular.module('angularParseInterface')
  .factory('parseResourceDecorator', function ($log) {
    'use strict';

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

//      Resource._getClassName = function () {
//        return this._getMetaDataProp('className');
//      };

//      // Not sure I'm crazy about how I'm implementing this. Might be going overboard with security.
//      // backburner: Consider specifying some allowed inputs here
//      Resource._setClassName = function (val) {
//        return this._setMetaDataProp('className', val);
//      };

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
        var props = angular.isArray(arguments[0]) ? arguments[0] : [].slice.call(arguments);
//        var addBlacklistProp = this._addRequestBlacklistProp.bind(this);
        var self = this;
        var addBlacklistProp = function (propName) {
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

//      // Relational methods
//      // hasOne
//      Resource.hasOne = function (fieldName, other) {
//        this._setFieldDataType(fieldName, 'Pointer');
//        this._setFieldClassName(fieldName, other._getClassName());
//        this._setFieldRelationConstructor(fieldName, other);
//      };
//      // hasMany
//      Resource.hasMany = function (fieldName, other) {
//        this._setFieldDataType(fieldName, 'Relation');
//        this._setFieldClassName(fieldName, other._getClassName());
//      };

      // Instance methods
      Resource.prototype.isNew = function () {
        return !this.objectId;
      };
      // className
      Object.defineProperty(Resource.prototype, 'className', {
        enumerable: true,
        configurable: false,
        get: function () {
          return this.constructor.className;
        },
        set: function () {}
      });
//      // getPointer
//      Resource.prototype.getPointer = function () {
//        return {
//          __type: 'Pointer',
//          className: this.className,
//          objectId: this.objectId
//        };
//      };

//      // Relational methods
//      // setPointer
//      Resource.prototype.setPointer = function (fieldName, other) {
//        this[fieldName] = other.objectId;
//      };
//      // addRelations
//      Resource.prototype.addRelations = function (fieldName/*, other*/) {
//        var relations = angular.isArray(arguments[1]) ? arguments[1] : [].slice.call(arguments, 1),
//          data = {};
//
//        data[fieldName] = {
//          __op: 'AddRelation',
//          objects: []
//        };
//        angular.forEach(relations, function (o) {
//          data[fieldName].objects.push(o.getPointer());
//        });
//
//        return this.$putData(data);
//      };
//      // removeRelations
//      Resource.prototype.removeRelations = function (fieldName/*, other*/) {
//        var relations = angular.isArray(arguments[1]) ? arguments[1] : [].slice.call(arguments, 1),
//          data = {};
//
//        data[fieldName] = {
//          __op: 'RemoveRelation',
//          objects: []
//        };
//        angular.forEach(relations, function (o) {
//          data[fieldName].objects.push(o.getPointer());
//        });
//
//        return this.$putData(data);
//      };

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
//        return this.$putData(data).then(function () {
//          delete self[fieldName];
//        });
//      };

//      // Security
//      Resource.prototype._setPrivileges = function (name, privileges) {
//        this.ACL = this.ACL || {};
//        this.ACL[name] = this.ACL[name] || {};
//        if (privileges.read) {
//          this.ACL[name].read = privileges.read;
//        }
//        if (privileges.write) {
//          this.ACL[name].write = privileges.write;
//        }
//      };
//      Resource.prototype.allCanRead = function () {
//        this._setPrivileges('*', {read: true});
//      };
//      Resource.prototype.allCanWrite = function () {
//        this._setPrivileges('*', {write: true});
//      };
//      Resource.prototype.setUserPrivileges = function (user, privileges) {
//        this._setPrivileges(user.objectId, privileges);
//      };
    };
  });