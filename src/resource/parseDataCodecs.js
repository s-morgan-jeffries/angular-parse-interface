angular.module('angularParseInterface')
  .factory('parseDataCodecs', function ($log) {
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

        // Ad hoc polymorphism to account for two cases: 1) the value is an object ID, or 2) the value is the actual
        // object pointed to by the pointer
        if (angular.isString(val)) {
          objectId = val;
        } else if (angular.isObject(val)) {
          objectId = val.objectId;
          // Throw an error if the className doesn't match (otherwise this will be harder to track down)
//          $log.log(val);
          if (val.className !== className) {
            throw new Error('Object in Pointer field does not match expect class (expected ' + className +
              ' but got ' + val.className + ').');
          }
          // Throw an error if there's no objectId (otherwise this will be harder to track down)
          if (!objectId) {
            throw new Error('No objectId found for object in Pointer field. Try saving it first.');
          }
          $log.warn('Objects in Pointer fields will not be automatically persisted; only their objectIds will be' +
            'saved. If you want to save other data from those objects, you\'ll need to do so separately.');
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