angular
  .module('angularParseInterface.queryBuilderMod', [])
  .factory('parseQueryBuilder', function () {
    'use strict';

    var parseQueryBuilder = {};

    var Query = parseQueryBuilder.Query = function (Resource) {
      this._Resource = Resource;
      this._params = {};
    };

    Query.prototype._getConstraints = function () {
      return angular.copy(this._params.where) || {};
    };


//    Query.prototype._setConstraints = function (constraints) {
//      this._params.where = constraints;
//    };

//    Query.prototype._getFieldConstraints = function (fieldName) {
//      var constraints = this._getConstraints();
//      return angular.copy(constraints[fieldName]);
//    };

//    Query.prototype._setFieldConstraints = function (fieldName, val) {
//      var constraints = this._getConstraints();
//      constraints[fieldName] = val;
//      this._setConstraints(constraints);
//    };

//    Query.prototype._isNonArrayObj = function (val) {
//      return angular.isObject(val) && !angular.isArray(val);
//    };

//    // jshint bitwise:false
//    Query.prototype._pick = function (obj, keys) {
//      var newObj = {};
//      angular.forEach(obj, function (v, k) {
//        if (~keys.indexOf(k)) {
//          newObj[k] = v;
//        }
//      });
//      return newObj;
//    };
//    // jshint bitwise:true

//    Query.prototype._setFieldConstraintsKey = function (fieldName, key, val, compatibleKeys) {
//      var fieldConstraints = this._getFieldConstraints(fieldName);
//      fieldConstraints = this._isNonArrayObj(fieldConstraints) ? fieldConstraints : {};
//      fieldConstraints = this._pick(fieldConstraints, compatibleKeys);
//      fieldConstraints[key] = val;
//      this._setFieldConstraints(fieldName, fieldConstraints);
//      return this;
//    };

//    // equalTo
//    Query.prototype.equalTo = function (fieldName, val) {
//      this._setFieldConstraints(fieldName, val);
//      return this;
//    };
    // t0d0: Clean up keys
//    var allKeys = ['$lt', '$lte', '$gt', '$gte', '$ne', '$in', '$nin', '$exists', '$select', '$dontSelect', '$inQuery', '$notInQuery', '$regex', '$all'];

//    // notEqualTo
//    Query.prototype.notEqualTo = function (fieldName, val) {
//      var compatibleConstraints = ['$lt', '$lte', '$gt', '$gte', '$in', '$nin', '$exists', '$select', '$dontSelect', '$inQuery', '$notInQuery', '$regex'];
//      this._setFieldConstraintsKey(fieldName, '$ne', val, compatibleConstraints);
//      return this;
//    };

//    // lessThan
//    Query.prototype.lessThan = function (fieldName, val) {
//      var compatibleConstraints = ['$gt', '$gte', '$ne', '$in', '$nin', '$select', '$dontSelect', '$inQuery', '$notInQuery', '$regex'];
//      this._setFieldConstraintsKey(fieldName, '$lt', val, compatibleConstraints);
//      return this;
//    };
//    // lessThanOrEqualTo
//    Query.prototype.lessThanOrEqualTo = function (fieldName, val) {
//      var compatibleConstraints = ['$gt', '$gte', '$ne', '$in', '$nin', '$select', '$dontSelect', '$inQuery', '$notInQuery', '$regex'];
//      this._setFieldConstraintsKey(fieldName, '$lte', val, compatibleConstraints);
//      return this;
//    };
//    // greaterThan
//    Query.prototype.greaterThan = function (fieldName, val) {
//      var compatibleConstraints = ['$lt', '$lte', '$ne', '$in', '$nin', '$select', '$dontSelect', '$inQuery', '$notInQuery', '$regex'];
//      this._setFieldConstraintsKey(fieldName, '$gt', val, compatibleConstraints);
//      return this;
//    };
//    // greaterThanOrEqualTo
//    Query.prototype.greaterThanOrEqualTo = function (fieldName, val) {
//      var compatibleConstraints = ['$lt', '$lte', '$ne', '$in', '$nin', '$select', '$dontSelect', '$inQuery', '$notInQuery', '$regex'];
//      this._setFieldConstraintsKey(fieldName, '$gte', val, compatibleConstraints);
//      return this;
//    };

//    // containedIn
//    Query.prototype.containedIn = function (fieldName, val) {
//      var compatibleConstraints = ['$gt', '$gte', '$lt', '$lte', '$ne', '$nin', '$select', '$dontSelect', '$inQuery', '$notInQuery', '$regex'];
//      this._setFieldConstraintsKey(fieldName, '$in', val, compatibleConstraints);
//      return this;
//    };
//    // notContainedIn
//    Query.prototype.notContainedIn = function (fieldName, val) {
//      var compatibleConstraints = ['$gt', '$gte', '$lt', '$lte', '$ne', '$in', '$select', '$dontSelect', '$inQuery', '$notInQuery', '$regex'];
//      this._setFieldConstraintsKey(fieldName, '$nin', val, compatibleConstraints);
//      return this;
//    };

//    // exists
//    Query.prototype.exists = function (fieldName) {
//      var compatibleConstraints = ['$ne', '$in', '$nin', '$select', '$dontSelect', '$inQuery', '$notInQuery', '$regex'];
//      this._setFieldConstraintsKey(fieldName, '$exists', true, compatibleConstraints);
//      return this;
//    };
//    // doesNotExist
//    Query.prototype.doesNotExist = function (fieldName) {
//      var compatibleConstraints = [];
//      this._setFieldConstraintsKey(fieldName, '$exists', false, compatibleConstraints);
//      return this;
//    };

//    // startsWith
//    Query.prototype.startsWith = function (fieldName, str) {
//      var compatibleConstraints = ['$lt', '$lte', '$gt', '$gte', '$ne', '$in', '$nin', '$exists', '$select', '$dontSelect', '$inQuery', '$notInQuery'];
//      var regexStr = '^\\Q' + str + '\\E';
//      this._setFieldConstraintsKey(fieldName, '$regex', regexStr, compatibleConstraints);
//      return this;
//    };

//    // Relational
//    // isRelationOf
//    Query.prototype.isRelationOf = function (fieldName, obj) {
//      var constraints = this._getConstraints();
//      constraints.$relatedTo = {
//        object: {
//          __type: 'Pointer',
//          className: obj.className,
//          objectId: obj.objectId
//        },
//        key: fieldName
//      };
//      this._setConstraints(constraints);
//      return this;
//    };
//    // isRelatedTo
//    Query.prototype.isRelatedTo = function (fieldName, obj) {
//      var fieldConstraints = {
//        __type: 'Pointer',
//        className: obj.className,
//        objectId: obj.objectId
//      };
//      this.equalTo(fieldName, fieldConstraints);
//      return this;
//    };

//    // Arrays
//    // contains
//    Query.prototype.contains = function (fieldName, val) {
//      this._setFieldConstraints(fieldName, val);
//      return this;
//    };
//    // containsAll
//    Query.prototype.containsAll = function (fieldName, vals) {
//      var compatibleConstraints = ['$lt', '$lte', '$gt', '$gte', '$ne', '$in', '$nin', '$exists', '$select', '$dontSelect', '$inQuery', '$notInQuery', '$regex'];
//      this._setFieldConstraintsKey(fieldName, '$all', vals, compatibleConstraints);
//      return this;
//    };

//    // matchesQuery
//    Query.prototype.matchesQuery = function (fieldName, query, queryKey) {
//      var compatibleConstraints = ['$lt', '$lte', '$gt', '$gte', '$ne', '$in', '$nin', '$exists', '$select', '$dontSelect', '$notInQuery', '$regex'];
//      queryKey = queryKey || 'objectId';
//      var selectParams = {
//        query: query._yieldParams(),
//        key: queryKey
//      };
//      this._setFieldConstraintsKey(fieldName, '$select', selectParams, compatibleConstraints);
//      return this;
//    };
//    // doesNotMatchQuery
//    Query.prototype.doesNotMatchQuery = function (fieldName, query, queryKey) {
//      var compatibleConstraints = ['$lt', '$lte', '$gt', '$gte', '$ne', '$in', '$nin', '$exists', '$select', '$dontSelect', '$inQuery', '$regex'];
//      queryKey = queryKey || 'objectId';
//      var selectParams = {
//        query: query._yieldParams(),
//        key: queryKey
//      };
//      this._setFieldConstraintsKey(fieldName, '$dontSelect', selectParams, compatibleConstraints);
//      return this;
//    };

//    // Powerful
//    Query.or = function (Resource) {
//      var Query = this;
//      var subQueries = [].slice.call(arguments, 1);
//      var compoundQuery = new Query(Resource);
//      var className = Resource._getClassName();
//      var queryArray = [];
//      angular.forEach(subQueries, function (query) {
//        var subQueryParams = query._yieldParams();
//        if (subQueryParams.className === className) {
//          queryArray.push(subQueryParams.where);
//        }
//      });
//      compoundQuery._setConstraints({'$or': queryArray});
//      return compoundQuery;
//    };

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

//    Query.prototype.skip = function (n) {
//      this._params.skip = n;
//      return this;
//    };
//    Query.prototype.limit = function (n) {
//      this._params.limit = n;
//      return this;
//    };
//    Query.prototype.count = function () {
//      this._params.limit = 0;
//      this._params.count = 1;
//      return this;
//    };
//    Query.prototype.select = function () {
//      this._params.keys = angular.isArray(arguments[0]) ? arguments[0] : [].slice.call(arguments);
//      return this;
//    };

//    // ascending
//    Query.prototype.ascending = function (fieldName) {
//      this._params.order = this._params.order || [];
//      this._params.order.push(fieldName);
//      return this;
//    };
//    // descending
//    Query.prototype.descending = function (fieldName) {
//      this._params.order = this._params.order || [];
//      this._params.order.push('-' + fieldName);
//      return this;
//    };
//    // order
//    Query.prototype.order = function (/* keys */) {
//      this._params.order = angular.isArray(arguments[0]) ? arguments[0] : [].slice.call(arguments);
//      return this;
//    };

//    Query.prototype._yieldParams = function () {
//      var params = angular.copy(this._params);
//      params.order = params.order && params.order.length && params.order.join(',');
//      params.include = params.include && params.include.length && params.include.join(',');
//      params.className = this._Resource._getClassName();
//      return params;
//    };
//    Query.prototype.exec = function () {
//      var params = this._yieldParams();
//      delete params.className;
//      params.where = params.where && JSON.stringify(params.where);
//      return this._Resource.query(params);
//    };

    return parseQueryBuilder;
  });