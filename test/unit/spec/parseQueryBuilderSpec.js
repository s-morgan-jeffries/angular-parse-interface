'use strict';

// t0d0: Go over the parseQueryBuilderSpec and make sure you're using spies in the correct places
describe('Factory: parseQueryBuilder', function () {
  var parseQueryBuilder;

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

  beforeEach(function () {
    module('angularParseInterface', function (/*$provide*/) {
//      $provide.value('$rootScope', mockRootScope);
    });
    inject(function ($injector) {
      parseQueryBuilder = $injector.get('parseQueryBuilder');
    });
  });

  it('should have a Query constructor function', function () {
    expect(parseQueryBuilder.Query).toBeFunction();
  });

  describe('Query constructor', function () {
    var Query,
      query,
      mockResource,
      constraints,
      dummyConstraints,
      allConstraints,
      fieldName,
      key,
      val;

    beforeEach(function () {
      Query = parseQueryBuilder.Query;
      mockResource = {
        query: function () {},
        className: 'SomeClass'
      };
      query = new Query(mockResource);
      allConstraints = {
        '$lt': 1,
        '$lte': 2,
        '$gt': 3,
        '$gte': 4,
        '$ne': 5,
        '$in': 6,
        '$nin': 7,
        '$exists': 8,
        '$select': 9,
        '$dontSelect': 10,
        '$inQuery': 11,
        '$notInQuery': 12,
        '$regex': 13,
        '$all': 14
      };
    });

    it('should assign the Resource argument to its _Resource property', function () {
      var Resource = query._Resource;
      expect(Resource).toEqual(mockResource);
    });

    it('should initialize its _params property to an empty object', function () {
      var params = query._params;
      expect(params).toBeObject();
      expect(params).toEqual({});
    });

    describe('or method', function () {
      var subQuery1, subQuery2, subQuery3, compoundQuery, mockResource2;

      beforeEach(function () {
        subQuery1 = new Query(mockResource);
        subQuery2 = new Query(mockResource);
      });

      it('should return an instance of Query', function () {
        compoundQuery = Query.or(mockResource, subQuery1, subQuery2);
        expect(compoundQuery instanceof Query).toBeTrue();
      });

      it('should set the $or key on the compound query\'s constraints object to an array', function () {
        compoundQuery = Query.or(mockResource, subQuery1, subQuery2);
        expect(compoundQuery._params.where.$or).toBeArray();
      });

      it('should fill the $or array with the constraints from its subqueries', function () {
        var orArray;
        compoundQuery = Query.or(mockResource, subQuery1, subQuery2);
        orArray = compoundQuery._params.where.$or;
        expect(orArray).toEqual([subQuery1._params.where, subQuery2._params.where]);
      });

      it('should exclude any passed in subqueries that don\'t match the passed in Resource\'s className', function () {
        var orArray,
          constrainsts1,
          constrainsts2,
          constrainsts3,
          contains = function (ar, val) {
            for (var i = 0, len = ar.length; i < len; i++) {
              if (angular.equals(ar[i], val)) {
                return true;
              }
            }
            return false;
          };

        mockResource2 = {
          className: 'SomeOtherClass'
        };
        subQuery3 = new Query(mockResource2);
        constrainsts1 = subQuery1._params.where = {a: 1, b: 2};
        constrainsts2 = subQuery2._params.where = {c: 3, d: 4};
        constrainsts3 = subQuery3._params.where = {e: 5, f: 6};
        compoundQuery = Query.or(mockResource, subQuery1, subQuery2, subQuery3);
        orArray = compoundQuery._params.where.$or;
        expect(contains(orArray, constrainsts1)).toBeTrue();
        expect(contains(orArray, constrainsts2)).toBeTrue();
        expect(contains(orArray, constrainsts3)).toBeFalse();
      });
    });

    describe('instance', function () {

      describe('_getConstraints method', function () {
        it('should return the Query instance\'s where param, if defined, or an empty object', function () {
          dummyConstraints = {a: 1, b: 2};
          constraints = query._getConstraints();
          expect(constraints).toEqual({});
          query._params.where = dummyConstraints;
          constraints = query._getConstraints();
          expect(constraints).toEqual(dummyConstraints);
        });
      });

      describe('_setConstraints method', function () {
        it('should set the Query instance\'s where param value', function () {
          dummyConstraints = {a: 1, b: 2};
          query._setConstraints(dummyConstraints);
          constraints = query._params.where;
          expect(constraints).toEqual(dummyConstraints);
        });
      });

      describe('_getFieldConstraints method', function () {
        it('should return the constraints for the specified fieldName, if defined, or an empty object', function () {
          dummyConstraints = {a: 1, b: 2};
          fieldName = 'foo';
          constraints = query._getFieldConstraints(fieldName);
          expect(constraints).toEqual({});
          query._params.where = {};
          query._params.where[fieldName] = dummyConstraints;
          constraints = query._getFieldConstraints(fieldName);
          expect(constraints).toEqual(dummyConstraints);
        });
      });

      describe('_setFieldConstraints method', function () {
        it('should set the constraints for the specified fieldName', function () {
          dummyConstraints = {a: 1, b: 2};
          fieldName = 'foo';
          query._setFieldConstraints(fieldName, dummyConstraints);
          constraints = query._params.where[fieldName];
          expect(constraints).toEqual(dummyConstraints);
        });
      });

      describe('_setFieldConstraintsKey method', function () {
        it('should set the specified key on the constraints for the specified fieldName', function () {
          var key, incompatibleConstraints;
          dummyConstraints = {a: 1, b: 2};
          fieldName = 'foo';
          key = 'bar';
          incompatibleConstraints = [];
          query._setFieldConstraintsKey(fieldName, key, dummyConstraints, incompatibleConstraints);
          constraints = query._params.where[fieldName][key];
          expect(constraints).toEqual(dummyConstraints);
        });

        it('should remove any incompatible constraints from the constraints object', function () {
          var key, val, incompatibleKeys, compatibleKeys;
          dummyConstraints = {a: 1, b: 2, c: 3, d: 4};
          fieldName = 'foo';
          key = 'bar';
          val = 'a value';
          incompatibleKeys = ['c', 'd'];
          // The expected keys in the constraints object are the current key and the ones we haven't blacklisted
          compatibleKeys = [key];
          for (var k in dummyConstraints) {
            if (dummyConstraints.hasOwnProperty(k) && (incompatibleKeys.indexOf(k) < 0)) {
              compatibleKeys.push(k);
            }
          }
          // Set the constraints for the field
          query._setFieldConstraints(fieldName, dummyConstraints);
          // This just checks that the preceding line worked
          expect(query._getFieldConstraints(fieldName)).toEqual(dummyConstraints);
          // Now set this key on the field constraints
          query._setFieldConstraintsKey(fieldName, key, val, {incompatibleKeys: incompatibleKeys});
          // Get the new field constraints
          constraints = query._getFieldConstraints(fieldName);
          expect(hasExpectedKeys(constraints, compatibleKeys)).toBeTrue();
        });

        it('should leave any compatible constraints from the constraints object', function () {
          var key, val, incompatibleKeys, compatibleKeys;
          dummyConstraints = {a: 1, b: 2, c: 3, d: 4};
          fieldName = 'foo';
          key = 'bar';
          val = 'a value';
          incompatibleKeys = ['c', 'd'];
          // The expected keys in the constraints object are the current key and the ones we haven't blacklisted
          compatibleKeys = [key];
          for (var k in dummyConstraints) {
            if (dummyConstraints.hasOwnProperty(k) && (incompatibleKeys.indexOf(k) < 0)) {
              compatibleKeys.push(k);
            }
          }
          // Set the constraints for the field
          query._setFieldConstraints(fieldName, dummyConstraints);
          // This just checks that the preceding line worked
          expect(query._getFieldConstraints(fieldName)).toEqual(dummyConstraints);
          // Now set this key on the field constraints
          query._setFieldConstraintsKey(fieldName, key, val, {compatibleKeys: compatibleKeys});
          // Get the new field constraints
          constraints = query._getFieldConstraints(fieldName);
          expect(hasExpectedKeys(constraints, compatibleKeys)).toBeTrue();
        });
      });

      describe('equalTo method', function () {
        it('should set the constraints for the given fieldName to the given value', function () {
          fieldName = 'foo';
          val = 'a value';
          query.equalTo(fieldName, val);
          constraints = query._getFieldConstraints(fieldName);
          expect(constraints).toEqual(val);
        });
      });

      describe('notEqualTo method', function () {
        it('should set the $ne key on the field constraints object', function () {
          fieldName = 'foo';
          key = '$ne';
          val = 'a value';
          // Call the method
          query.notEqualTo(fieldName, val);
          // Check to see that the key was set correctly
          constraints = query._getFieldConstraints(fieldName);
          expect(constraints[key]).toEqual(val);
        });

        it('should remove incompatible keys from the field constraints object', function () {
          var blacklistKeys = ['$all'],
            nonBlacklistKeys = [],
            allKeys = [];
          dummyConstraints = angular.copy(allConstraints);
          for (var k in dummyConstraints) {
            allKeys.push(k);
            if (blacklistKeys.indexOf(k) < 0) {
              nonBlacklistKeys.push(k);
            }
          }
          fieldName = 'foo';
          val = 'a value';
          // Set the field constraints
          query._setFieldConstraints(fieldName, dummyConstraints);
          // Make sure they start out with all the keys
          constraints = query._getFieldConstraints(fieldName);
          angular.forEach(allKeys, function(k) {
            expect(constraints[k]).toBeDefined();
          });
          // Call the method
          query.notEqualTo(fieldName, val);
          // Make sure the blacklisted keys were removed
          constraints = query._getFieldConstraints(fieldName);
          angular.forEach(blacklistKeys, function(k) {
            expect(constraints[k]).toBeUndefined();
          });
          // Make sure all the other keys remain
          angular.forEach(nonBlacklistKeys, function(k) {
            expect(constraints[k]).toBeDefined();
          });
        });
      });

      describe('lessThan method', function () {
        it('should set the $lt key on the field constraints object', function () {
          fieldName = 'foo';
          key = '$lt';
          val = 5;
          // Call the method
          query.lessThan(fieldName, val);
          // Check to see that the key was set correctly
          constraints = query._getFieldConstraints(fieldName);
          expect(constraints[key]).toEqual(val);
        });

        it('should remove incompatible keys from the field constraints object', function () {
          var blacklistKeys = ['$lte', '$all'],
            nonBlacklistKeys = [],
            allKeys = [];
          dummyConstraints = angular.copy(allConstraints);
          for (var k in dummyConstraints) {
            allKeys.push(k);
            if (blacklistKeys.indexOf(k) < 0) {
              nonBlacklistKeys.push(k);
            }
          }
          fieldName = 'foo';
          val = 'a value';
          // Set the field constraints
          query._setFieldConstraints(fieldName, dummyConstraints);
          // Make sure they start out with all the keys
          constraints = query._getFieldConstraints(fieldName);
          angular.forEach(allKeys, function(k) {
            expect(constraints[k]).toBeDefined();
          });
          // Call the method
          query.lessThan(fieldName, val);
          // Make sure the blacklisted keys were removed
          constraints = query._getFieldConstraints(fieldName);
          angular.forEach(blacklistKeys, function(k) {
            expect(constraints[k]).toBeUndefined();
          });
          // Make sure all the other keys remain
          angular.forEach(nonBlacklistKeys, function(k) {
            expect(constraints[k]).toBeDefined();
          });
        });
      });

      describe('lessThanOrEqualTo method', function () {
        it('should set the $lte key on the field constraints object', function () {
          fieldName = 'foo';
          key = '$lte';
          val = 5;
          // Call the method
          query.lessThanOrEqualTo(fieldName, val);
          // Check to see that the key was set correctly
          constraints = query._getFieldConstraints(fieldName);
          expect(constraints[key]).toEqual(val);
        });

        it('should remove incompatible keys from the field constraints object', function () {
          var blacklistKeys = ['$lt', '$all'],
            nonBlacklistKeys = [],
            allKeys = [];
          dummyConstraints = angular.copy(allConstraints);
          for (var k in dummyConstraints) {
            allKeys.push(k);
            if (blacklistKeys.indexOf(k) < 0) {
              nonBlacklistKeys.push(k);
            }
          }
          fieldName = 'foo';
          val = 'a value';
          // Set the field constraints
          query._setFieldConstraints(fieldName, dummyConstraints);
          // Make sure they start out with all the keys
          constraints = query._getFieldConstraints(fieldName);
          angular.forEach(allKeys, function(k) {
            expect(constraints[k]).toBeDefined();
          });
          // Call the method
          query.lessThanOrEqualTo(fieldName, val);
          // Make sure the blacklisted keys were removed
          constraints = query._getFieldConstraints(fieldName);
          angular.forEach(blacklistKeys, function(k) {
            expect(constraints[k]).toBeUndefined();
          });
          // Make sure all the other keys remain
          angular.forEach(nonBlacklistKeys, function(k) {
            expect(constraints[k]).toBeDefined();
          });
        });
      });

      describe('greaterThan method', function () {
        var method, blacklistKeys;

        beforeEach(function () {
          method = 'greaterThan';
          blacklistKeys = ['$gte', '$all'];
          key = '$gt';
        });

        it('should set the $gt key on the field constraints object', function () {
          fieldName = 'foo';
          val = 5;
          // Call the method
          query[method](fieldName, val);
          // Check to see that the key was set correctly
          constraints = query._getFieldConstraints(fieldName);
          expect(constraints[key]).toEqual(val);
        });

        it('should remove incompatible keys from the field constraints object', function () {
          var nonBlacklistKeys = [],
            allKeys = [];
          dummyConstraints = angular.copy(allConstraints);
          for (var k in dummyConstraints) {
            allKeys.push(k);
            if (blacklistKeys.indexOf(k) < 0) {
              nonBlacklistKeys.push(k);
            }
          }
          fieldName = 'foo';
          val = 'a value';
          // Set the field constraints
          query._setFieldConstraints(fieldName, dummyConstraints);
          // Make sure they start out with all the keys
          constraints = query._getFieldConstraints(fieldName);
          angular.forEach(allKeys, function(k) {
            expect(constraints[k]).toBeDefined();
          });
          // Call the method
          query[method](fieldName, val);
          // Make sure the blacklisted keys were removed
          constraints = query._getFieldConstraints(fieldName);
          angular.forEach(blacklistKeys, function(k) {
            expect(constraints[k]).toBeUndefined();
          });
          // Make sure all the other keys remain
          angular.forEach(nonBlacklistKeys, function(k) {
            expect(constraints[k]).toBeDefined();
          });
        });
      });

      describe('greaterThanOrEqualTo method', function () {
        var method, blacklistKeys;

        beforeEach(function () {
          method = 'greaterThanOrEqualTo';
          blacklistKeys = ['$gt', '$all'];
          key = '$gte';
        });

        it('should set the $gte key on the field constraints object', function () {
          fieldName = 'foo';
          val = 5;
          // Call the method
          query[method](fieldName, val);
          // Check to see that the key was set correctly
          constraints = query._getFieldConstraints(fieldName);
          expect(constraints[key]).toEqual(val);
        });

        it('should remove incompatible keys from the field constraints object', function () {
          var nonBlacklistKeys = [],
            allKeys = [];
          dummyConstraints = angular.copy(allConstraints);
          for (var k in dummyConstraints) {
            allKeys.push(k);
            if (blacklistKeys.indexOf(k) < 0) {
              nonBlacklistKeys.push(k);
            }
          }
          fieldName = 'foo';
          val = 'a value';
          // Set the field constraints
          query._setFieldConstraints(fieldName, dummyConstraints);
          // Make sure they start out with all the keys
          constraints = query._getFieldConstraints(fieldName);
          angular.forEach(allKeys, function(k) {
            expect(constraints[k]).toBeDefined();
          });
          // Call the method
          query[method](fieldName, val);
          // Make sure the blacklisted keys were removed
          constraints = query._getFieldConstraints(fieldName);
          angular.forEach(blacklistKeys, function(k) {
            expect(constraints[k]).toBeUndefined();
          });
          // Make sure all the other keys remain
          angular.forEach(nonBlacklistKeys, function(k) {
            expect(constraints[k]).toBeDefined();
          });
        });
      });

      describe('containedIn method', function () {
        var method, blacklistKeys;

        beforeEach(function () {
          method = 'containedIn';
          blacklistKeys = ['$all'];
          key = '$in';
        });

        it('should set the $in key on the field constraints object', function () {
          fieldName = 'foo';
          val = 5;
          // Call the method
          query[method](fieldName, val);
          // Check to see that the key was set correctly
          constraints = query._getFieldConstraints(fieldName);
          expect(constraints[key]).toEqual(val);
        });

        it('should remove incompatible keys from the field constraints object', function () {
          var nonBlacklistKeys = [],
            allKeys = [];
          dummyConstraints = angular.copy(allConstraints);
          for (var k in dummyConstraints) {
            allKeys.push(k);
            if (blacklistKeys.indexOf(k) < 0) {
              nonBlacklistKeys.push(k);
            }
          }
          fieldName = 'foo';
          val = 'a value';
          // Set the field constraints
          query._setFieldConstraints(fieldName, dummyConstraints);
          // Make sure they start out with all the keys
          constraints = query._getFieldConstraints(fieldName);
          angular.forEach(allKeys, function(k) {
            expect(constraints[k]).toBeDefined();
          });
          // Call the method
          query[method](fieldName, val);
          // Make sure the blacklisted keys were removed
          constraints = query._getFieldConstraints(fieldName);
          angular.forEach(blacklistKeys, function(k) {
            expect(constraints[k]).toBeUndefined();
          });
          // Make sure all the other keys remain
          angular.forEach(nonBlacklistKeys, function(k) {
            expect(constraints[k]).toBeDefined();
          });
        });
      });

      describe('notContainedIn method', function () {
        var method, blacklistKeys;

        beforeEach(function () {
          method = 'notContainedIn';
          blacklistKeys = ['$all'];
          key = '$nin';
        });

        it('should set the $nin key on the field constraints object', function () {
          fieldName = 'foo';
          val = 5;
          // Call the method
          query[method](fieldName, val);
          // Check to see that the key was set correctly
          constraints = query._getFieldConstraints(fieldName);
          expect(constraints[key]).toEqual(val);
        });

        it('should remove incompatible keys from the field constraints object', function () {
          var nonBlacklistKeys = [],
            allKeys = [];
          dummyConstraints = angular.copy(allConstraints);
          for (var k in dummyConstraints) {
            allKeys.push(k);
            if (blacklistKeys.indexOf(k) < 0) {
              nonBlacklistKeys.push(k);
            }
          }
          fieldName = 'foo';
          val = 'a value';
          // Set the field constraints
          query._setFieldConstraints(fieldName, dummyConstraints);
          // Make sure they start out with all the keys
          constraints = query._getFieldConstraints(fieldName);
          angular.forEach(allKeys, function(k) {
            expect(constraints[k]).toBeDefined();
          });
          // Call the method
          query[method](fieldName, val);
          // Make sure the blacklisted keys were removed
          constraints = query._getFieldConstraints(fieldName);
          angular.forEach(blacklistKeys, function(k) {
            expect(constraints[k]).toBeUndefined();
          });
          // Make sure all the other keys remain
          angular.forEach(nonBlacklistKeys, function(k) {
            expect(constraints[k]).toBeDefined();
          });
        });
      });

      describe('exists method', function () {
        var method, blacklistKeys;

        beforeEach(function () {
          method = 'exists';
          blacklistKeys = ['$gt', '$gte', '$lt', '$lte', '$in', '$nin', '$all'];
          key = '$exists';
          val = true;
        });

        it('should set the $exists key on the field constraints object to true', function () {
          fieldName = 'foo';
          // Call the method
          query[method](fieldName);
          // Check to see that the key was set correctly
          constraints = query._getFieldConstraints(fieldName);
          expect(constraints[key]).toEqual(val);
        });

        it('should remove incompatible keys from the field constraints object', function () {
          var nonBlacklistKeys = [],
            allKeys = [];
          dummyConstraints = angular.copy(allConstraints);
          for (var k in dummyConstraints) {
            allKeys.push(k);
            if (blacklistKeys.indexOf(k) < 0) {
              nonBlacklistKeys.push(k);
            }
          }
          fieldName = 'foo';
          // Set the field constraints
          query._setFieldConstraints(fieldName, dummyConstraints);
          // Make sure they start out with all the keys
          constraints = query._getFieldConstraints(fieldName);
          angular.forEach(allKeys, function(k) {
            expect(constraints[k]).toBeDefined();
          });
          // Call the method
          query[method](fieldName);
          // Make sure the blacklisted keys were removed
          constraints = query._getFieldConstraints(fieldName);
          angular.forEach(blacklistKeys, function(k) {
            expect(constraints[k]).toBeUndefined();
          });
          // Make sure all the other keys remain
          angular.forEach(nonBlacklistKeys, function(k) {
            expect(constraints[k]).toBeDefined();
          });
        });
      });

      describe('doesNotExist method', function () {
        var method;

        beforeEach(function () {
          method = 'doesNotExist';
          key = '$exists';
          val = false;
        });

        it('should set the $exists key on the field constraints object to false', function () {
          fieldName = 'foo';
          // Call the method
          query[method](fieldName);
          // Check to see that the key was set correctly
          constraints = query._getFieldConstraints(fieldName);
          expect(constraints[key]).toEqual(val);
        });

        it('should remove all other keys from the field constraints object', function () {
          var blacklistKeys = [],
            allKeys = [],
            k;
          dummyConstraints = angular.copy(allConstraints);
          for (k in dummyConstraints) {
            allKeys.push(k);
            // This is the only one that will be left
            if (k !== key) {
              blacklistKeys.push(k);
            }
          }
          fieldName = 'foo';
          // Set the field constraints
          query._setFieldConstraints(fieldName, dummyConstraints);
          // Make sure they start out with all the keys
          constraints = query._getFieldConstraints(fieldName);
          angular.forEach(allKeys, function(k) {
            expect(constraints[k]).toBeDefined();
          });
          // Call the method
          query[method](fieldName);
          // Make sure the blacklisted keys were removed
          constraints = query._getFieldConstraints(fieldName);
          angular.forEach(blacklistKeys, function(k) {
            expect(constraints[k]).toBeUndefined();
          });
        });
      });

      describe('startsWith method', function () {
        var method, blacklistKeys, str;

        beforeEach(function () {
          method = 'startsWith';
          blacklistKeys = ['$all'];
          key = '$regex';
          str = 'rhubarb';
          val = '^\\Q' + str + '\\E';
        });

        it('should set the $nin key on the field constraints object', function () {
          fieldName = 'foo';
          // Call the method
          query[method](fieldName, str);
          // Check to see that the key was set correctly
          constraints = query._getFieldConstraints(fieldName);
          expect(constraints[key]).toEqual(val);
        });

        it('should remove incompatible keys from the field constraints object', function () {
          var nonBlacklistKeys = [],
            allKeys = [];
          dummyConstraints = angular.copy(allConstraints);
          for (var k in dummyConstraints) {
            allKeys.push(k);
            if (blacklistKeys.indexOf(k) < 0) {
              nonBlacklistKeys.push(k);
            }
          }
          fieldName = 'foo';
          // Set the field constraints
          query._setFieldConstraints(fieldName, dummyConstraints);
          // Make sure they start out with all the keys
          constraints = query._getFieldConstraints(fieldName);
          angular.forEach(allKeys, function(k) {
            expect(constraints[k]).toBeDefined();
          });
          // Call the method
          query[method](fieldName, str);
          // Make sure the blacklisted keys were removed
          constraints = query._getFieldConstraints(fieldName);
          angular.forEach(blacklistKeys, function(k) {
            expect(constraints[k]).toBeUndefined();
          });
          // Make sure all the other keys remain
          angular.forEach(nonBlacklistKeys, function(k) {
            expect(constraints[k]).toBeDefined();
          });
        });
      });

      describe('matchesQuery method', function () {
        var method, blacklistKeys, mockQuery, queryKey, expectedVal;

        beforeEach(function () {
          method = 'matchesQuery';
          blacklistKeys = ['$all'];
          key = '$select';
          val = 'bar';
          mockQuery = {
            _yieldParams: function () {
              return val;
            }
          };
          queryKey = 'bat';
          expectedVal = {
            query: val,
            key: queryKey
          };
        });

        it('should set the $select key on the field constraints object', function () {
          fieldName = 'foo';
          // Call the method
          query[method](fieldName, mockQuery, queryKey);
          // Check to see that the key was set correctly
          constraints = query._getFieldConstraints(fieldName);
          expect(constraints[key]).toEqual(expectedVal);
        });

        it('should use objectId for the query key if no other value is specified', function () {
          fieldName = 'foo';
          expectedVal.key = 'objectId';
          // Call the method
          query[method](fieldName, mockQuery);
          // Check to see that the key was set correctly
          constraints = query._getFieldConstraints(fieldName);
          expect(constraints[key]).toEqual(expectedVal);
        });

        it('should remove incompatible keys from the field constraints object', function () {
          var nonBlacklistKeys = [],
            allKeys = [];
          dummyConstraints = angular.copy(allConstraints);
          for (var k in dummyConstraints) {
            allKeys.push(k);
            if (blacklistKeys.indexOf(k) < 0) {
              nonBlacklistKeys.push(k);
            }
          }
          fieldName = 'foo';
//        val = 'a value';
          // Set the field constraints
          query._setFieldConstraints(fieldName, dummyConstraints);
          // Make sure they start out with all the keys
          constraints = query._getFieldConstraints(fieldName);
          angular.forEach(allKeys, function(k) {
            expect(constraints[k]).toBeDefined();
          });
          // Call the method
          query[method](fieldName, mockQuery);
          // Make sure the blacklisted keys were removed
          constraints = query._getFieldConstraints(fieldName);
          angular.forEach(blacklistKeys, function(k) {
            expect(constraints[k]).toBeUndefined();
          });
          // Make sure all the other keys remain
          angular.forEach(nonBlacklistKeys, function(k) {
            expect(constraints[k]).toBeDefined();
          });
        });
      });

      describe('doesNotMatchQuery method', function () {
        var method, blacklistKeys, mockQuery, queryKey, expectedVal;

        beforeEach(function () {
          method = 'doesNotMatchQuery';
          blacklistKeys = ['$all'];
          key = '$dontSelect';
          val = 'bar';
          mockQuery = {
            _yieldParams: function () {
              return val;
            }
          };
          queryKey = 'bat';
          expectedVal = {
            query: val,
            key: queryKey
          };
        });

        it('should set the $dontSelect key on the field constraints object', function () {
          fieldName = 'foo';
          // Call the method
          query[method](fieldName, mockQuery, queryKey);
          // Check to see that the key was set correctly
          constraints = query._getFieldConstraints(fieldName);
          expect(constraints[key]).toEqual(expectedVal);
        });

        it('should use objectId for the query key if no other value is specified', function () {
          fieldName = 'foo';
          expectedVal.key = 'objectId';
          // Call the method
          query[method](fieldName, mockQuery);
          // Check to see that the key was set correctly
          constraints = query._getFieldConstraints(fieldName);
          expect(constraints[key]).toEqual(expectedVal);
        });

        it('should remove incompatible keys from the field constraints object', function () {
          var nonBlacklistKeys = [],
            allKeys = [];
          dummyConstraints = angular.copy(allConstraints);
          for (var k in dummyConstraints) {
            allKeys.push(k);
            if (blacklistKeys.indexOf(k) < 0) {
              nonBlacklistKeys.push(k);
            }
          }
          fieldName = 'foo';
//        val = 'a value';
          // Set the field constraints
          query._setFieldConstraints(fieldName, dummyConstraints);
          // Make sure they start out with all the keys
          constraints = query._getFieldConstraints(fieldName);
          angular.forEach(allKeys, function(k) {
            expect(constraints[k]).toBeDefined();
          });
          // Call the method
          query[method](fieldName, mockQuery);
          // Make sure the blacklisted keys were removed
          constraints = query._getFieldConstraints(fieldName);
          angular.forEach(blacklistKeys, function(k) {
            expect(constraints[k]).toBeUndefined();
          });
          // Make sure all the other keys remain
          angular.forEach(nonBlacklistKeys, function(k) {
            expect(constraints[k]).toBeDefined();
          });
        });
      });

      describe('contains method', function () {
        it('should set the constraints for the given fieldName to the given value', function () {
          fieldName = 'foo';
          val = 'a value';
          query.contains(fieldName, val);
          constraints = query._getFieldConstraints(fieldName);
          expect(constraints).toEqual(val);
        });
      });

      describe('containsAll method', function () {
        var method, whitelistKeys;

        beforeEach(function () {
          fieldName = 'foo';
          val = [1, 2, 3];
          method = 'containsAll';
          whitelistKeys = ['$all'];
          key = '$all';
        });

        it('should set the $all key on the field constraints object', function () {
          // Call the method
          query[method](fieldName, val);
          // Check to see that the key was set correctly
          constraints = query._getFieldConstraints(fieldName);
          expect(constraints[key]).toEqual(val);
        });

        it('should either take an array as the second argument, or it should make an array from all arguments after the first', function () {
          var arrayVal, argsListVal;
          val = [1, 2, 3];
          // Call the method with an array
          query[method](fieldName, val);
          // Get the value that was set
          constraints = query._getFieldConstraints(fieldName);
          arrayVal = constraints[key];
          // Repeat with a list of arguments
          query[method](fieldName, val[0], val[1], val[2]);
          constraints = query._getFieldConstraints(fieldName);
          argsListVal = constraints[key];
          expect(arrayVal).toEqual(argsListVal);
        });

        it('should remove incompatible keys from the field constraints object', function () {
          var blacklistKeys = [],
            allKeys = [];
          dummyConstraints = angular.copy(allConstraints);
          for (var k in dummyConstraints) {
            allKeys.push(k);
            if (whitelistKeys.indexOf(k) < 0) {
              blacklistKeys.push(k);
            }
          }
//        fieldName = 'foo';
//        val = 'a value';
          // Set the field constraints
          query._setFieldConstraints(fieldName, dummyConstraints);
          // Make sure they start out with all the keys
          constraints = query._getFieldConstraints(fieldName);
          angular.forEach(allKeys, function(k) {
            expect(constraints[k]).toBeDefined();
          });
          // Call the method
          query[method](fieldName, val);
          // Make sure the blacklisted keys were removed
          constraints = query._getFieldConstraints(fieldName);
          angular.forEach(blacklistKeys, function(k) {
            expect(constraints[k]).toBeUndefined();
          });
          // Make sure all the other keys remain
          angular.forEach(whitelistKeys, function(k) {
            expect(constraints[k]).toBeDefined();
          });
        });
      });

      describe('isRelationOf method', function () {
        var method, mockObj, objId, className, pointerObj, relatedToObj;

        beforeEach(function () {
          method = 'isRelationOf';
          fieldName = 'foo';
          className = 'SomeClass';
          objId = '12345';
          mockObj = {
            className: className,
            objectId: objId
          };
          key = '$relatedTo';
          pointerObj = {
            __type: 'Pointer',
            className: className,
            objectId: objId
          };
          relatedToObj = {
            object: pointerObj,
            key: fieldName
          };
        });

        it('should set the $relatedTo key on the constraints object to an object containing a pointer and a key', function () {
          query[method](fieldName, mockObj);
          constraints = query._getConstraints();
          expect(constraints[key]).toEqual(relatedToObj);
        });

        it('should not otherwise modify the constraints object', function () {
          var origConstraints = {a: 1, b: 2};
          query._setConstraints(angular.copy(origConstraints));
          // Verify that setting worked
          expect(query._getConstraints()).toEqual(origConstraints);
          // Now call the method
          query[method](fieldName, mockObj);
          // Get the new constraints
          constraints = query._getConstraints();
          // Delete the $relatedTo key, which should be the only one that was added
          delete constraints[key];
          expect(constraints).toEqual(origConstraints);
        });
      });

      describe('isRelatedTo method', function () {
        var objId, className, mockObj, pointerObj;

        beforeEach(function () {
          fieldName = 'foo';
          className = 'SomeClass';
          objId = '12345';
          mockObj = {
            className: className,
            objectId: objId
          };
          pointerObj = {
            __type: 'Pointer',
            className: className,
            objectId: objId
          };
        });

        it('should set the field constraints for the passed in fieldName to a Pointer for the passed in object', function () {
          query.isRelatedTo(fieldName, mockObj);
          constraints = query._getFieldConstraints(fieldName);
          expect(constraints).toEqual(pointerObj);
        });
      });

      describe('skip method', function () {
        it('should set the skip parameter to the passed in value', function () {
          var params,
            n = 5;
          query.skip(n);
          params = query._params;
          expect(params.skip).toEqual(n);
        });
      });

      describe('limit method', function () {
        it('should set the limit parameter to the passed in value', function () {
          var params,
            n = 5;
          query.limit(n);
          params = query._params;
          expect(params.limit).toEqual(n);
        });
      });

      describe('count method', function () {
        it('should set the count parameter to 1', function () {
          var params;
          query.count();
          params = query._params;
          expect(params.count).toEqual(1);
        });
        it('should set the limit parameter to 0', function () {
          var params;
          query.count();
          params = query._params;
          expect(params.limit).toEqual(0);
        });
      });

      describe('select method', function () {
        var params,
          keys;

        beforeEach(function () {
          keys = ['a', 'b', 'c'];
        });

        it('should set the keys parameter to the passed in array', function () {
          query.select(keys);
          params = query._params;
          expect(params.keys).toEqual(keys);
        });

        it('should either take an array as its argument, or it should make an array from its arguments', function () {
          var arrayVal, argsListVal;
          keys = ['a', 'b', 'c'];
          // Call the method with an array
          query.select(keys);
          // Get the value that was set
          params = query._params;
          arrayVal = angular.copy(params.keys);
          // Reset the keys
          delete params.keys;
          // Repeat with a list of arguments
          query.select(keys[0], keys[1], keys[2]);
          argsListVal = angular.copy(params.keys);
          expect(arrayVal).toEqual(argsListVal);
        });

      });

      describe('order method', function () {
        var params,
          keys;

        beforeEach(function () {
          keys = ['a', 'b', 'c'];
        });

        it('should set the order parameter to the passed in array', function () {
          query.order(keys);
          params = query._params;
          expect(params.order).toEqual(keys);
        });

        it('should either take an array as its argument, or it should make an array from its arguments', function () {
          var arrayVal, argsListVal;
          keys = ['a', 'b', 'c'];
          // Call the method with an array
          query.order(keys);
          // Get the value that was set
          params = query._params;
          arrayVal = angular.copy(params.order);
          // Reset the keys
          delete params.order;
          // Repeat with a list of arguments
          query.order(keys[0], keys[1], keys[2]);
          argsListVal = angular.copy(params.order);
          expect(arrayVal).toEqual(argsListVal);
        });
      });

      describe('ascending method', function () {
        var params,
          keys;

        beforeEach(function () {
          keys = ['a', 'b', 'c'];
        });

        it('should add the passed in string as the last element of the params.order array', function () {
          params = query._params;
          params.order = keys.slice(0, 2);
          query.ascending(keys[2]);
          expect(params.order.pop()).toEqual(keys[2]);
        });

        it('should not otherwise alter the params.order array', function () {
          var oldOrderArray,
            newOrderArray;
          params = query._params;
          params.order = keys.slice(0, 2);
          // Copy the old array
          oldOrderArray = angular.copy(params.order);
          // Call the method
          query.ascending(keys[2]);
          // Get the current array
          newOrderArray = angular.copy(params.order);
          // Remove the last element
          newOrderArray.pop();
          // Compare new to old
          expect(newOrderArray).toEqual(oldOrderArray);
        });

        it('should create the params.order array if it doesn\'t exist', function () {
          params = query._params;
          expect(params.order).toBeUndefined();
          query.ascending(keys[2]);
          expect(params.order).toBeArray();
        });
      });

      describe('descending method', function () {
        var params,
          keys;

        beforeEach(function () {
          keys = ['a', 'b', 'c'];
        });

        it('should prepend \'-\' to the passed in string and add it as the last element of the params.order array', function () {
          params = query._params;
          params.order = keys.slice(0, 2);
          query.descending(keys[2]);
          expect(params.order.pop()).toEqual('-' + keys[2]);
        });

        it('should not otherwise alter the params.order array', function () {
          var oldOrderArray,
            newOrderArray;
          params = query._params;
          params.order = keys.slice(0, 2);
          // Copy the old array
          oldOrderArray = angular.copy(params.order);
          // Call the method
          query.descending(keys[2]);
          // Get the current array
          newOrderArray = angular.copy(params.order);
          // Remove the last element
          newOrderArray.pop();
          // Compare new to old
          expect(newOrderArray).toEqual(oldOrderArray);
        });

        it('should create the params.order array if it doesn\'t exist', function () {
          params = query._params;
          expect(params.order).toBeUndefined();
          query.descending(keys[2]);
          expect(params.order).toBeArray();
        });
      });

      describe('_yieldParams method', function () {
        var params;

        beforeEach(function () {
          query._params = {
            order: ['a', 'b', 'c'],
            where: {
              a: 1,
              b: 2
            },
            keys: ['a', 'b', 'c', 'd']
          };
        });

        it('should return a params object', function () {
          params = query._yieldParams();
          expect(params).toBeObject();
        });

        describe('returned params object', function () {
          it('should have a className property equal to the className property of the query\'s Resource', function () {
            params = query._yieldParams();
            expect(params.className).toEqual(query._Resource.className);
          });

          describe('order property', function () {
            it('should be a string creating by joining the elements of query parameters\' order array with commas', function () {
              params = query._yieldParams();
              expect(params.order).toEqual(query._params.order.join(','));
            });

            it('should be undefined if the query parameters\' order property is undefined', function () {
              delete query._params.order;
              params = query._yieldParams();
              expect(params.order).toBeUndefined();
            });

            it('should be undefined if the query parameters\' order property is set to an empty array', function () {
              query._params.order = [];
              params = query._yieldParams();
              expect(params.order).toBeUndefined();
            });
          });

          it('should otherwise be the same as the underlying query parameters object', function () {
            params = query._yieldParams();
            delete params.className;
            delete params.order;
            delete query._params.order;
            expect(params).toEqual(query._params);
          });

        });
      });

      describe('exec method', function () {
        beforeEach(function () {
          query._params = {
            order: ['a', 'b', 'c'],
            where: {
              a: 1,
              b: 2
            },
            keys: ['a', 'b', 'c', 'd']
          };
        });

        it('should call the query method of the underlying Resource', function () {
          spyOn(mockResource, 'query');
          query.exec();
          expect(mockResource.query).toHaveBeenCalled();
        });

        it('should return the value from the Resource\'s query method', function () {
          var queryReturnVal = 5,
            execReturnVal;
          spyOn(mockResource, 'query').andReturn(queryReturnVal);
          execReturnVal = query.exec();
          expect(execReturnVal).toEqual(queryReturnVal);
        });

        describe('query params argument', function () {
          var paramsArg,
            execQuery = function () {
              spyOn(mockResource, 'query');
              query.exec();
              paramsArg = mockResource.query.argsForCall[0][0];
            };

          it('should be an object', function () {
            execQuery();
            expect(paramsArg).toBeObject();
          });

          it('should not have a className property', function () {
            execQuery();
            expect(paramsArg.className).toBeUndefined();
          });

          describe('where property', function () {
            it('should be undefined if the query parameters\' where property is undefined', function () {
              delete query._params.where;
              execQuery();
              expect(paramsArg.where).toBeUndefined();
            });

            it('should otherwise be a JSON string representing the query parameters\' where property', function () {
              execQuery();
              expect(paramsArg.where).toEqual(JSON.stringify(query._params.where));
            });
          });

          it('should otherwise be the same as the object returned the _yieldParams method', function () {
            execQuery();
            var yieldedParams = query._yieldParams();
            delete yieldedParams.className;
            delete yieldedParams.where;
            delete paramsArg.where;
            expect(paramsArg).toEqual(yieldedParams);
          });
        });
      });
    });
  });
});