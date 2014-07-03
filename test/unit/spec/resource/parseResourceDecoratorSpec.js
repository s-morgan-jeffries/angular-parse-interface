'use strict';

describe('Factory: parseResourceDecorator', function () {
  var mockLog,
    parseResourceDecorator,
    Resource,
    dummyMetaData;

  beforeEach(function () {
    mockLog = {
      warn: jasmine.createSpy()
    };
    module('angularParseInterface', function ($provide) {
      $provide.value('$log', mockLog);
    });
    inject(function ($injector) {
      parseResourceDecorator = $injector.get('parseResourceDecorator');
    });
  });

  beforeEach(function () {
    Resource = function () {};
    parseResourceDecorator(Resource);
    dummyMetaData = {};
  });

  it('should be a function', function () {
    expect(parseResourceDecorator).toBeFunction();
  });

  describe('_getMetaData method', function () {
    it('should return the Resource\'s _metaData property if it exists', function () {
      dummyMetaData = {
        a: 1,
        b: 2
      };
      Resource._metaData = dummyMetaData;
      expect(Resource._getMetaData()).toBe(dummyMetaData);
    });

    it('should return an empty object if the _metaData property is undefined', function () {
      delete Resource._metaData;
      expect(Resource._getMetaData()).toEqual({});
    });
  });

  describe('_setMetaData method', function () {
    it('should set the Resource\'s _metaData property to the passed in object', function () {
      dummyMetaData = {
        a: 1,
        b: 2
      };
      Resource._setMetaData(dummyMetaData);
      expect(Resource._metaData).toBe(dummyMetaData);
    });

//    xit('should not set the _metaData property if anything except an object is passed in', function () {
//      var numMetaData = 5,
//        strMetaData;
//      delete Resource._metaData;
//      expect(Resource._metaData).toBeUndefined();
//    });
  });

  describe('_getMetaDataProp method', function () {
    var dummyProp,
      dummyPropVal,
      returnedPropVal;

    beforeEach(function () {
      dummyProp = 'foo';
      dummyPropVal = 'bar';
    });

    it('should get the metaData by calling the _getMetaData method', function () {
      dummyMetaData = {};
      spyOn(Resource, '_getMetaData').andReturn(dummyMetaData);
      Resource._getMetaDataProp(dummyProp);
      expect(Resource._getMetaData).toHaveBeenCalled();
    });

    it('should return the value from the specified metaData property if it exists', function () {
      dummyMetaData[dummyProp] = dummyPropVal;
      spyOn(Resource, '_getMetaData').andReturn(dummyMetaData);
      returnedPropVal = Resource._getMetaDataProp(dummyProp);
      expect(returnedPropVal).toEqual(dummyPropVal);
    });

    it('should return undefined if the specified metaData property does not exist', function () {
      delete dummyMetaData[dummyProp];
      spyOn(Resource, '_getMetaData').andReturn(dummyMetaData);
      returnedPropVal = Resource._getMetaDataProp(dummyProp);
      expect(returnedPropVal).toBeUndefined();
    });
  });

  describe('_setMetaDataProp method', function () {
    var dummyProp,
      dummyPropVal;

    beforeEach(function () {
      dummyProp = 'foo';
      dummyPropVal = 'bar';
      Resource._getMetaData = function () {
        return dummyMetaData;
      };
      dummyMetaData = {};
    });

    it('should get the metaData by calling the _getMetaData method', function () {
      spyOn(Resource, '_getMetaData').andCallThrough();
      Resource._setMetaDataProp(dummyProp, dummyPropVal);
      expect(Resource._getMetaData).toHaveBeenCalled();
    });

    it('should set the metaData by calling the _setMetaData method', function () {
      spyOn(Resource, '_setMetaData');
      Resource._setMetaDataProp(dummyProp, dummyPropVal);
      expect(Resource._setMetaData).toHaveBeenCalled();
    });

    it('should add the specified property with the specified value to the metaData', function () {
      var expectedMetaDataArg,
        actualMetaDataArg;
      dummyMetaData = {};
      expectedMetaDataArg = {};
      expectedMetaDataArg[dummyProp] = dummyPropVal;
      spyOn(Resource, '_setMetaData');
      Resource._setMetaDataProp(dummyProp, dummyPropVal);
      actualMetaDataArg = Resource._setMetaData.argsForCall[0][0];
      expect(actualMetaDataArg).toEqual(expectedMetaDataArg);
    });

    it('should not otherwise modify the metaData', function () {
      var metaDataArg;
      dummyMetaData = {};
      spyOn(Resource, '_setMetaData');
      Resource._setMetaDataProp(dummyProp, dummyPropVal);
      metaDataArg = Resource._setMetaData.argsForCall[0][0];
      delete metaDataArg[dummyProp];
      expect(metaDataArg).toEqual(dummyMetaData);
    });
  });

//  xdescribe('_setClassName method', function () {
//    var className;
//
//    beforeEach(function () {
//      className = 'SomeClass';
//      spyOn(Resource, '_setMetaDataProp');
//    });
//
//    it('should set the metaData className property to the specified string', function () {
//      Resource._setClassName(className);
//      expect(Resource._setMetaDataProp).toHaveBeenCalledWith('className', className);
//    });
//
//  });

  describe('className property', function () {
    var className,
      returnedClassName;

    beforeEach(function () {
      className = 'SomeClass';
//      spyOn(Resource, '_getMetaDataProp');
//      Resource._getMetaDataProp = function () {
//        return className;
//      };
    });

    it('should have a getter that calls _getMetaDataProp to get the metaData className property', function () {
      spyOn(Resource, '_getMetaDataProp').andReturn(className);
      returnedClassName = Resource.className;
      expect(Resource._getMetaDataProp).toHaveBeenCalledWith('className');
    });

    it('should allow the className to be set', function () {
      // Set the className
      Resource.className = className;
      // Make sure this works as expected
      expect(Resource.className).toEqual(className);
    });

    it('should issue a warning if the className is set more than once', function () {
      var newClassName = 'SomeOtherClass';
      // Set the className
      Resource.className = className;
      // Make sure this works as expected
      expect(Resource.className).toEqual(className);
      // There shouldn't be a warning on the first call
      expect(mockLog.warn).not.toHaveBeenCalled();
      // Now try to set it again
      Resource.className = className;
      // A warning should be issued for the second call
      expect(mockLog.warn).toHaveBeenCalled();
      // This should still be true
      expect(Resource.className).toEqual(className);
      // Now reset the spy
      mockLog.warn.reset();
      // Try it again with a different name
      Resource.className = newClassName;
      // The change gets made
      expect(Resource.className).toEqual(newClassName);
      // And again, a warning is logged
      expect(mockLog.warn).toHaveBeenCalled();
    });

  });

  describe('_getFieldsMetaData method', function () {
    var fieldsMetaData;

    beforeEach(function () {
      Resource._getMetaDataProp = function () {
        return dummyMetaData.fields;
      };
    });

    it('should call the _getMetaDataProp to get the \'fields\' property from metaData', function () {
      dummyMetaData = {
        a: 1,
        b: 2,
        fields: {
          c: 3,
          d: 4
        }
      };
      spyOn(Resource, '_getMetaDataProp').andCallThrough();
      fieldsMetaData = Resource._getFieldsMetaData();
      expect(Resource._getMetaDataProp).toHaveBeenCalledWith('fields');
      expect(fieldsMetaData).toEqual(dummyMetaData.fields);
    });

//    it('should return an empty object if the \'fields\' property is not set', function () {
//      dummyMetaData = {
//        a: 1,
//        b: 2,
//        fields: {
//          c: 3,
//          d: 4
//        }
//      };
//      fieldsMetaData = Resource._getFieldsMetaData();
//      expect(fieldsMetaData).toEqual(dummyMetaData.fields);
//    });

    it('should return an empty object if the \'fields\' property is not set', function () {
      dummyMetaData = {
        a: 1,
        b: 2
      };
      fieldsMetaData = Resource._getFieldsMetaData();
      expect(fieldsMetaData).toEqual({});
    });
  });

  describe('_setFieldsMetaData method', function () {
    var fieldsMetaData;

    beforeEach(function () {
      Resource._setMetaDataProp = jasmine.createSpy();
      fieldsMetaData = {
        a: 1,
        b: 2
      };
    });

    it('should call the _setMetaDataProp to set the \'fields\' property on metaData', function () {
      Resource._setFieldsMetaData(fieldsMetaData);
      expect(Resource._setMetaDataProp).toHaveBeenCalledWith('fields', fieldsMetaData);
    });
  });

  describe('_getFieldMetaData method', function () {
    var fieldMetaData,
      fieldName;

    beforeEach(function () {
      Resource._getFieldsMetaData = function () {
        return dummyMetaData;
      };
      dummyMetaData = {};
      fieldName = 'foo';
    });

    it('should call the _getFieldsMetaData method', function () {
      dummyMetaData[fieldName] = {
        a: 1,
        b: 2
      };
      spyOn(Resource, '_getFieldsMetaData').andCallThrough();
      Resource._getFieldMetaData(fieldName);
      expect(Resource._getFieldsMetaData).toHaveBeenCalled();
    });

    it('should return the value of the property corresponding to the specified fieldName', function () {
      dummyMetaData[fieldName] = {
        a: 1,
        b: 2
      };
      fieldMetaData = Resource._getFieldMetaData(fieldName);
      expect(fieldMetaData).toEqual(dummyMetaData[fieldName]);
    });

    it('should return an empty object if a property corresponding to the specified fieldName does not exist', function () {
      delete dummyMetaData[fieldName];
      fieldMetaData = Resource._getFieldMetaData(fieldName);
      expect(fieldMetaData).toEqual({});
    });
  });


  describe('_setFieldMetaData method', function () {
    var fieldMetaData,
      fieldName,
      modifiedFieldsMetaData;

    beforeEach(function () {
      fieldName = 'foo';
      Resource._getFieldsMetaData = function () {
        return dummyMetaData;
      };
      Resource._setFieldsMetaData = jasmine.createSpy();
      dummyMetaData = {};
      fieldMetaData = {
        a: 1,
        b: 2
      };
    });

    it('should call the _getFieldsMetaData method', function () {
      spyOn(Resource, '_getFieldsMetaData').andCallThrough();
      Resource._setFieldMetaData(fieldName, fieldMetaData);
      expect(Resource._getFieldsMetaData).toHaveBeenCalled();
    });

    it('should call the _setFieldsMetaData method with the modified metaData', function () {
      Resource._setFieldMetaData(fieldName, fieldMetaData);
      expect(Resource._setFieldsMetaData).toHaveBeenCalledWith(dummyMetaData);
    });

    it('should set the property corresponding to the specified fieldName on the metaData', function () {
      Resource._setFieldMetaData(fieldName, fieldMetaData);
      modifiedFieldsMetaData = Resource._setFieldsMetaData.argsForCall[0][0];
      expect(modifiedFieldsMetaData[fieldName]).toEqual(fieldMetaData);
    });

    it('should not otherwise modify the metaData', function () {
      var origFieldsMetaData = angular.copy(dummyMetaData);
      Resource._setFieldMetaData(fieldName, fieldMetaData);
      modifiedFieldsMetaData = Resource._setFieldsMetaData.argsForCall[0][0];
      delete modifiedFieldsMetaData[fieldName];
      expect(modifiedFieldsMetaData).toEqual(origFieldsMetaData);
    });
  });

  describe('_getFieldMetaDataProp method', function () {
    var fieldName,
      propName,
      propVal;

    beforeEach(function () {
      Resource._getFieldMetaData = function () {
        return dummyMetaData;
      };
      dummyMetaData = {
        a: 1,
        b: 2
      };
      fieldName = 'foo';
      propName = 'bar';
    });

    it('should call the _getFieldMetaData method with the specified fieldName', function () {
      spyOn(Resource, '_getFieldMetaData').andCallThrough();
      Resource._getFieldMetaDataProp(fieldName, propName);
      expect(Resource._getFieldMetaData).toHaveBeenCalledWith(fieldName);
    });

    it('should return the value of the property corresponding to the specified propName', function () {
      var returnVal;
      propVal = 'bat';
      dummyMetaData[propName] = propVal;
      returnVal = Resource._getFieldMetaDataProp(fieldName, propName);
      expect(returnVal).toEqual(propVal);
    });
  });

  describe('_setFieldMetaDataProp method', function () {
    var fieldName,
      propName,
      propVal,
      modifiedFieldMetaData;

    beforeEach(function () {
      Resource._getFieldMetaData = function () {
        return dummyMetaData;
      };
      Resource._setFieldMetaData = jasmine.createSpy();
      dummyMetaData = {
        a: 1,
        b: 2
      };
      fieldName = 'foo';
      propName = 'bar';
      propVal = 'bat';
    });

    it('should call the _getFieldMetaData method with the specified fieldName', function () {
      spyOn(Resource, '_getFieldMetaData').andCallThrough();
      Resource._setFieldMetaDataProp(fieldName, propName, propVal);
      expect(Resource._getFieldMetaData).toHaveBeenCalledWith(fieldName);
    });

    it('should call the _setFieldMetaData method with the specified fieldName and modified metaData', function () {
      Resource._setFieldMetaDataProp(fieldName, propName, propVal);
      expect(Resource._setFieldMetaData).toHaveBeenCalledWith(fieldName, dummyMetaData);
    });

    it('should set the property corresponding to the specified fieldName on the metaData', function () {
      Resource._setFieldMetaDataProp(fieldName, propName, propVal);
      modifiedFieldMetaData = Resource._setFieldMetaData.argsForCall[0][1];
      expect(modifiedFieldMetaData[propName]).toEqual(propVal);
    });

    it('should not otherwise modify the metaData', function () {
      var origFieldMetaData = angular.copy(dummyMetaData);
      Resource._setFieldMetaDataProp(fieldName, propName, propVal);
      modifiedFieldMetaData = Resource._setFieldMetaData.argsForCall[0][1];
      delete modifiedFieldMetaData[propName];
      expect(modifiedFieldMetaData).toEqual(origFieldMetaData);
    });
  });

  describe('_getFieldDataType method', function () {
    it('should call the _getFieldMetaDataProp method with the specified fieldName and \'dataType\' and return whatever it returns', function () {
      var fieldName = 'foo',
        dummyVal,
        returnedVal;
      spyOn(Resource, '_getFieldMetaDataProp').andReturn(dummyVal);
      returnedVal = Resource._getFieldDataType(fieldName);
      expect(Resource._getFieldMetaDataProp).toHaveBeenCalledWith(fieldName, 'dataType');
      expect(returnedVal).toEqual(dummyVal);
    });
  });

  describe('_setFieldDataType method', function () {
    it('should call the _setFieldMetaDataProp method with the specified fieldName, \'dataType\', and the specified value', function () {
      var fieldName = 'foo',
        dummyVal = 'bar';
      spyOn(Resource, '_setFieldMetaDataProp');
      Resource._setFieldDataType(fieldName, dummyVal);
      expect(Resource._setFieldMetaDataProp).toHaveBeenCalledWith(fieldName, 'dataType', dummyVal);
    });
  });

  describe('_getFieldClassName method', function () {
    it('should call the _getFieldMetaDataProp method with the specified fieldName and \'className\' and return whatever it returns', function () {
      var fieldName = 'foo',
        dummyVal,
        returnedVal;
      spyOn(Resource, '_getFieldMetaDataProp').andReturn(dummyVal);
      returnedVal = Resource._getFieldClassName(fieldName);
      expect(Resource._getFieldMetaDataProp).toHaveBeenCalledWith(fieldName, 'className');
      expect(returnedVal).toEqual(dummyVal);
    });
  });

  describe('_getFieldClassName method', function () {
    it('should call the _setFieldMetaDataProp method with the specified fieldName, \'className\', and the specified value', function () {
      var fieldName = 'foo',
        dummyVal = 'bar';
      spyOn(Resource, '_setFieldMetaDataProp');
      Resource._setFieldClassName(fieldName, dummyVal);
      expect(Resource._setFieldMetaDataProp).toHaveBeenCalledWith(fieldName, 'className', dummyVal);
    });
  });

  describe('_addRequestBlacklistProp method', function () {
    it('should call the _setFieldMetaDataProp method with the specified fieldName, \'isRequestBlacklisted\', and true', function () {
      var fieldName = 'foo';
      spyOn(Resource, '_setFieldMetaDataProp');
      Resource._addRequestBlacklistProp(fieldName);
      expect(Resource._setFieldMetaDataProp).toHaveBeenCalledWith(fieldName, 'isRequestBlacklisted', true);
    });
  });

  describe('_addRequestBlacklistProps method', function () {

    beforeEach(function () {
      Resource._addRequestBlacklistProp = jasmine.createSpy();
    });

    it('should call the _addRequestBlacklistProp method for every argument in its argument list', function () {
      var propsList = ['a', 'b', 'c'];
      Resource._addRequestBlacklistProps(propsList[0], propsList[1], propsList[2]);
      angular.forEach(propsList, function (propName, idx) {
        var propArg = Resource._addRequestBlacklistProp.argsForCall[idx][0];
        expect(propArg).toEqual(propName);
      });
    });

    it('should call the _addRequestBlacklistProp method for every element when it\'s given an array argument', function () {
      var propsList = ['a', 'b', 'c'];
      Resource._addRequestBlacklistProps(propsList);
      angular.forEach(propsList, function (propName, idx) {
        var propArg = Resource._addRequestBlacklistProp.argsForCall[idx][0];
        expect(propArg).toEqual(propName);
      });
    });
  });

  describe('_isRequestBlacklisted method', function () {
    var fieldName;

    beforeEach(function () {
      fieldName = 'foo';
    });

    it('should call the _getFieldMetaDataProp method with the specified fieldName and \'isRequestBlacklisted\'', function () {
      spyOn(Resource, '_getFieldMetaDataProp');
      Resource._isRequestBlacklisted(fieldName);
      expect(Resource._getFieldMetaDataProp).toHaveBeenCalledWith(fieldName, 'isRequestBlacklisted');
    });

    it('should return whatever is returned from _getFieldMetaDataProp cast as a boolean', function () {
      var dummyVal, returnedVal;
      Resource._getFieldMetaDataProp = function () {
        return dummyVal;
      };
      // explicitly set a falsy value
      dummyVal = undefined;
      returnedVal = Resource._isRequestBlacklisted(fieldName);
      expect(returnedVal).toEqual(false);
      // Set a truthy value
      dummyVal = 1;
      returnedVal = Resource._isRequestBlacklisted(fieldName);
      expect(returnedVal).toEqual(true);
    });
  });

  // I'm not crazy about this test, because it assumes a little too much, but since the decorator creates the functions
  // before calling them, I can't spy on the internals.
  it('should add the createdAt and updatedAt properties to the request blacklist', function () {
    expect(Resource._isRequestBlacklisted('createdAt')).toBeTrue();
    expect(Resource._isRequestBlacklisted('updatedAt')).toBeTrue();
  });

//  xdescribe('isNew instance method', function () {
//    it('should return false if the object has an objectId', function () {
//      var dummyObj = {
//        objectId: '12345',
//        isNew: Resource.prototype.isNew
//      };
//      expect(dummyObj.isNew()).toBeFalse();
//    });
//    it('should return true if the object does not have an objectId', function () {
//      var dummyObj = {
//        notAnObjectId: '12345',
//        isNew: Resource.prototype.isNew
//      };
//      expect(dummyObj.isNew()).toBeTrue();
//    });
//  });

  describe('className instance property', function () {
    it('should return the className property of the object\'s constructor', function () {
      var dummyClassName = 'SomeClass';
      Resource.className  = dummyClassName;
      expect(Resource.prototype.className).toEqual(dummyClassName);
    });

    it('should not be settable', function () {
      var dummyClassName = 'SomeClass',
        otherClassName = 'SomeOtherClass';
      Resource.className  = dummyClassName;
      // Make sure this works
      expect(Resource.prototype.className).toEqual(dummyClassName);
      // This should have no effect
      Resource.prototype.className = otherClassName;
      // This should still be true
      expect(Resource.prototype.className).toEqual(dummyClassName);
      // This should not be true
      expect(Resource.prototype.className).not.toEqual(otherClassName);
    });
  });

  describe('getPointer method', function () {
    it('should return a Pointer object with the correct objectId and className', function () {
      var objectId = '12345',
        className = 'SomeClass',
        instance = {
          objectId: objectId,
          className: className,
          getPointer: Resource.prototype.getPointer
        },
        pointer = instance.getPointer(),
        expectedPointer = {
          __type: 'Pointer',
          className: className,
          objectId: objectId
        };
      expect(pointer).toEqual(expectedPointer);
    });
  });

  describe('hasOne method', function () {
    var fieldName,
      mockRelation;

    beforeEach(function () {
      fieldName = 'foo';
      mockRelation = {
        className: 'SomeOtherClass'
      };
    });

    it('should set the dataType for the field to Pointer', function () {
      spyOn(Resource, '_setFieldDataType');
      Resource.hasOne(fieldName, mockRelation);
      expect(Resource._setFieldDataType).toHaveBeenCalledWith(fieldName, 'Pointer');
    });

    it('should set the className for the field to the other Resource\'s className', function () {
      spyOn(Resource, '_setFieldClassName');
      Resource.hasOne(fieldName, mockRelation);
      expect(Resource._setFieldClassName).toHaveBeenCalledWith(fieldName, mockRelation.className);
    });
  });

  describe('hasMany method', function () {
    var fieldName,
      mockRelation;

    beforeEach(function () {
      fieldName = 'foo';
      mockRelation = {
        className: 'SomeOtherClass'
      };
    });

    it('should set the dataType for the field to Relation', function () {
      spyOn(Resource, '_setFieldDataType');
      Resource.hasMany(fieldName, mockRelation);
      expect(Resource._setFieldDataType).toHaveBeenCalledWith(fieldName, 'Relation');
    });

    it('should set the className for the field to the other Resource\'s className', function () {
      spyOn(Resource, '_setFieldClassName');
      Resource.hasMany(fieldName, mockRelation);
      expect(Resource._setFieldClassName).toHaveBeenCalledWith(fieldName, mockRelation.className);
    });
  });

  describe('addRelations method', function () {
    var instance,
      putResponse,
      fieldName,
      mockPointer1,
      mockPointer2,
      mockRelation1,
      mockRelation2,
      putData,
      response;

    beforeEach(function () {
      fieldName = 'foo';
      putResponse = {};
      instance = {
        $PUT: function () {
          return putResponse;
        },
        addRelations: Resource.prototype.addRelations
      };
      spyOn(instance, '$PUT').andCallThrough();
      mockPointer1 = {};
      mockPointer2 = {};
      mockRelation1 = {
        getPointer: function () {
          return mockPointer1;
        }
      };
      spyOn(mockRelation1, 'getPointer').andCallThrough();
      mockRelation2 = {
        getPointer: function () {
          return mockPointer2;
        }
      };
      spyOn(mockRelation2, 'getPointer').andCallThrough();
    });

    it('should call the instance\'s $PUT method and return the results', function () {
      response = instance.addRelations(fieldName, mockRelation1, mockRelation2);
      expect(instance.$PUT).toHaveBeenCalled();
      expect(response).toBe(putResponse);
    });

    it('should pass the same data to $PUT regardless of whether the relations are passed in as an array or as a list of arguments', function () {
      var arrayPutData, argsListPutData;
      response = instance.addRelations(fieldName, mockRelation1, mockRelation2);
      arrayPutData = instance.$PUT.argsForCall[0][0];
      instance.$PUT.reset();
      response = instance.addRelations(fieldName, [mockRelation1, mockRelation2]);
      argsListPutData = instance.$PUT.argsForCall[0][0];
      expect(arrayPutData).toEqual(argsListPutData);
    });

    it('should set putData[fieldName].__op to AddRelation', function () {
      response = instance.addRelations(fieldName, mockRelation1, mockRelation2);
      putData = instance.$PUT.argsForCall[0][0];
      expect(putData[fieldName].__op).toEqual('AddRelation');
    });

    it('should get pointers for the passed in objects by calling their getPointer methods', function () {
      response = instance.addRelations(fieldName, mockRelation1, mockRelation2);
      expect(mockRelation1.getPointer).toHaveBeenCalled();
      expect(mockRelation2.getPointer).toHaveBeenCalled();
    });

    it('should set putData[fieldName].objects to an array of pointers for the passed in objects', function () {
      response = instance.addRelations(fieldName, mockRelation1, mockRelation2);
      putData = instance.$PUT.argsForCall[0][0];
      expect(putData[fieldName].objects).toEqual([mockPointer1, mockPointer2]);
    });
  });

  describe('removeRelations method', function () {
    var instance,
      putResponse,
      fieldName,
      mockPointer1,
      mockPointer2,
      mockRelation1,
      mockRelation2,
      putData,
      response;

    beforeEach(function () {
      fieldName = 'foo';
      putResponse = {};
      instance = {
        $PUT: function () {
          return putResponse;
        },
        removeRelations: Resource.prototype.removeRelations
      };
      spyOn(instance, '$PUT').andCallThrough();
      mockPointer1 = {};
      mockPointer2 = {};
      mockRelation1 = {
        getPointer: function () {
          return mockPointer1;
        }
      };
      spyOn(mockRelation1, 'getPointer').andCallThrough();
      mockRelation2 = {
        getPointer: function () {
          return mockPointer2;
        }
      };
      spyOn(mockRelation2, 'getPointer').andCallThrough();
    });

    it('should call the instance\'s $PUT method and return the results', function () {
      response = instance.removeRelations(fieldName, mockRelation1, mockRelation2);
      expect(instance.$PUT).toHaveBeenCalled();
      expect(response).toBe(putResponse);
    });

    it('should pass the same data to $PUT regardless of whether the relations are passed in as an array or as a list of arguments', function () {
      var arrayPutData, argsListPutData;
      response = instance.removeRelations(fieldName, mockRelation1, mockRelation2);
      arrayPutData = instance.$PUT.argsForCall[0][0];
      instance.$PUT.reset();
      response = instance.removeRelations(fieldName, [mockRelation1, mockRelation2]);
      argsListPutData = instance.$PUT.argsForCall[0][0];
      expect(arrayPutData).toEqual(argsListPutData);
    });

    it('should set putData[fieldName].__op to RemoveRelation', function () {
      response = instance.removeRelations(fieldName, mockRelation1, mockRelation2);
      putData = instance.$PUT.argsForCall[0][0];
      expect(putData[fieldName].__op).toEqual('RemoveRelation');
    });

    it('should get pointers for the passed in objects by calling their getPointer methods', function () {
      response = instance.removeRelations(fieldName, mockRelation1, mockRelation2);
      expect(mockRelation1.getPointer).toHaveBeenCalled();
      expect(mockRelation2.getPointer).toHaveBeenCalled();
    });

    it('should set putData[fieldName].objects to an array of pointers for the passed in objects', function () {
      response = instance.removeRelations(fieldName, mockRelation1, mockRelation2);
      putData = instance.$PUT.argsForCall[0][0];
      expect(putData[fieldName].objects).toEqual([mockPointer1, mockPointer2]);
    });
  });

  describe('_getACLMetaData method', function () {
    it('should return the instance\'s ACL property', function () {
      var instance = {
          ACL: {},
          _getACLMetaData: Resource.prototype._getACLMetaData
        },
        ACLMetaData = instance._getACLMetaData();
      expect(ACLMetaData).toBe(instance.ACL);
    });
  });

  describe('_setACLMetaData method', function () {
    it('should set the instance\'s ACL property to the passed in value', function () {
      var instance = {
          _setACLMetaData: Resource.prototype._setACLMetaData
        },
        ACLMetaData = {};
      instance._setACLMetaData(ACLMetaData);
      expect(instance.ACL).toBe(ACLMetaData);
    });
  });

  describe('_setReadPrivileges method', function () {
    var ACLMetaData, instance, objectId, obj, canRead;

    beforeEach(function () {
      ACLMetaData = {};
      instance = {
        _setReadPrivileges: Resource.prototype._setReadPrivileges,
        _getACLMetaData: function () {
          return ACLMetaData;
        },
        _setACLMetaData: jasmine.createSpy()
      };
      spyOn(instance, '_getACLMetaData').andCallThrough();
      objectId = '12345';
      obj = {
        objectId: objectId,
        className: '_User'
      };
      canRead = true;
    });

    it('should error if the object\'s className is not either _User or _Role', function () {
      var setReadPrivileges = function () {
        instance._setReadPrivileges(obj, canRead);
      };
      // This should work
      obj.className = '_User';
      expect(setReadPrivileges).not.toThrowError();
      // This should work
      obj.className = '_Role';
      expect(setReadPrivileges).not.toThrowError();
      // This should not work
      obj.className = 'AnyOtherClass';
      expect(setReadPrivileges).toThrowError();
    });

    it('should call the instance\'s _getACLMetaData method', function () {
      instance._setReadPrivileges(obj, canRead);
      expect(instance._getACLMetaData).toHaveBeenCalled();
    });

    it('should create a property corresponding the object\'s id on ACLMetaData if it does not exist', function () {
      expect(ACLMetaData[objectId]).not.toBeDefined();
      instance._setReadPrivileges(obj, canRead);
      expect(ACLMetaData[objectId]).toBeDefined();
    });

    it('should create a \'*\' property on ACLMetaData if no object is passed in', function () {
      expect(ACLMetaData[objectId]).not.toBeDefined();
      instance._setReadPrivileges(obj, canRead);
      expect(ACLMetaData[objectId]).toBeDefined();
    });

    it('should set the read property of the ACLMetaData[objectId] object to the passed in boolean value', function () {
      instance._setReadPrivileges(obj, canRead);
      expect(ACLMetaData[objectId].read).toEqual(canRead);
    });

    it('should call the instance\'s _setACLMetaData method with ACLMetaData', function () {
      instance._setReadPrivileges(obj, canRead);
      expect(instance._setACLMetaData).toHaveBeenCalledWith(ACLMetaData);
    });
  });

  describe('_setWritePrivileges method', function () {
    var ACLMetaData, instance, objectId, obj, canWrite;

    beforeEach(function () {
      ACLMetaData = {};
      instance = {
        _setWritePrivileges: Resource.prototype._setWritePrivileges,
        _getACLMetaData: function () {
          return ACLMetaData;
        },
        _setACLMetaData: jasmine.createSpy()
      };
      spyOn(instance, '_getACLMetaData').andCallThrough();
      objectId = '12345';
      obj = {
        objectId: objectId,
        className: '_User'
      };
      canWrite = true;
    });

    it('should error if the object\'s className is not either _User or _Role', function () {
      var setWritePrivileges = function () {
        instance._setWritePrivileges(obj, canWrite);
      };
      // This should work
      obj.className = '_User';
      expect(setWritePrivileges).not.toThrowError();
      // This should work
      obj.className = '_Role';
      expect(setWritePrivileges).not.toThrowError();
      // This should not work
      obj.className = 'AnyOtherClass';
      expect(setWritePrivileges).toThrowError();
    });

    it('should call the instance\'s _getACLMetaData method', function () {
      instance._setWritePrivileges(obj, canWrite);
      expect(instance._getACLMetaData).toHaveBeenCalled();
    });

    it('should create a property corresponding the object\'s id on ACLMetaData if it does not exist', function () {
      expect(ACLMetaData[objectId]).not.toBeDefined();
      instance._setWritePrivileges(obj, canWrite);
      expect(ACLMetaData[objectId]).toBeDefined();
    });

    it('should create a \'*\' property on ACLMetaData if no object is passed in', function () {
      expect(ACLMetaData[objectId]).not.toBeDefined();
      instance._setWritePrivileges(obj, canWrite);
      expect(ACLMetaData[objectId]).toBeDefined();
    });

    it('should set the write property of the ACLMetaData[objectId] object to the passed in boolean value', function () {
      instance._setWritePrivileges(obj, canWrite);
      expect(ACLMetaData[objectId].write).toEqual(canWrite);
    });

    it('should call the instance\'s _setACLMetaData method with ACLMetaData', function () {
      instance._setWritePrivileges(obj, canWrite);
      expect(instance._setACLMetaData).toHaveBeenCalledWith(ACLMetaData);
    });
  });

  describe('canBeReadBy method', function () {
    it('should call the instance\'s _setReadPrivileges method with the object\'s ID and true', function () {
      var objectId = '12345',
        instance = {
          canBeReadBy: Resource.prototype.canBeReadBy,
          _setReadPrivileges: jasmine.createSpy()
        },
        obj = {
          objectId: objectId
        };
      instance.canBeReadBy(obj);
      expect(instance._setReadPrivileges).toHaveBeenCalledWith(objectId, true);
    });
  });

  describe('cannotBeReadBy method', function () {
    it('should call the instance\'s _setReadPrivileges method with the object\'s ID and false', function () {
      var objectId = '12345',
        instance = {
          cannotBeReadBy: Resource.prototype.cannotBeReadBy,
          _setReadPrivileges: jasmine.createSpy()
        },
        obj = {
          objectId: objectId
        };
      instance.cannotBeReadBy(obj);
      expect(instance._setReadPrivileges).toHaveBeenCalledWith(objectId, false);
    });
  });

  describe('canBeWrittenBy method', function () {
    it('should call the instance\'s _setWritePrivileges method with the object\'s ID and true', function () {
      var objectId = '12345',
        instance = {
          canBeWrittenBy: Resource.prototype.canBeWrittenBy,
          _setWritePrivileges: jasmine.createSpy()
        },
        obj = {
          objectId: objectId
        };
      instance.canBeWrittenBy(obj);
      expect(instance._setWritePrivileges).toHaveBeenCalledWith(objectId, true);
    });
  });

  describe('cannotBeWrittenBy method', function () {
    it('should call the instance\'s _setWritePrivileges method with the object\'s ID and false', function () {
      var objectId = '12345',
        instance = {
          cannotBeWrittenBy: Resource.prototype.cannotBeWrittenBy,
          _setWritePrivileges: jasmine.createSpy()
        },
        obj = {
          objectId: objectId
        };
      instance.cannotBeWrittenBy(obj);
      expect(instance._setWritePrivileges).toHaveBeenCalledWith(objectId, false);
    });
  });

  describe('allCanRead method', function () {
    it('should call the instance\'s _setReadPrivileges method with true', function () {
      var instance = {
        allCanRead: Resource.prototype.allCanRead,
        _setReadPrivileges: jasmine.createSpy()
      };
      instance.allCanRead();
      expect(instance._setReadPrivileges).toHaveBeenCalledWith(true);
    });
  });

  describe('allCanWrite method', function () {
    it('should call the instance\'s _setWritePrivileges method with true', function () {
      var instance = {
        allCanWrite: Resource.prototype.allCanWrite,
        _setWritePrivileges: jasmine.createSpy()
      };
      instance.allCanWrite();
      expect(instance._setWritePrivileges).toHaveBeenCalledWith(true);
    });
  });
});