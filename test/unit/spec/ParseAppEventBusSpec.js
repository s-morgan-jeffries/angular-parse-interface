'use strict';

describe('Factory: ParseAppEventBus', function () {
  var ParseAppEventBus,
    mocks,
    appEventBus;

  beforeEach(function () {
    mocks = {};
    mocks.unregisterHandler = function () {};
    mocks.$scope = {
      $on: function () {
        return mocks.unregisterHandler;
      },
      $emit: jasmine.createSpy()
    };
    spyOn(mocks.$scope, '$on').andCallThrough();
    mocks.$rootScope = {
      $new: function () {
        return mocks.$scope;
      }
    };
    spyOn(mocks.$rootScope, '$new').andCallThrough();
    module('angularParseInterface', function ($provide) {
      $provide.value('$rootScope', mocks.$rootScope);
    });
    inject(function ($injector) {
      ParseAppEventBus = $injector.get('ParseAppEventBus');
    });
  });

  it('should call the $rootScope.$new method with true', function () {
    appEventBus = new ParseAppEventBus();
    expect(mocks.$rootScope.$new).toHaveBeenCalledWith(true);
  });

  it('should return an event bus', function () {
    appEventBus = new ParseAppEventBus();
    expect(appEventBus).toBeObject();
    expect(appEventBus.on).toBeFunction();
    expect(appEventBus.emit).toBeFunction();
  });

  describe('appEventBus', function () {

    beforeEach(function () {
      appEventBus = new ParseAppEventBus();
    });

    it('should have a _$scope property set to the return value of $rootScope.$new', function () {
      var scope = appEventBus._$scope;
      expect(scope).toBe(mocks.$scope);
    });

    it('should have an _events property set to an empty object', function () {
      var events = appEventBus._events;
      expect(events).toEqual({});
    });

    describe('on method', function () {
      var scope, events, eventName, handler;

      beforeEach(function () {
        scope = appEventBus._$scope;
        events = appEventBus._events;
        eventName = 'foo';
        handler = function () {};
      });

      it('should delegate to its _$scope\'s $on method', function () {
        appEventBus.on(eventName, handler);
        expect(scope.$on).toHaveBeenCalledWith(eventName, handler);
      });

      it('should create an array-valued property sharing the eventName\'s name on the _event object if it does not exist', function () {
        expect(events[eventName]).toBeUndefined();
        appEventBus.on(eventName, handler);
        expect(events[eventName]).toBeDefined();
        expect(events[eventName]).toBeArray();
      });

      it('should add an object with the handler and a deregistration function to the event handler array', function () {
        var handlerArray, handlerObj;
        appEventBus.on(eventName, handler);
        handlerArray = events[eventName];
        handlerObj = handlerArray[0];
        expect(handlerObj.handler).toBe(handler);
        expect(handlerObj.unregisterHandler).toBe(mocks.unregisterHandler);
      });
    });

    describe('off method', function () {
      var events, eventName, handler, handler2, unregisterHandler, unregisterHandler2;

      beforeEach(function () {
        var handlerArray;
        eventName = 'foo';
        handler = function () {};
        handler2 = function () {};
        unregisterHandler = jasmine.createSpy();
        unregisterHandler2 = function () {};
        events = appEventBus._events;
        handlerArray = events[eventName] = [];
        handlerArray.push({
          handler: handler,
          unregisterHandler: unregisterHandler
        });
        handlerArray.push({
          handler: handler2,
          unregisterHandler: unregisterHandler2
        });
      });

      it('should call the unregisterHandler function for the supplied handler on the supplied eventName', function () {
        appEventBus.off(eventName, handler);
        expect(unregisterHandler).toHaveBeenCalled();
      });

      it('should remove the handler object for the supplied handler on the supplied eventName from the handlerArray', function () {
        var inArray = false,
          handlerArray = appEventBus._events[eventName];
        angular.forEach(handlerArray, function (handlerObj) {
          inArray = inArray || (handlerObj.handler === handler);
        });
        // It should be there
        expect(inArray).toBeTrue();

        appEventBus.off(eventName, handler);
        // We have to update our reference to this
        handlerArray = appEventBus._events[eventName];
        inArray = false;
        angular.forEach(handlerArray, function (handlerObj) {
          inArray = inArray || (handlerObj.handler === handler);
        });
        // Now it should not be there
        expect(inArray).toBeFalse();
      });

      it('should not remove any other handler objects from the handlerArray', function () {
        var inArray = false,
          handlerArray = appEventBus._events[eventName];
        angular.forEach(handlerArray, function (handlerObj) {
          inArray = inArray || (handlerObj.handler === handler2);
        });
        // It should be there
        expect(inArray).toBeTrue();

        appEventBus.off(eventName, handler);
        // We have to update our reference to this
        handlerArray = appEventBus._events[eventName];
        inArray = false;
        angular.forEach(handlerArray, function (handlerObj) {
          inArray = inArray || (handlerObj.handler === handler2);
        });
        // It should still be there
        expect(inArray).toBeTrue();
      });

    });

    describe('emit method', function () {
      it('should delegate to its _$scope\'s $emit method', function () {
        var scope = appEventBus._$scope,
          event = 'foo',
          data1 = {},
          data2 = {};
        appEventBus.emit(event, data1, data2);
        expect(scope.$emit).toHaveBeenCalledWith(event, data1, data2);
      });
    });
  });
});