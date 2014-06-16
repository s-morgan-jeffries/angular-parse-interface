'use strict';

//t0d0: Finish query builder
//t0d0: Figure out how to deal with relations
//t0d0: Clean up the User model
//t0d0: Close some things up in closures (reduce the amount of testing)
//t0d0: Write tests

angular.module('angularParseInterface', [
  'ngResource'
])
  .factory('parseInterface', function($rootScope, $resource, $log) {

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
//          console.log(fieldName);
//          console.log(val);
//          console.log(val && val.__type);
          var dataType = Resource._getFieldDataType(fieldName) || (val && val.__type) || typeof val;
          return dataType[0].toUpperCase() + dataType.slice(1);
        },
        _classOfResponseData: function (Resource, fieldName, val) {
          return val && val.className;
        },
        _isBlacklisted: function (Resource, fieldName) {
          return Resource._isRequestBlacklisted(fieldName);
        },
        // Need to add Bytes, Pointer, and Relation
        _codecs: {
          Date: {
            encode: function (Resource, fieldName, val) {
              return {
                __type: 'Date',
                iso: val.toISOString()
              };
            },
            decode: function (Resource, fieldName, val) {
              Resource._setFieldDataType(fieldName, 'Date');
              return new Date(val.iso);
            }
          },
          Pointer: {
            // This one is a little tricky. It could be a pointer, or it could be an object.
            encode: function (Resource, fieldName, val) {
              var objectId;
              if (angular.isObject(val)) {
                $log.warn('Objects in Pointer fields will not be automatically persisted; only their objectIds will be' +
                  'saved. If you want to save other data from those objects, you\'ll need to do so separately.');
                objectId = val.objectId;
                if (!objectId) {
                  $log.warn('No objectId found for object in Pointer field ' + fieldName + '. Try saving it first.');
                }
              } else if (angular.isString(val)) {
                objectId = val;
              } else {
                $log.warn('Could not find an objectId for Pointer field ' + fieldName +
                  '. Value in field should either be a string or an object.');
              }
              return {
                __type: 'Pointer',
                className: className,
                objectId: objectId
              };
            },
            // Could be getting a few things here:
            // 1) a pointer
            //    Just return the objectId
            // 2) an object for which we have a constructor
            //    Return the constructed object
            // 3) an object for which we don't have a constructor
            //    Just return the objectId (for now)
            decode: function (Resource, fieldName, val) {
              var isPointer = val.__type && val.__type === 'Pointer';
              if (!isPointer) {
                var valContructor = Resource._getFieldRelationConstructor(fieldName);
                if (valContructor) {
                  return new valContructor(val);
                }
              }
              return val.objectId;
            }
          }
        },
        _getEncoder: function (dataType) {
          var codecs = this._codecs;
          return (codecs[dataType] && codecs[dataType].encode) || function (Resource, key, val) {return val;};
        },
        _getDecoder: function (dataType) {
          var codecs = this._codecs;
          return (codecs[dataType] && codecs[dataType].decode) || function (Resource, key, val) {return val;};
        },
        encodeRequestData: function (Resource, data) {
          var isBlacklisted = this._isBlacklisted,
            typeOf = this._typeOfRequestData,
//            classOf = this._classOfRequestData,
            getEncoder = this._getEncoder.bind(this),
            encodedData = {};
          angular.forEach(data, function (val, key) {
            var encoder;
            if (!isBlacklisted(Resource, key)) {
              encoder = getEncoder(typeOf(Resource, key, val));
              encodedData[key] = encoder(Resource, key, data[key]);
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
            decodedData[key] = decoder(Resource, key, data[key]);
//            console.log(key);
//            console.log(val);
//            console.log(typeOf(Resource, key, val));
//            console.log(decoder);
//            console.log(decodedData[key]);
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
            actions,
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
                  var results = angular.fromJson(data).results;
                  if (!results) {
                    return [];
                  }
                  return angular.forEach(results, function(item, idx, col) {
                    col[idx] = new Resource(decodeResponseData(Resource, item));
                  });
                }
              },
              count: {
                method:'GET',
                isArray: false,
                transformResponse: function(data) {
                  var count = angular.fromJson(data).count;
//                  return {count: angular.isNumber(count) ? count : null};
                  return {count: count};
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
            };

          actions = angular.extend(baseActions, (customActions || {}));

          addParseRequestHeaders(actions, appConfig, appStorage);

          url = prependBaseUrl(url);

          Resource = baseResourceFactory(url, defaults, actions);


          var isInstance = function(obj, idx, col) {
            return obj instanceof Resource;
          };

          var isParams = function(obj, idx, col) {
            return (typeof obj === 'object') && !isInstance(obj);
          };

          var find = function (ar, pred) {
            for (var i = 0, len = ar.length; i<len; i++) {
              if (pred(ar[i])) {
                return ar[i];
              }
            }
          };

          var findLast = function (ar, pred) {
            return find(angular.copy(ar).reverse(), pred);
          };

          var setDefaults = function (dst, src) {
            angular.forEach(src, function (val, key) {
              dst[key] = dst[key] || src[key];
            });
            return dst;
          };

          var ownDataProps = function (obj) {
            var objData = {};
            angular.forEach(obj, function (val, key) {
              if (!angular.isFunction(val)) {
                objData[key] = val;
              }
            });
            return objData;
          };

          Resource.query = (function () {
            var query = Resource.query,
              count = Resource.count;

            delete Resource.count;
            delete Resource.prototype.$count;

            return function() {
              var args,
                params,
                isCountQuery,
                queryFx;

              // Turn arguments into an actual array
              args = [].slice.call(arguments);
              // Get the parameters we're saving (or an empty object)
              params = find(args, isParams) || {};
              isCountQuery = angular.equals(params.count, 1);

              queryFx = isCountQuery ? count : query;
              // Delegate to the original function...
              return queryFx.apply(this, args);
            };
          }());

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

              // Turn arguments into an actual array
              args = [].slice.call(arguments);
              // Get the parameters we're saving (or an empty object)
              params = find(args, isParams) || {};
              // Figure out which argument is the instance and create one if it doesn't exist
              instance = find(args, isInstance) || new Resource(params);
              // These are all the the own properties that aren't methods
              originalInstanceProps = ownDataProps(instance);
              // originalInstanceProps extended with the params (where there's a conflict, params will overwrite
              // originalInstanceProps)
              updatedInstanceProps = angular.extend(originalInstanceProps, params);

              // The success function that was passed in, or a do-nothing function if there wasn't one
              successFunc = find(args, angular.isFunction) || angular.noop;
              // Provide updatedInstanceProps as default values to the new instance (if there are conflicting
              // properties from the server, those will win)
              wrappedSuccessFunc = function(newInstance, responseHeaders) {
                setDefaults(newInstance, updatedInstanceProps);
                successFunc(newInstance, responseHeaders);
              };
              // The error function that was passed in, or a do-nothing function if there wasn't one
              errorFunc = findLast(args, angular.isFunction) || angular.noop;
              // If the error function is the same as the save function, set errorFunc to angular.noop
              errorFunc = (errorFunc === successFunc) ? angular.noop : errorFunc;
              // In case there's a problem, this basically resets the instance
              wrappedErrorFunc = function(response) {
                angular.extend(instance, originalInstanceProps);
                errorFunc(response);
              };

              // Delegate to the correct function depending on whether this is a creation or update
              saveFunc = instance.isNew() ? create : update;
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

          Resource._getClassName = function () {
            return this._getMetaDataProp('className');
          };

          Resource._setClassName = function (val) {
            return this._setMetaDataProp('className', val);
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

          Resource._getFieldClassName = function (fieldName) {
            return this._getFieldMetaDataProp(fieldName, 'className');
          };

          Resource._setFieldClassName = function (fieldName, val) {
            this._setFieldMetaDataProp(fieldName, 'className', val);
          };

          Resource._getFieldRelationConstructor = function (fieldName) {
            return this._getFieldMetaDataProp(fieldName, 'relationConstructor');
          };

          Resource._setFieldRelationConstructor = function (fieldName, val) {
            return this._setFieldMetaDataProp(fieldName, 'relationConstructor', val);
          };

          Resource._addRequestBlacklistProp = function (fieldName) {
            this._setFieldMetaDataProp(fieldName, 'isRequestBlacklisted', true);
          };

          Resource._addRequestBlacklistProps = function () {
            var props = angular.isArray(arguments[0]) ? arguments[0] : [].slice.call(arguments);
            var addBlacklistProp = this._addRequestBlacklistProp.bind(this);
            angular.forEach(props, addBlacklistProp);
          };

          Resource._isRequestBlacklisted = function (fieldName) {
            return !!this._getFieldMetaDataProp(fieldName, 'isRequestBlacklisted');
          };

          // Relational methods
          Resource.hasOne = function (fieldName, other) {
            this._setFieldDataType(fieldName, 'Pointer');
            this._setFieldClassName(fieldName, other._getClassName());
            this._setFieldRelationConstructor(fieldName, other);
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
        Resource._addRequestBlacklistProps('createdAt', 'updatedAt');
        Resource._setClassName(className);
        Object.defineProperty(Resource.prototype, '_className', {
          get: function () {
            return this.constructor._getClassName();
          }
        });
//        Resource.prototype.getPointer = function() {
//          return {
//            __type: 'Pointer',
//            className: this._className,
//            objectId: this.objectId
//          };
//        };

//        Resource.prototype.setUserPriveleges = function(user, canRead, canWrite) {
//          this.ACL = this.ACL || {};
//          this.ACL[user.objectId] = {
//            read: canRead,
//            write: canWrite
//          };
//        };
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
        Resource._addRequestBlacklistProps('sessionToken', 'emailVerified');
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
      createUserModule: function (objectDecorator, appResourceFactory, appStore) {
        var url = this._userUrl,
          defaults = this._userDefaults,
          customActions = {},
          Resource = appResourceFactory(url, defaults, customActions);
        return this._userDecorator(objectDecorator, Resource, appStore);
      }
    };

    // query submodule
    parseInterface._query = {};
    parseInterface._query._QueryContraints = function (query) {
      this._query = query;
      this._contraints = {};
    };
    parseInterface._query._QueryContraints.prototype.setWhere = function () {
      var query = this._query,
        constraints = this._contraints;
//      query._setWhere(constraints);
      return query._setWhere(constraints);
    };
    parseInterface._query._Query = function (Resource) {
      this._Resource = Resource;
//      this._queryFx = Resource.query.bind(Resource);
      this._params = {};
    };
    parseInterface._query._Query.prototype.where = function () {
      var QueryContraints = parseInterface._query._QueryContraints;
      return new QueryContraints(this);
    };
    parseInterface._query._Query.prototype._setWhere = function (constraints) {
      this._params.where = constraints;
      return this;
    };
    // This is for the next version
    parseInterface._query._Query.prototype.include = function (/* relations */) {
      var args = angular.isArray(arguments[0]) ? arguments[0] : [].slice.call(arguments);
      // Need to filter that list according to which are known pointers
      var includedFields = this._params.include || [];
      var Resource = this._Resource;
      var isIncludable = function (fieldName) {
        return angular.equals(Resource._getFieldDataType(fieldName), 'Pointer') &&
          !!Resource._getFieldClassName(fieldName) &&
          !!Resource._getFieldRelationConstructor(fieldName);
      };
      angular.forEach(args, function(val, idx) {
        if (isIncludable(val)) {
          includedFields.push(val);
        } else {
          $log.warn('Cannot include a field without a known constructor');
        }
      });
      this._params.include = includedFields;
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
    parseInterface._query._Query.prototype.count = function () {
      this._params.limit = 0;
      this._params.count = 1;
      return this;
    };
    parseInterface._query._Query.prototype.select = function () {
      this._params.keys = angular.isArray(arguments[0]) ? arguments[0] : [].slice.call(arguments);
      return this;
    };
    parseInterface._query._Query.prototype.order = function (/* keys */) {
      this._params.order = angular.isArray(arguments[0]) ? arguments[0] : [].slice.call(arguments);
      return this;
    };
    parseInterface._query._Query.prototype.exec = function () {
      var params = angular.copy(this._params);
      // This needs to be serialized here, since angular.toJson will remove anything with a leading `$`
      params.where = params.where && JSON.stringify(params.where);
      params.order = params.order && params.order.length && params.order.join(',');
      params.include = params.include && params.include.length && params.include.join(',');
      return this._Resource.query(params);
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