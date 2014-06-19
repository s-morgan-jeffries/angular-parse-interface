'use strict';

//backburner: Fix the include part of query builder
//d0ne: Figure out how to deal with relations
//t0d0: Close some things up in closures (reduce the amount of testing)
//t0d0: Write tests
//t0d0: Add roles
//t0d0: Add cloud functions
//t0d0: Add files
//t0d0: Beef up the User model (password reset, etc.)

angular.module('angularParseInterface', [
  'ngResource'
])
  // This is the only service the module provides. Everything is encapsulted within it.
  .factory('parseInterface', function($rootScope, $resource, $log) {

    // Events
    var _SIGN_IN_ = 'signin';
    var _SIGN_OUT_ = 'signout';

    var parseInterface = {};

    // resource submodule
    parseInterface._resource = {
      // The url submodule. This provides helpers for putting together the url.
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
      // This is for encoding and decoding data from a Resource instance when it is en route to or from the server.
      // Basically, it's an interpreter between what we use client-side and what Parse uses server-side.
      // Once I've figured out relations, this will probably need some cleanup.
      _dataEncoding: {
        // For determining the type of data going to the server. The canonical source is the Resource's metadata, with
        // several fallbacks available after that.
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
//              Resource._setFieldDataType(fieldName, 'Date');
              return new Date(val.iso);
            }
          },
          Pointer: {
            // This one is a little tricky. It could be a pointer, or it could be an object.
            encode: function (Resource, fieldName, val) {
              var className = Resource._getFieldMetaDataProp(fieldName, 'className'),
                objectId;
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
//          console.log('signing in');
          appStorage.sessionToken = data.sessionToken;
        });
        appEventBus.on(_SIGN_OUT_, function(e, data) {
//          console.log('signing out');
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
                transformRequest: function (data, headersGetter) {
                  return angular.toJson(encodeRequestData(Resource, data));
                }
              },
              // For sending arbitrary data via put requests
              putData: {
                method: 'PUT'
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


          Resource.putData = (function () {
            var putData = Resource.putData;

            return function() {
              var args,
                data,
                instance,
                params,
                successFunc,
                errorFunc;

              // Turn arguments into an actual array
              args = [].slice.call(arguments);
              // Get the data for the put request
              data = find(args, isParams);
              // Figure out which argument is the instance; this has to exist so we can get its objectId
              instance = find(args, isInstance);
              // Create the parameters
              params = {
                objectId: instance.objectId
              };

              // The success function that was passed in, or a do-nothing function if there wasn't one
              successFunc = find(args, angular.isFunction) || angular.noop;
              // The error function that was passed in, or a do-nothing function if there wasn't one
              errorFunc = findLast(args, angular.isFunction) || angular.noop;
              // If the error function is the same as the save function, set errorFunc to angular.noop
              errorFunc = (errorFunc === successFunc) ? angular.noop : errorFunc;

              // Delegate to the original function...
              return putData.call(this, params, data, successFunc, errorFunc);
            };
          }());

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
            return this._metaData || {};
          };

          Resource._setMetaData = function (data) {
            this._metaData = data;
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

          Resource._getClassName = function () {
            return this._getMetaDataProp('className');
          };

          Resource._setClassName = function (val) {
            return this._setMetaDataProp('className', val);
          };

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

          // Blacklist createdAt and updatedAt properties
          Resource._addRequestBlacklistProps('createdAt', 'updatedAt');

          // Relational methods
          // hasOne
          Resource.hasOne = function (fieldName, other) {
            this._setFieldDataType(fieldName, 'Pointer');
            this._setFieldClassName(fieldName, other._getClassName());
            this._setFieldRelationConstructor(fieldName, other);
          };
          // hasMany
          Resource.hasMany = function (fieldName, other) {
            this._setFieldDataType(fieldName, 'Relation');
            this._setFieldClassName(fieldName, other._getClassName());
          };

          // Instance methods
          Resource.prototype.isNew = function() {
            return !this.objectId;
          };
          // className
          Object.defineProperty(Resource.prototype, 'className', {
            get: function () {
              return this.constructor._getClassName();
            }
          });
          // getPointer
          Resource.prototype.getPointer = function() {
            return {
              __type: 'Pointer',
              className: this.className,
              objectId: this.objectId
            };
          };

          // Relational methods
          // setPointer
          Resource.prototype.setPointer = function (fieldName, other) {
            this[fieldName] = other.objectId;
          };
          // addRelations
          Resource.prototype.addRelations = function (fieldName/*, other*/) {
            var relations = angular.isArray(arguments[1]) ? arguments[1] : [].slice.call(arguments, 1),
              data = {};

            data[fieldName] = {
              __op: 'AddRelation',
              objects: []
            };
            angular.forEach(relations, function (o) {
              data[fieldName].objects.push(o.getPointer());
            });

            return this.$putData(data);
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

            return this.$putData(data);
          };

          // Probably not worth using Parse's increment operator
          // increment
          Resource.prototype.increment = function (fieldName, v) {
            this[fieldName] += v;
            return this.$save();
          };
          // decrement
          Resource.prototype.decrement = function (fieldName, v) {
            this[fieldName] -= v;
            return this.$save();
          };

          // deleteField
          Resource.prototype.deleteField = function (fieldName) {
            var data = {},
              self = this;
            data[fieldName] = {
              __op: 'Delete'
            };
            return this.$putData(data).then(function () {
              delete self[fieldName];
            });
          };

          // Security
          Resource.prototype._setPrivileges = function(name, privileges) {
            this.ACL = this.ACL || {};
            this.ACL[name] = this.ACL[name] || {};
            if (privileges.read) {
              this.ACL[name].read = privileges.read;
            }
            if (privileges.write) {
              this.ACL[name].write = privileges.write;
            }
          };
          Resource.prototype.allCanRead = function () {
            this._setPrivileges('*', {read: true});
          };
          Resource.prototype.allCanWrite = function () {
            this._setPrivileges('*', {write: true});
          };
          Resource.prototype.setUserPrivileges = function(user, privileges) {
            this._setPrivileges(user.objectId, privileges);
          };

          return Resource;

        };
      }
    };

    // query submodule
    parseInterface._query = {};

    parseInterface._query.Query = function (Resource) {
      this._Resource = Resource;
      this._params = {};
    };

    parseInterface._query.Query.prototype._getConstraints = function () {
      return angular.copy(this._params.where) || {};
    };

    parseInterface._query.Query.prototype._setConstraints = function (constraints) {
      this._params.where = constraints;
    };

    parseInterface._query.Query.prototype._getFieldConstraints = function (fieldName) {
      var constraints = this._getConstraints();
      return angular.copy(constraints[fieldName]);
    };

    parseInterface._query.Query.prototype._setFieldConstraints = function (fieldName, val) {
      var constraints = this._getConstraints();
      constraints[fieldName] = val;
      this._setConstraints(constraints);
    };

    parseInterface._query.Query.prototype._isNonArrayObj = function (val) {
      return angular.isObject(val) && !angular.isArray(val);
    };

    parseInterface._query.Query.prototype._pick = function (obj, keys) {
      var newObj = {};
      angular.forEach(obj, function(v, k) {
        if (~keys.indexOf(k)) {
          newObj[k] = v;
        }
      });
      return newObj;
    };

    parseInterface._query.Query.prototype._setFieldConstraintsKey = function (fieldName, key, val, compatibleKeys) {
      var fieldConstraints = this._getFieldConstraints(fieldName);
      fieldConstraints = this._isNonArrayObj(fieldConstraints) ? fieldConstraints : {};
      fieldConstraints = this._pick(fieldConstraints, compatibleKeys);
      fieldConstraints[key] = val;
      this._setFieldConstraints(fieldName, fieldConstraints);
      return this;
    };

    // equalTo
    parseInterface._query.Query.prototype.equalTo = function (fieldName, val) {
      this._setFieldConstraints(fieldName, val);
      return this;
    };
    // t0d0: Clean up keys
//    var allKeys = ['$lt', '$lte', '$gt', '$gte', '$ne', '$in', '$nin', '$exists', '$select', '$dontSelect', '$inQuery', '$notInQuery', '$regex', '$all'];

    // notEqualTo
    parseInterface._query.Query.prototype.notEqualTo = function (fieldName, val) {
      var compatibleConstraints = ['$lt', '$lte', '$gt', '$gte', '$in', '$nin', '$exists', '$select', '$dontSelect', '$inQuery', '$notInQuery', '$regex'];
      this._setFieldConstraintsKey(fieldName, '$ne', val, compatibleConstraints);
      return this;
    };

    // lessThan
    parseInterface._query.Query.prototype.lessThan = function (fieldName, val) {
      var compatibleConstraints = ['$gt', '$gte', '$ne', '$in', '$nin', '$select', '$dontSelect', '$inQuery', '$notInQuery', '$regex'];
      this._setFieldConstraintsKey(fieldName, '$lt', val, compatibleConstraints);
      return this;
    };
    // lessThanOrEqualTo
    parseInterface._query.Query.prototype.lessThanOrEqualTo = function (fieldName, val) {
      var compatibleConstraints = ['$gt', '$gte', '$ne', '$in', '$nin', '$select', '$dontSelect', '$inQuery', '$notInQuery', '$regex'];
      this._setFieldConstraintsKey(fieldName, '$lte', val, compatibleConstraints);
      return this;
    };
    // greaterThan
    parseInterface._query.Query.prototype.greaterThan = function (fieldName, val) {
      var compatibleConstraints = ['$lt', '$lte', '$ne', '$in', '$nin', '$select', '$dontSelect', '$inQuery', '$notInQuery', '$regex'];
      this._setFieldConstraintsKey(fieldName, '$gt', val, compatibleConstraints);
      return this;
    };
    // greaterThanOrEqualTo
    parseInterface._query.Query.prototype.greaterThanOrEqualTo = function (fieldName, val) {
      var compatibleConstraints = ['$lt', '$lte', '$ne', '$in', '$nin', '$select', '$dontSelect', '$inQuery', '$notInQuery', '$regex'];
      this._setFieldConstraintsKey(fieldName, '$gte', val, compatibleConstraints);
      return this;
    };

    // containedIn
    parseInterface._query.Query.prototype.containedIn = function (fieldName, val) {
      var compatibleConstraints = ['$gt', '$gte', '$lt', '$lte', '$ne', '$nin', '$select', '$dontSelect', '$inQuery', '$notInQuery', '$regex'];
      this._setFieldConstraintsKey(fieldName, '$in', val, compatibleConstraints);
      return this;
    };
    // notContainedIn
    parseInterface._query.Query.prototype.notContainedIn = function (fieldName, val) {
      var compatibleConstraints = ['$gt', '$gte', '$lt', '$lte', '$ne', '$in', '$select', '$dontSelect', '$inQuery', '$notInQuery', '$regex'];
      this._setFieldConstraintsKey(fieldName, '$nin', val, compatibleConstraints);
      return this;
    };

    // exists
    parseInterface._query.Query.prototype.exists = function (fieldName) {
      var compatibleConstraints = ['$ne', '$in', '$nin', '$select', '$dontSelect', '$inQuery', '$notInQuery', '$regex'];
      this._setFieldConstraintsKey(fieldName, '$exists', true, compatibleConstraints);
      return this;
    };
    // doesNotExist
    parseInterface._query.Query.prototype.doesNotExist = function (fieldName) {
      var compatibleConstraints = [];
      this._setFieldConstraintsKey(fieldName, '$exists', false, compatibleConstraints);
      return this;
    };

    // startsWith
    parseInterface._query.Query.prototype.startsWith = function (fieldName, str) {
      var compatibleConstraints = ['$lt', '$lte', '$gt', '$gte', '$ne', '$in', '$nin', '$exists', '$select', '$dontSelect', '$inQuery', '$notInQuery'];
      var regexStr = '^\\Q' + str + '\\E';
      this._setFieldConstraintsKey(fieldName, '$regex', regexStr, compatibleConstraints);
      return this;
    };

    // Relational
    // isRelationOf
    parseInterface._query.Query.prototype.isRelationOf = function (fieldName, obj) {
      var constraints = this._getConstraints();
      constraints['$relatedTo'] = {
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
    parseInterface._query.Query.prototype.isRelatedTo = function (fieldName, obj) {
      var fieldConstraints = {
        __type: 'Pointer',
        className: obj.className,
        objectId: obj.objectId
      };
      this.equalTo(fieldName, fieldConstraints);
      return this;
    };

    // Arrays
    // contains
    parseInterface._query.Query.prototype.contains = function (fieldName, val) {
      this._setFieldConstraints(fieldName, val);
      return this;
    };
    // containsAll
    parseInterface._query.Query.prototype.containsAll = function (fieldName, vals) {
      var compatibleConstraints = ['$lt', '$lte', '$gt', '$gte', '$ne', '$in', '$nin', '$exists', '$select', '$dontSelect', '$inQuery', '$notInQuery', '$regex'];
      this._setFieldConstraintsKey(fieldName, '$all', vals, compatibleConstraints);
      return this;
    };

    // matchesQuery
    parseInterface._query.Query.prototype.matchesQuery = function (fieldName, query, queryKey) {
      var compatibleConstraints = ['$lt', '$lte', '$gt', '$gte', '$ne', '$in', '$nin', '$exists', '$select', '$dontSelect', '$notInQuery', '$regex'];
      queryKey = queryKey || 'objectId';
      var selectParams = {
        query: query._yieldParams(),
        key: queryKey
      };
      this._setFieldConstraintsKey(fieldName, '$select', selectParams, compatibleConstraints);
      return this;
    };
    // doesNotMatchQuery
    parseInterface._query.Query.prototype.doesNotMatchQuery = function (fieldName, query, queryKey) {
      var compatibleConstraints = ['$lt', '$lte', '$gt', '$gte', '$ne', '$in', '$nin', '$exists', '$select', '$dontSelect', '$inQuery', '$regex'];
      queryKey = queryKey || 'objectId';
      var selectParams = {
        query: query._yieldParams(),
        key: queryKey
      };
      this._setFieldConstraintsKey(fieldName, '$dontSelect', selectParams, compatibleConstraints);
      return this;
    };

    // Powerful
    parseInterface._query.Query.or = function (Resource) {
      var Query = this;
      var subQueries = [].slice.call(arguments, 1);
      var compoundQuery = new Query(Resource);
      var className = Resource._getClassName();
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
//    parseInterface._query.Query.prototype.include = function (/* relations */) {
//      var args = angular.isArray(arguments[0]) ? arguments[0] : [].slice.call(arguments);
//      // Need to filter that list according to which are known pointers
//      var includedFields = this._params.include || [];
//      var Resource = this._Resource;
//      var isIncludable = function (fieldName) {
//        return angular.equals(Resource._getFieldDataType(fieldName), 'Pointer') &&
//          !!Resource._getFieldClassName(fieldName) &&
//          !!Resource._getFieldRelationConstructor(fieldName);
//      };
//      angular.forEach(args, function(val, idx) {
////        if (isIncludable(val)) {
//          includedFields.push(val);
////        } else {
////          $log.warn('Cannot include a field without a known constructor');
////        }
//      });
//      this._params.include = includedFields;
//      return this;
//    };

    parseInterface._query.Query.prototype.skip = function (n) {
      this._params.skip = n;
      return this;
    };
    parseInterface._query.Query.prototype.limit = function (n) {
      this._params.limit = n;
      return this;
    };
    parseInterface._query.Query.prototype.count = function () {
      this._params.limit = 0;
      this._params.count = 1;
      return this;
    };
    parseInterface._query.Query.prototype.select = function () {
      this._params.keys = angular.isArray(arguments[0]) ? arguments[0] : [].slice.call(arguments);
      return this;
    };

    // ascending
    parseInterface._query.Query.prototype.ascending = function (fieldName) {
      this._params.order = this._params.order || [];
      this._params.order.push(fieldName);
      return this;
    };
    // descending
    parseInterface._query.Query.prototype.descending = function (fieldName) {
      this._params.order = this._params.order || [];
      this._params.order.push('-' + fieldName);
      return this;
    };
    // order
    parseInterface._query.Query.prototype.order = function (/* keys */) {
      this._params.order = angular.isArray(arguments[0]) ? arguments[0] : [].slice.call(arguments);
      return this;
    };

    parseInterface._query.Query.prototype._yieldParams = function () {
      var params = angular.copy(this._params);
      params.order = params.order && params.order.length && params.order.join(',');
      params.include = params.include && params.include.length && params.include.join(',');
      params.className = this._Resource._getClassName();
      return params;
    };
    parseInterface._query.Query.prototype.exec = function () {
      var params = this._yieldParams();
      delete params.className;
      params.where = params.where && JSON.stringify(params.where);
      return this._Resource.query(params);
    };

    // object submodule
    parseInterface._object = {
      _objectUrl: function (className) {
        return '/classes/' + className + '/:objectId';
      },
      createObjectFactory: function (appResourceFactory) {
        var objectUrl = this._objectUrl,
          objectDecorator = this.objectDecorator;
        return function (className, defaults, customActions) {
          var url = objectUrl(className);
          customActions = customActions || {};
          defaults = angular.extend((defaults || {}), {objectId: '@objectId'});
          var Resource = appResourceFactory(url, defaults, customActions);
          Resource._setClassName(className);
          return Resource;
        }
      }
    };

    // user submodule
    parseInterface._user = {
      _userUrl: '/:urlRoot/:objectId',
      _userDefaults: {urlRoot: 'users', objectId: '@objectId'},
      _userDecorator: function (/*objectDecorator,*/ Resource, appStorage, appEventBus) {
//        Resource = objectDecorator(Resource, '_User');
        Resource._setClassName('_User');
//        return Resource;
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
            appEventBus.emit(_SIGN_IN_, data);
          });
          return appStorage.user = user;
        };

        Resource.signIn = function(username, password) {
          var user = this.get({urlRoot: 'login', username: username, password: password});
          user.$promise.then(function() {
            var data = {
              sessionToken: user.sessionToken
            };
            delete user.sessionToken;
            appEventBus.emit(_SIGN_IN_, data);
          });
          return appStorage.user = user;
        };

        Resource.signOut = function() {
          delete appStorage.user;
          appEventBus.emit(_SIGN_OUT_);
        };

        Resource.current = function() {
          var user = appStorage.user;
          if (!user) {
            user = this.get({objectId: 'me'});
            user.$promise.then(function() {
              appStorage.sessionToken = user.sessionToken;
              delete user.sessionToken;
            });
            appStorage.user = user;
          }
          return user;
        };

        return Resource;
      },
      createUserModule: function (appResourceFactory, appStorage, appEventBus) {
        var url = this._userUrl,
          defaults = this._userDefaults,
          customActions = {},
          Resource = appResourceFactory(url, defaults, customActions);
        return this._userDecorator(Resource, appStorage, appEventBus);
      }
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

      var appInterface = {};

      var appStorage = appInterface._appStorage = (clientStorage.parseApp[appId] = clientStorage.parseApp[appId] || {});

      var appEventBus = appInterface._eventBus = parseInterface._eventBus.createEventBus();

      appInterface._appResourceFactory = this._resource.createAppResourceFactory($resource, appConfig, appStorage, appEventBus);

      appInterface.objectFactory = this._object.createObjectFactory(appInterface._appResourceFactory);

      appInterface.User = this._user.createUserModule(appInterface._appResourceFactory, appStorage, appEventBus);

      appInterface.Query = this._query.Query;

      return appInterface;
    };

    return parseInterface;
  });