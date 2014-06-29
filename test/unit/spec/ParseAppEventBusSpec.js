'use strict';

describe('Factory: ParseAppEventBus', function () {
  var ParseAppEventBus,
    mockRootScope = {
      $new: function () {
        return {
          _registered: [],
          $on: function (event, action) {
            var registeredEvents = this._registered;
            registeredEvents.push({
              event: event,
              action: action
            });
          },
          _emitted: [],
          $emit: function (event/*, args */) {
            var emitted = this._emitted,
              args = [].slice.call(arguments, 1);

            emitted.push({
              event: event,
              args: args
            });
          }
        };
      }
    };

  beforeEach(function () {
    module('angularParseInterface', function ($provide) {
      $provide.value('$rootScope', mockRootScope);
    });
    inject(function ($injector) {
      ParseAppEventBus = $injector.get('ParseAppEventBus');
    });
  });

  it('should return an event bus', function () {
    var eventBus = new ParseAppEventBus();
    expect(eventBus).toBeObject();
    expect(eventBus.on).toBeFunction();
    expect(eventBus.emit).toBeFunction();
  });

  describe('eventBus', function () {
    var eventBus;

    beforeEach(function () {
      eventBus = new ParseAppEventBus();
    });

    it('should have its own _$scope', function () {
      var scope = eventBus._$scope;
      expect(scope).toBeObject();
      expect(scope.$on).toBeFunction();
      expect(scope.$emit).toBeFunction();
    });

    describe('on method', function () {
      it('should register an event with its _$scope', function () {
        var scope = eventBus._$scope,
          registeredEvents = scope._registered,
          event = 'foo',
          handler = function () {},
          thisEvent;

        eventBus.on(event, handler);
        thisEvent = registeredEvents.pop();
        expect(thisEvent.event).toEqual(event);
        expect(thisEvent.action).toEqual(handler);
      });
    });

    describe('emit method', function () {
      it('should trigger the event on its _$scope', function () {
        var scope = eventBus._$scope,
          emittedEvents = scope._emitted,
          event = 'foo',
          args = [1, 'a', null],
          thisEvent;

        eventBus.emit(event, args[0], args[1], args[2]);
        thisEvent = emittedEvents.pop();
        expect(thisEvent.event).toEqual(event);
        expect(thisEvent.args).toEqual(args);
      });
    });
  });
});