'use strict';

describe('Factory: parseDataEncoding', function () {
  var parseDataEncoding,
    mockDataCodecs,
    headers,
    headersGetter = function () {
      return headers;
    },
    dummyEncoder = function (val) {
      return 'encoded' + val;
    },
    dummyDecoder = function (val) {
      return 'decoded' + val;
    },
    fieldsMetaData,
    transformFunctions,
    mockResource;

  beforeEach(function () {
    mockDataCodecs = {
      getDecoderForType: function (/*dataType, params*/) {
        return dummyDecoder;
      },
      getEncoderForType: function (/*dataType, params*/) {
        return dummyEncoder;
      }
    };
    module('angularParseInterface', function ($provide) {
      $provide.value('parseDataCodecs', mockDataCodecs);
    });
    inject(function ($injector) {
      parseDataEncoding = $injector.get('parseDataEncoding');
    });
    // This is going to look up values in fieldsMetaData, which is pretty much what the actual Resource will do
    mockResource = {
      _getFieldDataType: function (fieldName) {
        return (fieldsMetaData[fieldName] || {}).dataType;
      },
      _getFieldClassName: function (fieldName) {
        return (fieldsMetaData[fieldName] || {}).className;
      }
    };
  });

  // This should have two methods: one to return a requestTransform function, and one to return a responseTransform function
  describe('getTransformFunctions method', function () {

    it('should be a function', function () {
      expect(parseDataEncoding.getTransformFunctions).toBeFunction();
    });

    it('should return a transformFunctions object', function () {
      var transformFunctions = parseDataEncoding.getTransformFunctions();
      expect(transformFunctions).toBeObject();
      expect(transformFunctions.setResource).toBeFunction();
      expect(transformFunctions.transformRequest).toBeFunction();
      expect(transformFunctions.transformResponse).toBeFunction();
    });

    describe('setResource function', function () {
      var transformFunctions,
        data;

      beforeEach(function () {
        data = {
          num: 3,
          str: 'string',
          bool: true,
          unDef: undefined,
          nothing: null,
          ar: [1,2,3],
          obj: {
            a: 1,
            b: 2
          },
          pointer: '12345',
          relation: {
            __type: 'Relation',
            className: 'SomeClass'
          },
          date: new Date()
        };
        fieldsMetaData = {
          pointer: {
            dataType: 'Pointer',
            className: 'SomeClass'
          },
          relation: {
            dataType: 'Relation',
            className: 'SomeClass'
          }
        };
        headers = {};
        transformFunctions = parseDataEncoding.getTransformFunctions();
        spyOn(mockResource, '_getFieldDataType').andCallThrough();
        spyOn(mockResource, '_getFieldClassName').andCallThrough();
        transformFunctions.setResource(mockResource);
      });

      it('should set the Resource object used by the transformRequest function', function () {
        transformFunctions.transformRequest(data);
        expect(mockResource._getFieldDataType).toHaveBeenCalled();
        expect(mockResource._getFieldClassName).toHaveBeenCalled();
      });

      it('should set the Resource object used by the transformResponse function', function () {
        transformFunctions.transformResponse(data);
        expect(mockResource._getFieldDataType).toHaveBeenCalled();
        expect(mockResource._getFieldClassName).toHaveBeenCalled();
      });
    });

    describe('transformRequest function', function () {
      var data,
        transformedData,
        expectedDataType,
        actualDataType,
        expectedParams,
        actualParams,
        transformRequest;

      beforeEach(function () {
        data = {
          num: 3,
          str: 'string',
          bool: true,
          unDef: undefined,
          nothing: null,
          ar: [1,2,3],
          obj: {
            a: 1,
            b: 2
          },
          pointer: '12345',
          relation: {
            __type: 'Relation',
            className: 'SomeClass'
          },
          date: new Date()
        };
        fieldsMetaData = {
          pointer: {
            dataType: 'Pointer',
            className: 'SomeClass'
          },
          relation: {
            dataType: 'Relation',
            className: 'SomeClass'
          }
        };
        headers = {};
//        transformRequest = parseDataEncoding.getTransformRequest(mockResource);
        transformFunctions = parseDataEncoding.getTransformFunctions();
        transformFunctions.setResource(mockResource);
        transformRequest = transformFunctions.transformRequest;
      });

      it('should not modify the headers', function () {
        var origHeaders = angular.copy(headers);
        transformedData = transformRequest(data, headersGetter);
        expect(headers).toEqual(origHeaders);
      });

      // test that it applies whatever encoder it's given to the fields
      it('should apply the correct encoder to every field in data', function () {
        // Since our mockDataCodecs service returns dummyEncoder for every dataType, the expected output is an object
        // with the same properties as the input but for which the dummy encoder has been applied to every property
        // value.
        var expectedTransformedData = {};
        for (var key in data) {
          if (data.hasOwnProperty(key)) {
            expectedTransformedData[key] = dummyEncoder(data[key]);
          }
        }
        transformedData = transformRequest(data, headersGetter);
        expect(transformedData).toEqual(expectedTransformedData);
      });

      it('should return operation request data unchanged', function () {
        data.relation = {
          __op: 'AddRelations',
          objects: []
        };
        transformedData = transformRequest(data, headersGetter);
        expect(transformedData.relation).toEqual(data.relation);
      });

//      // test that when it's given an array as the input argument that it applies the encoder to each element in the
//      // array
//      xit('should decode each element if the input argument is an array', function () {
//        // Since our mockDataCodecs service returns dummyEncoder for every dataType, the expected output is an object
//        // with the same properties as the input but for which the dummy encoder has been applied to every property
//        // value.
//        var expectedTransformedData = {};
//        for (var key in data) {
//          if (data.hasOwnProperty(key)) {
//            expectedTransformedData[key] = dummyEncoder(data[key]);
//          }
//        }
//        // Just make arrays out of the original data
//        data = [data, data, data];
//        expectedTransformedData = [expectedTransformedData, expectedTransformedData, expectedTransformedData];
//        transformedData = transformRequest(data, headersGetter);
//        // This should still work
//        expect(transformedData).toEqual(expectedTransformedData);
//      });

      // Test that it's getting the correct dataType for each field
      // The registered dataType for a field is the canonical source
      it('should get a dataType equal to the registered value for any field with a registered dataType', function () {
        data = {
          foo: [1, 2, 3]
        };
        fieldsMetaData = {
          foo: {
            dataType: 'Bar'
          }
        };
        expectedDataType = fieldsMetaData.foo.dataType;
        spyOn(mockDataCodecs, 'getEncoderForType').andCallThrough();
        transformedData = transformRequest(data, headersGetter);
        actualDataType = mockDataCodecs.getEncoderForType.argsForCall[0][0];
        expect(actualDataType).toEqual(expectedDataType);
      });

      // The next three are detected using the typeof operator. They probably won't need any special handling, but it's
      // better to get the correct dataType and not use it than to be unprepared.
      it('should get a dataType of Number for fields with a numeric value and without a registered dataType', function () {
        data = {
          aVal: 5
        };
        expectedDataType = 'Number';
        spyOn(mockDataCodecs, 'getEncoderForType').andCallThrough();
        transformedData = transformRequest(data, headersGetter);
        actualDataType = mockDataCodecs.getEncoderForType.argsForCall[0][0];
        expect(actualDataType).toEqual(expectedDataType);
      });

      it('should get a dataType of String for fields with a string value and without a registered dataType', function () {
        data = {
          aVal: 'a string'
        };
        expectedDataType = 'String';
        spyOn(mockDataCodecs, 'getEncoderForType').andCallThrough();
        transformedData = transformRequest(data, headersGetter);
        actualDataType = mockDataCodecs.getEncoderForType.argsForCall[0][0];
        expect(actualDataType).toEqual(expectedDataType);
      });

      it('should get a dataType of Boolean for fields with a boolean value and without a registered dataType', function () {
        data = {
          aVal: true
        };
        expectedDataType = 'Boolean';
        spyOn(mockDataCodecs, 'getEncoderForType').andCallThrough();
        transformedData = transformRequest(data, headersGetter);
        actualDataType = mockDataCodecs.getEncoderForType.argsForCall[0][0];
        expect(actualDataType).toEqual(expectedDataType);
      });

      // It's possible that I'll decide undefined values need special handling. I don't think Parse will ever give you
      // this directly, but it's possible that some intermediate transformRequest function will result in an undefined
      // value for one or more fields.
      it('should get a dataType of Undefined for fields with an undefined value and without a registered dataType', function () {
        data = {
          aVal: undefined
        };
        expectedDataType = 'Undefined';
        spyOn(mockDataCodecs, 'getEncoderForType').andCallThrough();
        transformedData = transformRequest(data, headersGetter);
        actualDataType = mockDataCodecs.getEncoderForType.argsForCall[0][0];
        expect(actualDataType).toEqual(expectedDataType);
      });

      // It's possible that I'll decide null values need special handling. I don't think Parse will ever give you this
      // directly, but it's possible that some intermediate transformRequest function will result in a null value for
      // one or more fields.
      it('should get a dataType of Null for fields with a null value and without a registered dataType', function () {
        data = {
          aVal: null
        };
        expectedDataType = 'Null';
        spyOn(mockDataCodecs, 'getEncoderForType').andCallThrough();
        transformedData = transformRequest(data, headersGetter);
        actualDataType = mockDataCodecs.getEncoderForType.argsForCall[0][0];
        expect(actualDataType).toEqual(expectedDataType);
      });

      it('should get a dataType of Array for fields with an array value and without a registered dataType', function () {
        data = {
          aVal: [1, 2, 3]
        };
        expectedDataType = 'Array';
        spyOn(mockDataCodecs, 'getEncoderForType').andCallThrough();
        transformedData = transformRequest(data, headersGetter);
        actualDataType = mockDataCodecs.getEncoderForType.argsForCall[0][0];
        expect(actualDataType).toEqual(expectedDataType);
      });

      // Date is the only non-serializable Parse dataType that we can safely auto-detect. That's because it doesn't
      // require any metaData in order to re-encode it (we can unambiguously decide if a field from a client-side object
      // contains a date, and dates don't have classNames).
      it('should get a dataType of Date for fields with a Date value and without a registered dataType', function () {
        data = {
          aVal: new Date()
        };
        expectedDataType = 'Date';
        spyOn(mockDataCodecs, 'getEncoderForType').andCallThrough();
        transformedData = transformRequest(data, headersGetter);
        actualDataType = mockDataCodecs.getEncoderForType.argsForCall[0][0];
        expect(actualDataType).toEqual(expectedDataType);
      });

      // If you don't have all the necessary metaData for a field (which might be the case if you're using someone
      // else's Parse data), you can just leave it empty, and it will be treated like an object.
      it('should get a dataType of Object for fields with an object value and without a registered dataType', function () {
        data = {
          aVal: {
            a: 1,
            b: 2
          }
        };
        expectedDataType = 'Object';
        spyOn(mockDataCodecs, 'getEncoderForType').andCallThrough();
        transformedData = transformRequest(data, headersGetter);
        actualDataType = mockDataCodecs.getEncoderForType.argsForCall[0][0];
        expect(actualDataType).toEqual(expectedDataType);
      });

      // Test that it's getting the correct className for each field
      // The only way for it to get the className is if it's registered.
      it('should get a className equal to the registered value for any field with a registered className', function () {
        data = {
          foo: 'this could be anything'
        };
        fieldsMetaData = {
          foo: {
            className: 'Bar'
          }
        };
        expectedParams = {
          className: fieldsMetaData.foo.className
        };
        spyOn(mockDataCodecs, 'getEncoderForType').andCallThrough();
        transformedData = transformRequest(data, headersGetter);
        actualParams = mockDataCodecs.getEncoderForType.argsForCall[0][1];
        expect(actualParams.className).toEqual(expectedParams.className);
      });

      // If there's no registered className, its value is undefined.
      it('should get a className of undefined for any field without a registered className', function () {
        data = {
          foo: 'this could be anything'
        };
        fieldsMetaData = {};
        expectedParams = {
          className: undefined
        };
        spyOn(mockDataCodecs, 'getEncoderForType').andCallThrough();
        transformedData = transformRequest(data, headersGetter);
        actualParams = mockDataCodecs.getEncoderForType.argsForCall[0][1];
        expect(actualParams.className).toEqual(expectedParams.className);
      });
    });


    describe('transformResponse function', function () {
      var data,
        transformedData,
        expectedDataType,
        actualDataType,
        expectedParams,
        actualParams,
        transformResponse;

      beforeEach(function () {
        data = {
          num: 3,
          str: 'string',
          bool: true,
          unDef: undefined,
          nothing: null,
          ar: [1,2,3],
          obj: {
            a: 1,
            b: 2
          },
          pointer: {
            __type: 'Pointer',
            className: 'SomeClass',
            objectId: '12345'
          },
          relation: {
            __type: 'Relation',
            className: 'SomeClass'
          }
        };
        fieldsMetaData = {
          pointer: {
            dataType: 'Pointer',
            className: 'SomeClass'
          },
          relation: {
            dataType: 'Relation',
            className: 'SomeClass'
          }
        };
        headers = {};
//        transformResponse = parseDataEncoding.getTransformResponse(mockResource);
        transformFunctions = parseDataEncoding.getTransformFunctions();
        transformFunctions.setResource(mockResource);
        transformResponse = transformFunctions.transformResponse;
      });

      it('should not modify the headers', function () {
        var origHeaders = angular.copy(headers);
        transformedData = transformResponse(data, headersGetter);
        expect(headers).toEqual(origHeaders);
      });

      // test that it applies whatever decoder it's given to the fields
      it('should apply the correct decoder to every field in data', function () {
        // Since our mockDataCodecs service returns dummyDecoder for every dataType, the expected output is an object
        // with the same properties as the input but for which the dummy decoder has been applied to every property
        // value.
        var expectedTransformedData = {};
        for (var key in data) {
          if (data.hasOwnProperty(key)) {
            expectedTransformedData[key] = dummyDecoder(data[key]);
          }
        }
        transformedData = transformResponse(data, headersGetter);
        expect(transformedData).toEqual(expectedTransformedData);
      });

      // test that when it's given an array as the input argument that it applies the decoder to each element in the
      // array
      it('should decode each element if the input argument is an array', function () {
        // Since our mockDataCodecs service returns dummyDecoder for every dataType, the expected output is an object
        // with the same properties as the input but for which the dummy decoder has been applied to every property
        // value.
        var expectedTransformedData = {};
        for (var key in data) {
          if (data.hasOwnProperty(key)) {
            expectedTransformedData[key] = dummyDecoder(data[key]);
          }
        }
        // Just make arrays out of the original data
        data = [data, data, data];
        expectedTransformedData = [expectedTransformedData, expectedTransformedData, expectedTransformedData];
        transformedData = transformResponse(data, headersGetter);
        // This should still work
        expect(transformedData).toEqual(expectedTransformedData);
      });

      // Test that it's getting the correct dataType for each field
      // The registered dataType for a field is the canonical source
      it('should get a dataType equal to the registered value for any field with a registered dataType', function () {
        data = {
          foo: [1, 2, 3]
        };
        fieldsMetaData = {
          foo: {
            dataType: 'Bar'
          }
        };
        expectedDataType = fieldsMetaData.foo.dataType;
        spyOn(mockDataCodecs, 'getDecoderForType').andCallThrough();
        transformedData = transformResponse(data, headersGetter);
        actualDataType = mockDataCodecs.getDecoderForType.argsForCall[0][0];
        expect(actualDataType).toEqual(expectedDataType);
      });

      // The next three are detected using the typeof operator. They probably won't need any special handling, but it's
      // better to get the correct dataType and not use it than to be unprepared.
      it('should get a dataType of Number for fields with a numeric value and without a registered dataType', function () {
        data = {
          aVal: 5
        };
        expectedDataType = 'Number';
        spyOn(mockDataCodecs, 'getDecoderForType').andCallThrough();
        transformedData = transformResponse(data, headersGetter);
        actualDataType = mockDataCodecs.getDecoderForType.argsForCall[0][0];
        expect(actualDataType).toEqual(expectedDataType);
      });

      it('should get a dataType of String for fields with a string value and without a registered dataType', function () {
        data = {
          aVal: 'a string'
        };
        expectedDataType = 'String';
        spyOn(mockDataCodecs, 'getDecoderForType').andCallThrough();
        transformedData = transformResponse(data, headersGetter);
        actualDataType = mockDataCodecs.getDecoderForType.argsForCall[0][0];
        expect(actualDataType).toEqual(expectedDataType);
      });

      it('should get a dataType of Boolean for fields with a boolean value and without a registered dataType', function () {
        data = {
          aVal: true
        };
        expectedDataType = 'Boolean';
        spyOn(mockDataCodecs, 'getDecoderForType').andCallThrough();
        transformedData = transformResponse(data, headersGetter);
        actualDataType = mockDataCodecs.getDecoderForType.argsForCall[0][0];
        expect(actualDataType).toEqual(expectedDataType);
      });

      // It's possible that I'll decide undefined values need special handling. I don't think Parse will ever give you
      // this directly, but it's possible that some intermediate transformResponse function will result in an undefined
      // value for one or more fields.
      it('should get a dataType of Undefined for fields with an undefined value and without a registered dataType', function () {
        data = {
          aVal: undefined
        };
        expectedDataType = 'Undefined';
        spyOn(mockDataCodecs, 'getDecoderForType').andCallThrough();
        transformedData = transformResponse(data, headersGetter);
        actualDataType = mockDataCodecs.getDecoderForType.argsForCall[0][0];
        expect(actualDataType).toEqual(expectedDataType);
      });

      // It's possible that I'll decide null values need special handling. I don't think Parse will ever give you this
      // directly, but it's possible that some intermediate transformResponse function will result in a null value for
      // one or more fields.
      it('should get a dataType of Null for fields with a null value and without a registered dataType', function () {
        data = {
          aVal: null
        };
        expectedDataType = 'Null';
        spyOn(mockDataCodecs, 'getDecoderForType').andCallThrough();
        transformedData = transformResponse(data, headersGetter);
        actualDataType = mockDataCodecs.getDecoderForType.argsForCall[0][0];
        expect(actualDataType).toEqual(expectedDataType);
      });

      it('should get a dataType of Array for fields with an array value and without a registered dataType', function () {
        data = {
          aVal: [1, 2, 3]
        };
        expectedDataType = 'Array';
        spyOn(mockDataCodecs, 'getDecoderForType').andCallThrough();
        transformedData = transformResponse(data, headersGetter);
        actualDataType = mockDataCodecs.getDecoderForType.argsForCall[0][0];
        expect(actualDataType).toEqual(expectedDataType);
      });

      // Date is the only non-serializable Parse dataType that we can safely auto-detect. That's because it doesn't
      // require any metaData in order to re-encode it (we can unambiguously decide if a field from a client-side object
      // contains a date, and dates don't have classNames).
      it('should get a dataType of Date for fields with a Parse Date value and without a registered dataType', function () {
        data = {
          aVal: {
            __type: 'Date',
            iso: (new Date()).toISOString()
          }
        };
        expectedDataType = 'Date';
        spyOn(mockDataCodecs, 'getDecoderForType').andCallThrough();
        transformedData = transformResponse(data, headersGetter);
        actualDataType = mockDataCodecs.getDecoderForType.argsForCall[0][0];
        expect(actualDataType).toEqual(expectedDataType);
      });

      // If you don't have all the necessary metaData for a field (which might be the case if you're using someone
      // else's Parse data), you can just leave it empty, and it will be treated like an object.
      it('should get a dataType of Object for fields with an object value and without a registered dataType', function () {
        data = {
          aVal: {
            a: 1,
            b: 2
          }
        };
        expectedDataType = 'Object';
        spyOn(mockDataCodecs, 'getDecoderForType').andCallThrough();
        transformedData = transformResponse(data, headersGetter);
        actualDataType = mockDataCodecs.getDecoderForType.argsForCall[0][0];
        expect(actualDataType).toEqual(expectedDataType);
      });

      // Test that it's getting the correct className for each field
      // The only way for it to get the className is if it's registered.
      it('should get a className equal to the registered value for any field with a registered className', function () {
        data = {
          foo: 'this could be anything'
        };
        fieldsMetaData = {
          foo: {
            className: 'Bar'
          }
        };
        expectedParams = {
          className: fieldsMetaData.foo.className
        };
        spyOn(mockDataCodecs, 'getDecoderForType').andCallThrough();
        transformedData = transformResponse(data, headersGetter);
        actualParams = mockDataCodecs.getDecoderForType.argsForCall[0][1];
        expect(actualParams.className).toEqual(expectedParams.className);
      });

      // If there's no registered className, its value is undefined.
      it('should get a className of undefined for any field without a registered className', function () {
        data = {
          foo: 'this could be anything'
        };
        fieldsMetaData = {};
        expectedParams = {
          className: undefined
        };
        spyOn(mockDataCodecs, 'getDecoderForType').andCallThrough();
        transformedData = transformResponse(data, headersGetter);
        actualParams = mockDataCodecs.getDecoderForType.argsForCall[0][1];
        expect(actualParams.className).toEqual(expectedParams.className);
      });

    });
  });
});