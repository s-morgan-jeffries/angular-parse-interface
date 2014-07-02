'use strict';

//t0d0: Write parseCloud unit tests
describe('Factory: parseCloud', function () {
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
      mocks.appResourceFactory.reset();
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
        cloudCallerFactory = parseCloud.createCallerFactory(mocks.appResourceFactory);
      });

      it('should return a function', function () {
        functionName = 'foo';
        cloudCaller = cloudCallerFactory(functionName);
        expect(cloudCaller).toBeFunction();
      });

      describe('cloudCaller function', function () {
        var cloudFunctionArgs, onSuccess, onError, result, postArgs;

        beforeEach(function () {
          functionName = 'foo';
          cloudCaller = cloudCallerFactory(functionName);
          cloudFunctionArgs = {
            a: 1,
            b: 2
          };
          onSuccess = function () {};
          onError = function () {};
        });

        it('should call the Function.POST method and return the results', function () {
          result = cloudCaller(cloudFunctionArgs, onSuccess, onError);
          expect(mocks.Function.POST).toHaveBeenCalled();
          expect(result).toBe(mocks.postResponse);
        });

        it('should pass a params argument to POST with the functionName', function () {
          var paramsArg;
          result = cloudCaller(cloudFunctionArgs, onSuccess, onError);
          postArgs = mocks.Function.POST.argsForCall[0];
          paramsArg = postArgs[0];
          expect(paramsArg).toEqual({functionName: functionName});
        });

        it('should pass an empty object as the data argument to POST if the first argument is not an object', function () {
          var dataArg;

          // No arguments
          result = cloudCaller();
          postArgs = mocks.Function.POST.argsForCall[0];
          dataArg = postArgs[1];
          expect(dataArg).toEqual({});

          // Success callback only
          mocks.Function.POST.reset();
          result = cloudCaller(onSuccess);
          postArgs = mocks.Function.POST.argsForCall[0];
          dataArg = postArgs[1];
          expect(dataArg).toEqual({});

          // Success and error callbacks
          mocks.Function.POST.reset();
          result = cloudCaller(onSuccess, onError);
          postArgs = mocks.Function.POST.argsForCall[0];
          dataArg = postArgs[1];
          expect(dataArg).toEqual({});
        });
      });
    });
  });
});