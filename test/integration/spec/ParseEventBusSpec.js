'use strict';

describe('Factory: ParseEventBus', function () {
  var ParseEventBus;

  beforeEach(function () {
    module('angularParseInterface');
    inject(function ($injector) {
      ParseEventBus = $injector.get('ParseEventBus');
    });
  });

  it('should return an event bus', function () {
    var eventBus = new ParseEventBus();
    expect(eventBus).toBeObject();
    expect(eventBus.on).toBeFunction();
    expect(eventBus.emit).toBeFunction();
  });

  describe('eventBus', function () {
    var eventBus;

    beforeEach(function () {
      eventBus = new ParseEventBus();
    });

    it('should execute all registered actions in order when an event is triggered', function () {
      var x = 1,
        addThreeToX = function () {
          x += 3;
        },
        multiplyXByFour = function () {
          x *= 4;
        },
        event = 'foo';

      eventBus.on(event, addThreeToX);
      eventBus.on(event, multiplyXByFour);
      eventBus.emit(event);
      // (1 + 3) * 4 == 16
      expect(x).toEqual(16);
    });
  });
});