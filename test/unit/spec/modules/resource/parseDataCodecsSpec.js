'use strict';

describe('Factory: parseDataCodecs', function () {
  var parseDataCodecs,
    dataType,
    params,
    className,
    inputVal,
    outputVal;

  beforeEach(function () {
    module('angularParseInterface.resourceMod', function (/*$provide*/) {
//      $provide.value('$rootScope', mockRootScope);
    });
    inject(function ($injector) {
      parseDataCodecs = $injector.get('parseDataCodecs');
    });
  });

  describe('getEncoderForType method', function () {

    var encoder;

    it('should be a function', function () {
      expect(parseDataCodecs.getEncoderForType).toBeFunction();
    });

//    xit('should throw an error if you attempt to get an encoder for an unsupported data type', function () {
//      dataType = 'foo';
//      params = {};
//      var lookup = function () {
//        encoder = parseDataCodecs.getEncoderForType(dataType, params);
//      };
//      expect(lookup).toThrowError();
//    });

    describe('when passed a type of "Number"', function () {
      beforeEach(function () {
        dataType = 'Number';
        params = {};
        // This should work regardless of whether params is passed in, but in practice, the caller won't know whether
        // params are required or not. It will just pass in an object of all the possible parameters.
        encoder = parseDataCodecs.getEncoderForType(dataType, params);
      });

      it('should return a function that returns its input value unchanged', function () {
        expect(encoder).toBeFunction();
        inputVal = 5;
        outputVal = encoder(inputVal);
        expect(outputVal).toEqual(inputVal);
      });
    });

    describe('when passed a type of "String"', function () {
      beforeEach(function () {
        dataType = 'String';
        params = {};
        // This should work regardless of whether params is passed in, but in practice, the caller won't know whether
        // params are required or not. It will just pass in an object of all the possible parameters.
        encoder = parseDataCodecs.getEncoderForType(dataType, params);
      });

      it('should return a function that returns its input value unchanged', function () {
        expect(encoder).toBeFunction();
        inputVal = 'a string';
        outputVal = encoder(inputVal);
        expect(outputVal).toEqual(inputVal);
      });
    });

    describe('when passed a type of "Boolean"', function () {
      beforeEach(function () {
        dataType = 'Boolean';
        params = {};
        // This should work regardless of whether params is passed in, but in practice, the caller won't know whether
        // params are required or not. It will just pass in an object of all the possible parameters.
        encoder = parseDataCodecs.getEncoderForType(dataType, params);
      });

      it('should return a function that returns its input value unchanged', function () {
        expect(encoder).toBeFunction();
        inputVal = true;
        outputVal = encoder(inputVal);
        expect(outputVal).toEqual(inputVal);
      });
    });

    describe('when passed a type of "Array"', function () {
      beforeEach(function () {
        dataType = 'Array';
        params = {};
        // This should work regardless of whether params is passed in, but in practice, the caller won't know whether
        // params are required or not. It will just pass in an object of all the possible parameters.
        encoder = parseDataCodecs.getEncoderForType(dataType, params);
      });

      it('should return a function that returns its input value unchanged', function () {
        expect(encoder).toBeFunction();
        inputVal = [1, 2, 3];
        outputVal = encoder(inputVal);
        expect(outputVal).toEqual(inputVal);
      });
    });

    describe('when passed a type of "Object"', function () {
      beforeEach(function () {
        dataType = 'Object';
        params = {};
        // This should work regardless of whether params is passed in, but in practice, the caller won't know whether
        // params are required or not. It will just pass in an object of all the possible parameters.
        encoder = parseDataCodecs.getEncoderForType(dataType, params);
      });

      it('should return a function that returns its input value unchanged', function () {
        expect(encoder).toBeFunction();
        inputVal = {a: 1, b: 2};
        outputVal = encoder(inputVal);
        expect(outputVal).toEqual(inputVal);
      });
    });

    describe('when passed a type of "Date"', function () {

      var date,
        parseDate;

      beforeEach(function () {
        dataType = 'Date';
        params = {};
        encoder = parseDataCodecs.getEncoderForType(dataType, params);
        date = new Date();
        parseDate = {
          __type: 'Date',
          iso: date.toISOString()
        };
      });

      it('should return a function', function () {
        expect(encoder).toBeFunction();
      });

      describe('encoder function', function () {
        // Date input
        it('should convert a JS Date into a Parse Date object', function () {
          inputVal = date;
          outputVal = encoder(inputVal);
          expect(outputVal).toEqual(parseDate);
        });

        // other?
      });
    });

    describe('when passed a type of "Bytes"', function () {

      var bytes,
        bytesObject;

      beforeEach(function () {
        dataType = 'Bytes';
        params = {};
        encoder = parseDataCodecs.getEncoderForType(dataType, params);
        bytes = btoa('a string for converting to bytes');
        bytesObject = {
          __type: 'Bytes',
          base64: bytes
        };
      });

      it('should return a function', function () {
        expect(encoder).toBeFunction();
      });

      describe('encoder function', function () {
        it('should convert its input into a Parse Bytes object', function () {
          inputVal = bytes;
          outputVal = encoder(inputVal);
          expect(outputVal).toEqual(bytesObject);
        });
      });
    });

    describe('when passed a type of "Pointer"', function () {
      // Do something clever here, because you need to get the className into this function
      // Whatever calls this could use the the Resource's getClassName method (or whatever) and pass the result as the
      // second argument.
      var objectId,
        pointerObject;

      beforeEach(function () {
        dataType = 'Pointer';
        className = 'SomeClass';
        objectId = '123abc';
        // This is what we expect to get back from the encoder
        pointerObject = {
          __type: 'Pointer',
          className: className,
          objectId: objectId
        };
        params = {
          className: className
        };
        encoder = parseDataCodecs.getEncoderForType(dataType, params);
      });

      it('should return a function', function () {
        expect(encoder).toBeFunction();
      });

      // Don't fail silently
      it('should throw an error if no className parameter is provided', function () {
        delete params.className;
        var lookup = function () {
          encoder = parseDataCodecs.getEncoderForType(dataType, params);
        };
        expect(lookup).toThrowError();
      });

      describe('encoder function', function () {
        // String input
        it('should treat a string input as an object ID and wrap it in a Pointer object', function () {
          inputVal = objectId;
          outputVal = encoder(inputVal);
          expect(outputVal).toEqual(pointerObject);
        });

        // Object input
        it('should treat an object input as the pointer target and should wrap its objectId in a Pointer object', function () {
          inputVal = {
            a: 1,
            b: 2,
            objectId: objectId
          };
          outputVal = encoder(inputVal);
          expect(outputVal).toEqual(pointerObject);
        });
      });
    });

    describe('when passed a type of "Relation"', function () {

      var relationObject;

      beforeEach(function () {
        dataType = 'Relation';
        className = 'SomeClass';
        relationObject = {
          __type: 'Relation',
          className: className
        };
        params = {
          className: className
        };
        encoder = parseDataCodecs.getEncoderForType(dataType, params);
      });

      it('should return a function', function () {
        expect(encoder).toBeFunction();
      });

      // Don't fail silently
      it('should throw an error if no className parameter is provided', function () {
        delete params.className;
        var lookup = function () {
          encoder = parseDataCodecs.getEncoderForType(dataType, params);
        };
        expect(lookup).toThrowError();
      });

      describe('encoder function', function () {
        it('should ignore its input and return a Parse Relation object', function () {
          inputVal = {a: 1, b: 2};
          outputVal = encoder(inputVal);
          expect(outputVal).toEqual(relationObject);
        });
      });

    });
  });

  describe('getDecoderForType method', function () {

    // Decoders should be a little more permissive (be conservative in what you send and liberal in what you accept)
    var decoder;

    it('should be a function', function () {
      expect(parseDataCodecs.getDecoderForType).toBeFunction();
    });

//    xit('should throw an error if you attempt to get an decoder for an unsupported data type', function () {
//      dataType = 'foo';
//      params = {};
//      var lookup = function () {
//        decoder = parseDataCodecs.getDecoderForType(dataType, params);
//      };
//      expect(lookup).toThrowError();
//    });


    describe('when passed a type of "Number"', function () {
      beforeEach(function () {
        dataType = 'Number';
        params = {};
        // This should work regardless of whether params is passed in, but in practice, the caller won't know whether
        // params are required or not. It will just pass in an object of all the possible parameters.
        decoder = parseDataCodecs.getDecoderForType(dataType, params);
      });

      it('should return a function that returns its input value unchanged', function () {
        expect(decoder).toBeFunction();
        inputVal = 5;
        outputVal = decoder(inputVal);
        expect(outputVal).toEqual(inputVal);
      });
    });

    describe('when passed a type of "String"', function () {
      beforeEach(function () {
        dataType = 'String';
        params = {};
        // This should work regardless of whether params is passed in, but in practice, the caller won't know whether
        // params are required or not. It will just pass in an object of all the possible parameters.
        decoder = parseDataCodecs.getDecoderForType(dataType, params);
      });

      it('should return a function that returns its input value unchanged', function () {
        expect(decoder).toBeFunction();
        inputVal = 'a string';
        outputVal = decoder(inputVal);
        expect(outputVal).toEqual(inputVal);
      });
    });

    describe('when passed a type of "Boolean"', function () {
      beforeEach(function () {
        dataType = 'Boolean';
        params = {};
        // This should work regardless of whether params is passed in, but in practice, the caller won't know whether
        // params are required or not. It will just pass in an object of all the possible parameters.
        decoder = parseDataCodecs.getDecoderForType(dataType, params);
      });

      it('should return a function that returns its input value unchanged', function () {
        expect(decoder).toBeFunction();
        inputVal = true;
        outputVal = decoder(inputVal);
        expect(outputVal).toEqual(inputVal);
      });
    });

    describe('when passed a type of "Array"', function () {
      beforeEach(function () {
        dataType = 'Array';
        params = {};
        // This should work regardless of whether params is passed in, but in practice, the caller won't know whether
        // params are required or not. It will just pass in an object of all the possible parameters.
        decoder = parseDataCodecs.getDecoderForType(dataType, params);
      });

      it('should return a function that returns its input value unchanged', function () {
        expect(decoder).toBeFunction();
        inputVal = [1, 2, 3];
        outputVal = decoder(inputVal);
        expect(outputVal).toEqual(inputVal);
      });
    });

    describe('when passed a type of "Object"', function () {
      beforeEach(function () {
        dataType = 'Object';
        params = {};
        // This should work regardless of whether params is passed in, but in practice, the caller won't know whether
        // params are required or not. It will just pass in an object of all the possible parameters.
        decoder = parseDataCodecs.getDecoderForType(dataType, params);
      });

      it('should return a function that returns its input value unchanged', function () {
        expect(decoder).toBeFunction();
        inputVal = {a: 1, b: 2};
        outputVal = decoder(inputVal);
        expect(outputVal).toEqual(inputVal);
      });
    });

    describe('when passed a type of "Date"', function () {

      var date,
        parseDate;

      beforeEach(function () {
        dataType = 'Date';
        params = {};
        decoder = parseDataCodecs.getDecoderForType(dataType, params);
        date = new Date();
        parseDate = {
          __type: 'Date',
          iso: date.toISOString()
        };
      });

      it('should return a function', function () {
        expect(decoder).toBeFunction();
      });

      describe('decoder function', function () {
        // Date input
        it('should convert a Parse Date object into the equivalent JS Date', function () {
          inputVal = parseDate;
          outputVal = decoder(inputVal);
          expect(outputVal).toEqual(date);
        });

        // Any other input
        // This is to prevent a hard-to-diagnose problem where you're expecting a Date but get back some non-Date
        // data from the server.
        it('should throw an error if the input is anything other than a Parse Date object', function () {
          var decode = function () {
            outputVal = decoder(inputVal);
          };
          inputVal = 5;
          expect(decode).toThrowError();
          inputVal = 'a string';
          expect(decode).toThrowError();
          inputVal = true;
          expect(decode).toThrowError();
          inputVal = [1, 2, 3];
          expect(decode).toThrowError();
          inputVal = {a: 1, b: 2};
          expect(decode).toThrowError();
        });
      });
    });

    describe('when passed a type of "Bytes"', function () {

      var bytes,
        bytesObject;

      beforeEach(function () {
        dataType = 'Bytes';
        params = {};
        decoder = parseDataCodecs.getDecoderForType(dataType, params);
        bytes = btoa('a string for converting to bytes');
        bytesObject = {
          __type: 'Bytes',
          base64: bytes
        };
      });

      it('should return a function', function () {
        expect(decoder).toBeFunction();
      });

      describe('decoder function', function () {
        it('should convert a Parse Bytes object into a base64 string', function () {
          inputVal = bytesObject;
          outputVal = decoder(inputVal);
          expect(outputVal).toEqual(bytes);
        });

        // Any other input
        // This is to prevent a hard-to-diagnose problem where you're expecting a Bytes object but get back some non-Bytes
        // data from the server.
        it('should throw an error if the input is anything other than a Parse Bytes object', function () {
          var decode = function () {
            outputVal = decoder(inputVal);
          };
          inputVal = 5;
          expect(decode).toThrowError();
          inputVal = 'a string';
          expect(decode).toThrowError();
          inputVal = true;
          expect(decode).toThrowError();
          inputVal = [1, 2, 3];
          expect(decode).toThrowError();
          inputVal = {a: 1, b: 2};
          expect(decode).toThrowError();
        });
      });
    });

    describe('when passed a type of "Pointer"', function () {
      // Do something clever here, because you need to get the className into this function
      // Whatever calls this could use the the Resource's getClassName method (or whatever) and pass the result as the
      // second argument.
      var objectId,
        pointerObject,
        targetObject,
        ValConstructor;

      beforeEach(function () {
        dataType = 'Pointer';
        className = 'SomeClass';
        objectId = '123abc';
        // This is what we expect to get back from the decoder
        pointerObject = {
          __type: 'Pointer',
          className: className,
          objectId: objectId
        };
        targetObject = {
          a: 1,
          b: 2,
          objectId: objectId
        };
        ValConstructor = function () {};
        params = {
          ValConstructor: ValConstructor,
          className: className
        };
        decoder = parseDataCodecs.getDecoderForType(dataType, params);
      });

      it('should return a function', function () {
        expect(decoder).toBeFunction();
      });

      it('should throw an error if no className parameter is provided', function () {
        delete params.className;
        var lookup = function () {
          decoder = parseDataCodecs.getDecoderForType(dataType, params);
        };
        expect(lookup).toThrowError();
      });

      describe('decoder function', function () {
        // Pointer object input
        it('should convert a Pointer object into a string equal to the object ID', function () {
          inputVal = pointerObject;
          outputVal = decoder(inputVal);
          expect(outputVal).toEqual(objectId);
        });

//        xit('should not attempt to make an instance of its ValConstructor from a Pointer object', function () {
//          inputVal = pointerObject;
//          outputVal = decoder(inputVal);
//          expect(outputVal instanceof ValConstructor).toBeFalse();
//        });
//
//        // non-Pointer object input
//        xit('should convert any non-Pointer object into an instance of its ValConstructor parameter, if available', function () {
//          inputVal = targetObject;
//          outputVal = decoder(inputVal);
//          expect(outputVal instanceof ValConstructor).toBeTrue();
//        });
//
//        xit('should return any non-Pointer object unchanged if no ValConstructor is available', function () {
//          delete params.ValConstructor;
//          decoder = parseDataCodecs.getDecoderForType(dataType, params);
//          inputVal = targetObject;
//          outputVal = decoder(inputVal);
//          expect(outputVal).toEqual(targetObject);
//        });

        // Any other input
        // This is to prevent a hard-to-diagnose problem where you're expecting a Pointer but get back some non-Pointer
        // data from the server.
        it('should throw an error if the input is anything other than a Pointer object', function () {
          var decode = function () {
            outputVal = decoder(inputVal);
          };
          inputVal = 5;
          expect(decode).toThrowError();
          inputVal = 'a string';
          expect(decode).toThrowError();
          inputVal = true;
          expect(decode).toThrowError();
          inputVal = [1, 2, 3];
          expect(decode).toThrowError();
          inputVal = {a: 1, b: 2};
          expect(decode).toThrowError();
        });
      });
    });

    describe('when passed a type of "Relation"', function () {

      var relationObject;

      beforeEach(function () {
        dataType = 'Relation';
        className = 'SomeClass';
        relationObject = {
          __type: 'Relation',
          className: className
        };
        params = {
          className: className
        };
        decoder = parseDataCodecs.getDecoderForType(dataType, params);
      });

      it('should return a function', function () {
        expect(decoder).toBeFunction();
      });

      it('should throw an error if no className parameter is provided', function () {
        delete params.className;
        var lookup = function () {
          decoder = parseDataCodecs.getDecoderForType(dataType, params);
        };
        expect(lookup).toThrowError();
      });

      describe('decoder function', function () {
        // Again, the issue here is how to store the data locally. The simplest thing for now might be to store it as
        // the same that we get from the server. The only downside to that is that it might lead to the mistaken
        // impression that you can somehow alter the relation by altering it on the client.
        it('should return the same Parse Relation object it was given as input', function () {
          inputVal = relationObject;
          outputVal = decoder(inputVal);
          expect(outputVal).toEqual(relationObject);
        });

        it('should throw an error if the className of the input Parse Relation object does not match the expected value', function () {
          inputVal = relationObject;
          inputVal.className = 'SomeOtherClass';
          var decode = function () {
            outputVal = decoder(inputVal);
          };
          expect(decode).toThrowError();
        });

        // Any other input
        // This is to prevent a hard-to-diagnose problem where you're expecting a Pointer but get back some non-Pointer
        // data from the server.
        it('should throw an error if the input is anything other than a Relation object', function () {
          var decode = function () {
            outputVal = decoder(inputVal);
          };
          inputVal = 5;
          expect(decode).toThrowError();
          inputVal = 'a string';
          expect(decode).toThrowError();
          inputVal = true;
          expect(decode).toThrowError();
          inputVal = [1, 2, 3];
          expect(decode).toThrowError();
        });
      });

    });

  });
});