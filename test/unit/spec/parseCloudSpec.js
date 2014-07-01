'use strict';

//t0d0: Write parseCloud unit tests
xdescribe('Factory: parseCloud', function () {
  var parseCloud,
    mocks;

  beforeEach(function () {
    mocks = {};
    mocks.parseResourceActions = {
      POST: {}
    };
    mocks.postResponse = {};
    mocks.Function = {
      POST: function () {
        return mocks.postResponse;
      }
    };
    spyOn(mocks.Function, 'POST').andCallThrough();
    mocks.appResourceFactory = function () {
      return mocks.Function;
    };
    spyOn(mocks, 'appResourceFactory').andCallThrough();
    module('angularParseInterface', function ($provide) {
      $provide.value('$log', console);
      $provide.value('parseResourceActions', mocks.parseResourceActions);
    });
    inject(function ($injector) {
      parseCloud = $injector.get('parseCloud');
    });
  });

  describe('createCallerFactory method', function () {
    var cloudCallerFactory;

    it('should call the appResourceFactory with the correct arguments', function () {
      var expectedUrl = '/functions/:functionName',
        expectedParams = {},
        expectedActions = {
          POST: mocks.parseResourceActions.POST
        };
      cloudCallerFactory = parseCloud.createCallerFactory(mocks.appResourceFactory);
      expect(mocks.appResourceFactory).toHaveBeenCalledWith(expectedUrl, expectedParams, expectedActions);
    });

    it('should return a function', function () {
      cloudCallerFactory = parseCloud.createCallerFactory(mocks.appResourceFactory);
      expect(cloudCallerFactory).toBeFunction();
    });

    describe('cloudCallerFactory function', function () {
      var functionName, cloudCaller;

      beforeEach(function () {
        functionName = 'foo';
      });

      it('should return a function', function () {
        cloudCaller = cloudCallerFactory(functionName);
        expect(cloudCaller).toBeFunction();
      });

      describe('cloudCaller function', function () {
        var result;

        it('should call the Function.POST method and return the results', function () {
          result = cloudCaller();
          console.log(_.keys(mocks.Function.POST));
//          expect(mocks.Function.POST).toHaveBeenCalled();
          expect(result).toBe(mocks.postResponse);
        });
      });
    });
  });
});