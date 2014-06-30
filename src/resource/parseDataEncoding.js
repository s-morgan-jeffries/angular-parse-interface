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