'use strict';

describe('Factory: parseObjectFactory', function () {
  var parseObjectFactory;

  beforeEach(function () {
    module('angularParseInterface.objectFactoryMod', function (/*$provide*/) {
//      $provide.value('$rootScope', mockRootScope);
    });
    inject(function ($injector) {
      parseObjectFactory = $injector.get('parseObjectFactory');
    });
  });

  describe('createObjectFactory method', function () {
    var mocks,
      objectFactory;

    beforeEach(function () {
      mocks = {};
      mocks.Resource = function () {};
      mocks.Resource._setClassName = jasmine.createSpy();
      mocks.resourceFactory = function () {
        return mocks.Resource;
      };
      spyOn(mocks, 'resourceFactory').andCallThrough();
    });

    it('should return a function', function () {
      objectFactory = parseObjectFactory.createObjectFactory(mocks.resourceFactory);
      expect(objectFactory).toBeFunction();
    });

    describe('objectFactory function', function () {
      var className, defaultParams, customActions, ParseObject, resourceFactoryArgs;
      beforeEach(function () {
        objectFactory = parseObjectFactory.createObjectFactory(mocks.resourceFactory);
        className = 'SomeClass';
        defaultParams = {};
        customActions = {};
      });

      it('should create a ParseObject by calling the passed in resourceFactory', function () {
        ParseObject = objectFactory(className, defaultParams, customActions);
        expect(mocks.resourceFactory).toHaveBeenCalled();
        expect(ParseObject).toBe(mocks.Resource);
      });

      it('should pass the correct URL to the resourceFactory function', function () {
        var urlArg,
          expectedUrlArg = '/classes/' + className + '/:objectId';
        ParseObject = objectFactory(className, defaultParams, customActions);
        resourceFactoryArgs = mocks.resourceFactory.argsForCall[0];
        urlArg = resourceFactoryArgs[0];
        expect(urlArg).toEqual(expectedUrlArg);
      });

      it('should set a default parameter for the objectId that tries to grab an object\'s objectId property', function () {
        var defaultParamsArg,
          expectedDefaultParamsArg;
        expectedDefaultParamsArg = {
          objectId: '@objectId'
        };
        ParseObject = objectFactory(className);
        resourceFactoryArgs = mocks.resourceFactory.argsForCall[0];
        defaultParamsArg = resourceFactoryArgs[1];
        expect(defaultParamsArg).toEqual(expectedDefaultParamsArg);
      });

      it('should pass an empty set of customActions to the resourceFactory function', function () {
        var customActionsArg,
          expectedCustomActionsArg = {};
        ParseObject = objectFactory(className);
        resourceFactoryArgs = mocks.resourceFactory.argsForCall[0];
        customActionsArg = resourceFactoryArgs[2];
        expect(customActionsArg).toEqual(expectedCustomActionsArg);
      });

      it('should set the className on the ParseObject to the passed in className', function () {
        ParseObject = objectFactory(className, defaultParams, customActions);
        expect(mocks.Resource._setClassName).toHaveBeenCalledWith(className);
      });
    });

  });

});