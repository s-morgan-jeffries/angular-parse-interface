'use strict';

describe('Factory: parseDataEncoding', function () {
  var parseDataEncoding;

  beforeEach(function () {
    module('angularParseInterface.resourceMod', function (/*$provide*/) {
//      $provide.value('$rootScope', mockRootScope);
    });
    inject(function ($injector) {
      parseDataEncoding = $injector.get('parseDataEncoding');
    });
  });

  // This should have two methods: one to return a requestTransform function, and one to return a responseTransform function
  describe('getRequestTransform method', function () {
    var requestTransform;

    it('should be a function', function () {
      expect(parseDataEncoding.getRequestTransform).toBeFunction();
    });

    it('should return a requestTransform function', function () {
      requestTransform = parseDataEncoding.getRequestTransform();
      expect(requestTransform).toBeFunction();
    });

    describe('requestTransform function', function () {
      var data,
        origData,
        transformedData,
        headers,
        headersGetter = function () {
          return headers;
        };

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
          }
        };
        headers = {};
      });

      it('should not modify the headers', function () {
        var origHeaders = angular.copy(headers);
        requestTransform = parseDataEncoding.getRequestTransform();
        transformedData = requestTransform(data, headersGetter);
        expect(headers).toEqual(origHeaders);
      });
    });
  });

  describe('getResponseTransform method', function () {
    var responseTransform;

    it('should be a function', function () {
      expect(parseDataEncoding.getResponseTransform).toBeFunction();
    });

    xit('should return a responseTransform function', function () {
      responseTransform = parseDataEncoding.getResponseTransform();
      expect(responseTransform).toBeFunction();

      xdescribe('responseTransform function', function () {});
    });
  });
});