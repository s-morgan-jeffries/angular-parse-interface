'use strict';

angular.module('angularParseInterface', [
  'ngResource'
])
  .factory('parseInterface', function($rootScope, $resource) {

    var _SIGN_IN_ = 'signin';
    var _SIGN_OUT_ = 'signout';

    var parseInterface = {};

    // resource submodule
    parseInterface._resource = {
      _url: {
        // This is the base URL for all requests
        _restApiBaseUrl: 'https://api.parse.com/1',
        // Prefix URLs
        _prefixUrl: function (url, prefix) {
          return prefix.replace(/\/+$/, '') + '/' + url.replace(/^\/+/, '');
        },
        prependBaseUrl: function (url) {
          return this._prefixUrl(url, this._restApiBaseUrl);
        }
      },
      _headers: {
        // This returns appropriate request headers
        _parseRequestHeadersGetter: function(appConfig, appStorage) {
          var headers = {
            'X-Parse-Application-Id': appConfig.applicationId,
            'X-Parse-REST-API-Key': appConfig.restKey
          };
          if (appStorage.sessionToken) {
            headers['X-Parse-Session-Token'] = appStorage.sessionToken;
          }
          return headers;
        },
        _addHeadersForAction: function (action, appConfig, appStorage) {
          var origTransformRequest = action.transformRequest || function(data/*, headersGetter*/) {return angular.toJson(data);};
          var parseRequestHeadersGetter = this._parseRequestHeadersGetter;
          action.transformRequest = function (data, headersGetter) {
            angular.extend(headersGetter(), parseRequestHeadersGetter(appConfig, appStorage));
            return origTransformRequest(data, headersGetter);
          };
        },
        // This adds the request headers to all of the custom actions (which should be every action)
        addParseRequestHeaders: function(actions, appConfig, appStorage) {
          var addHeadersForAction = this._addHeadersForAction.bind(this);
          angular.forEach(actions, function (action) {
            addHeadersForAction(action, appConfig, appStorage);
          });
        }
      },
      _dataEncoding: {
        _typeOfRequestData: function (Resource, fieldName, val) {
          var dataType = Resource._getFieldDataType(fieldName) || (angular.isDate(val) ? 'Date': undefined) || typeof val;
          return dataType[0].toUpperCase() + dataType.slice(1);
        },
        _typeOfResponseData: function (Resource, fieldName, val) {
          var fieldMetaData = Resource._getFieldMetaData(fieldName),
            dataType = (val && val.__type) || typeof val;
          return fieldMetaData.type = dataType[0].toUpperCase() + dataType.slice(1);
        },
        _isBlacklisted: function (Resource, fieldName) {
          return Resource._isBlacklistedField(fieldName);
        },
        _codecs: {
          Date: {
            encode: function (val) {
              return {
                __type: 'Date',
                iso: val.toISOString()
              };
            },
            decode: function (val) {
              return new Date(val.iso);
            }
          }
        },
        _getEncoder: function (dataType) {
          var codecs = this._codecs;
          return (codecs[dataType] && codecs[dataType].encode) || angular.identity;
        },
        _getDecoder: function (dataType) {
          var codecs = this._codecs;
          return (codecs[dataType] && codecs[dataType].decode) || angular.identity;
        },
        encodeRequestData: function (Resource, data) {
          var isBlacklisted = this._isBlacklisted,
            typeOf = this._typeOfRequestData,
            getEncoder = this._getEncoder.bind(this),
            encodedData = {};
          angular.forEach(data, function (val, key) {
            var encoder;
            if (!isBlacklisted(Resource, key)) {
              encoder = getEncoder(typeOf(Resource, key, val));
              encodedData[key] = encoder(data[key]);
            }
          });
          return encodedData;
        },
        decodeResponseData: function (Resource, data) {
          var typeOf = this._typeOfResponseData,
            getDecoder = this._getDecoder.bind(this),
            decodedData = {};
          angular.forEach(data, function (val, key) {
            var decoder = getDecoder(typeOf(Resource, key, val));
            decodedData[key] = decoder(data[key]);
          });
          return decodedData;
        }
      },
      createAppResourceFactory: function (baseResourceFactory, appConfig, appStorage, appEventBus) {
        var prependBaseUrl = this._url.prependBaseUrl.bind(this._url),
          addParseRequestHeaders = this._headers.addParseRequestHeaders.bind(this._headers),
          encodeRequestData = this._dataEncoding.encodeRequestData.bind(this._dataEncoding),
          decodeResponseData = this._dataEncoding.decodeResponseData.bind(this._dataEncoding);

        // Register with appEventBus
        appEventBus.on(_SIGN_IN_, function(e, data) {
          appStorage.sessionToken = data.sessionToken;
        });
        appEventBus.on(_SIGN_OUT_, function(e, data) {
          delete appStorage.sessionToken;
        });

        return function appResourceFactory(url, defaults, customActions) {
          var Resource,
            baseActions = {
              get: {
                method: 'GET',
                transformResponse: function (data) {
                  data = angular.fromJson(data);
                  return new Resource(decodeResponseData(Resource, data));
                }
              },
              query: {
                method:'GET',
                isArray: true,
                transformResponse: function(data) {
                  data = angular.fromJson(data).results;
                  if (!data) {
                    return [];
                  }
                  return angular.forEach(data, function(item, idx, col) {
                    col[idx] = new Resource(decodeResponseData(Resource, item));
                  });
                }
              },
              create: {
                method:'POST',
                transformRequest: function (data) {
                  return angular.toJson(encodeRequestData(Resource, data));
                }
              },
              update: {
                method:'PUT',
                transformRequest: function (data) {
                  return angular.toJson(encodeRequestData(Resource, data));
                }
              },
              remove: {
                method: 'DELETE'
              },
              delete: {
                method: 'DELETE'
              }
            },
            actions = angular.extend(baseActions, (customActions || {}));

          addParseRequestHeaders(actions, appConfig, appStorage);

          url = prependBaseUrl(url);

          Resource = baseResourceFactory(url, defaults, actions);

          // t0d0: Refactor the shit out of this (it does too much)
          // Have to do something smart here so that:
          // 1) save delegates to separate functions under the hood for creating (using POST) and updating (using PUT), and
          // 2) instance properties are restored after a successful save
          // The first issue is easy to fix. You always get the instance as one of the arguments, so you just check to see if
          // it's new and call the appropriate function accordingly.
          // The second issue is a little trickier. For reasons I don't fully understand yet, when you save an instance to
          // Parse, you wind up losing all of its properties, except for the ones that are returned from the server. That only
          // happens when you call the instance method (so probably related to "this" within angular-resource.js).
          // Key point to remember is that you want this to behave just like $resource's built-in save function.
          Resource.save = (function() {
            var create = Resource.create,
              update = Resource.update;

            delete Resource.create;
            delete Resource.update;
            delete Resource.prototype.$create;
            delete Resource.prototype.$update;

            var isInstance = function(obj, idx, col) {
              return obj instanceof Resource;
            };

            var isParams = function(obj, idx, col) {
              return (typeof obj === 'object') && !isInstance(obj);
            };

            return function() {
              var args,
                params,
                instance,
                originalInstanceProps,
                updatedInstanceProps,
                errorFunc,
                successFunc,
                wrappedSuccessFunc,
                wrappedErrorFunc,
                saveFunc;

              args = [].slice.call(arguments);
              // Get the parameters we're saving (or an empty object)
              params = _.find(args, isParams) || {};
              // Figure out which argument is the object to be updated or make a new one
              instance = _.find(args, isInstance) || new Resource(params);
              // This is all the the own properties that aren't methods
              originalInstanceProps = _.omit(_.pick(instance, _.keys(instance)), _.methods(instance));
              // Those props updated with params
              updatedInstanceProps = angular.extend(originalInstanceProps, params);
              // If there's an error, this gets invoked, and the shallowClearAndCopy thing never happens
              errorFunc = _.findLast(args, angular.isFunction) || angular.noop;
              // Conversely, this gets invoked after the shallowClearAndCopy.
              successFunc = _.find(args, angular.isFunction) || angular.noop;
              // This merges the instance props back into the instance
              wrappedSuccessFunc = function(val, responseHeaders) {
                _.defaults(val, updatedInstanceProps);
                successFunc(val, responseHeaders);
              };
              // Delegate to the correct function depending on whether this is a creation or update
              saveFunc = instance.isNew() ? create : update;

              // If the error function is the same as the save function, set errorFunc to angular.noop
              errorFunc = errorFunc === successFunc ? angular.noop : errorFunc;
              // In case there's a problem, this basically resets the instance
              wrappedErrorFunc = function(response) {
                angular.extend(instance, originalInstanceProps);
                errorFunc(response);
              };

              // Delegate to the original function...
              return saveFunc.call(this, params, instance, wrappedSuccessFunc, wrappedErrorFunc);
            };
          }());

          // Static methods
          Resource._getMetaData = function () {
            return this._metaData || (this._metaData = {});
          };

          Resource._getMetaDataProp = function (propName) {
            var resourceMetaData = this._getMetaData();
            return resourceMetaData[propName];
          };

          Resource._setMetaDataProp = function (propName, val) {
            var resourceMetaData = this._getMetaData();
            resourceMetaData[propName] = val;
          };

          Resource._getFieldMetaData = function (fieldName) {
            var resourceMetaData = this._getMetaData();
            var fieldsMetaData = resourceMetaData.fields || (resourceMetaData.fields = {});
            return fieldsMetaData[fieldName] || (fieldsMetaData[fieldName] = {});
          };

          Resource._getFieldMetaDataProp = function (fieldName, propName) {
            var fieldMetaData = this._getFieldMetaData(fieldName);
            return fieldMetaData[propName];
          };

          Resource._setFieldMetaDataProp = function (fieldName, propName, val) {
            var fieldMetaData = this._getFieldMetaData(fieldName);
            fieldMetaData[propName] = val;
          };

          Resource._getFieldDataType = function (fieldName) {
            return this._getFieldMetaDataProp(fieldName, 'dataType');
          };

          Resource._setFieldDataType = function (fieldName, val) {
            this._setFieldMetaDataProp(fieldName, 'dataType', val);
          };

          Resource._addBlacklistProp = function (fieldName) {
            this._setFieldMetaDataProp(fieldName, 'isBlacklisted', true);
          };

          Resource._addBlacklistProps = function () {
            var props = angular.isArray(arguments[0]) ? arguments[0] : [].slice.call(arguments);
            var addBlacklistProp = this._addBlacklistProp.bind(this);
            angular.forEach(props, addBlacklistProp);
          };

          Resource._isBlacklistedField = function (fieldName) {
            return !!this._getFieldMetaDataProp(fieldName, 'isBlacklisted');
          };

          // Instance methods
          Resource.prototype.isNew = function() {
            return !this.objectId;
          };

          return Resource;

        };
      }
    };

    // object submodule
    parseInterface._object = {
      _objectUrl: function (className) {
        return '/classes/' + className + '/:objectId';
      },
      objectDecorator: function (Resource, className) {
        Resource._addBlacklistProps('createdAt', 'updatedAt');
        Resource._setMetaDataProp('className', className);
        Object.defineProperty(Resource.prototype, '_className', {
          get: function () {
            return this.constructor._getMetaDataProp('className');
          }
        });
        Resource.prototype.getPointer = function() {
          return {
            __type: 'Pointer',
            className: this._className,
            objectId: this.objectId
          };
        };

        Resource.prototype.setUserPriveleges = function(user, canRead, canWrite) {
          this.ACL = this.ACL || {};
          this.ACL[user.objectId] = {
            read: canRead,
            write: canWrite
          };
        };
        return Resource;
      },
      createObjectFactory: function (appResourceFactory) {
        var objectUrl = this._objectUrl,
          objectDecorator = this.objectDecorator;
        return function (className, defaults, customActions) {
          var url = objectUrl(className);
          customActions = customActions || {};
          defaults = angular.extend((defaults || {}), {objectId: '@objectId'});
          var Resource = appResourceFactory(url, defaults, customActions);
          return objectDecorator(Resource, className);
        }
      }
    };

    // user submodule
    parseInterface._user = {
      _userUrl: '/:root/:objectId',
      _userDefaults: {root: 'users', objectId: '@objectId'},
      _userDecorator: function (objectDecorator, Resource, sessionState) {
        Resource = objectDecorator(Resource, '_User');
        Resource._addBlacklistProps('sessionToken', 'emailVerified');
        Resource.signUp = function(username, password, email) {
          var user = this.save({
            username: username,
            password: password,
            email: email
          });
          user.$promise.then(function() {
            var data = {
              sessionToken: user.sessionToken
            };
            delete user.sessionToken;
            eventBus.emit(_SIGN_IN_, data);
          });
          return sessionState.user = user;
        };
        Resource.signIn = function(username, password) {
          var user = this.get({root: 'login', username: username, password: password});
          user.$promise.then(function() {
            var data = {
              sessionToken: user.sessionToken
            };
            delete user.sessionToken;
            eventBus.emit(_SIGN_IN_, data);
          });
          return sessionState.user = user;
        };
        Resource.signOut = function() {
          sessionState.user = null;
          eventBus.emit(_SIGN_OUT_);
        };
        Resource.current = function() {
          var user = this.get({objectId: 'me'});
          user.$promise.then(function() {
            sessionState.sessionToken = user.sessionToken;
            delete user.sessionToken;
          });
          return sessionState.user = user;
        };
        return Resource;
      },
      createUserModule: function (objectDecorator, appResourceFactory, sessionState) {
        var url = this._userUrl,
          defaults = this._userDefaults,
          customActions = {},
          Resource = appResourceFactory(url, defaults, customActions);
        return this._userDecorator(objectDecorator, Resource, sessionState);
      }
    };

    // query submodule
    parseInterface._query = {};
    parseInterface._query._Query = function (obj) {
      this._queryFx = obj.query.bind(obj);
      this._params = {};
    };
    parseInterface._query._Query.prototype.where = function (constraints) {
      this._params.where = constraints;
      return this;
    };
    parseInterface._query._Query.prototype.skip = function (n) {
      this._params.skip = n;
      return this;
    };
    parseInterface._query._Query.prototype.limit = function (n) {
      this._params.limit = n;
      return this;
    };
    parseInterface._query._Query.prototype.keys = function () {
      this._params.keys = angular.isArray(arguments[0]) ? arguments[0] : [].slice.call(arguments);
      return this;
    };
    parseInterface._query._Query.prototype.exec = function () {
      // transform these somehow
      var params = this._params;
      return this._queryFx(params);
    };
    parseInterface._query.createQueryFx = function () {
      var Query = this._Query;
      return function (obj) {
        return new Query(obj);
      };
    };

    // eventBus submodule
    parseInterface._eventBus = {
      createEventBus: function () {
        var $scope = $rootScope.$new(true);
        return {
          on: $scope.$on.bind($scope),
          emit: $scope.$emit.bind($scope)
        };
      }
    };

    parseInterface.createApp = function (appConfig, clientStorage) {
      clientStorage = clientStorage || {};
      clientStorage.parseApp = clientStorage.parseApp || {};
      var appId = appConfig.applicationId;
      var appStorage = (clientStorage.parseApp[appId] = clientStorage.parseApp[appId] || {});

      var appInterface = {};

      var appEventBus = appInterface._eventBus = parseInterface._eventBus.createEventBus();

      appInterface._appResourceFactory = this._resource.createAppResourceFactory($resource, appConfig, appStorage, appEventBus);

      appInterface.objectFactory = this._object.createObjectFactory(appInterface._appResourceFactory);

      appInterface.User = this._user.createUserModule(this._object.objectDecorator, appInterface._appResourceFactory, appStorage);

      appInterface.query = this._query.createQueryFx();

      return appInterface;
    };

    return parseInterface;
  });