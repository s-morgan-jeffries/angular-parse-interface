angular
  .module('angularParseInterface.queryBuilderMod', [
    'angularParseInterface.configMod'
  ])
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