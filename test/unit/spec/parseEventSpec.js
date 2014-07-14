'use strict';

describe('Factory: parseEvent', function () {
  var parseEvent, mockDeferred, mockQ, mockParseResourceActions, PARSE_APP_EVENTS;

  beforeEach(function () {
    mockDeferred = {
      promise: {
        then: jasmine.createSpy()
      },
      resolve: jasmine.createSpy(),
      reject: jasmine.createSpy()
    };
    mockQ = {
      defer: function () {
        return mockDeferred;
      }
    };
    spyOn(mockQ, 'defer').andCallThrough();
    mockParseResourceActions = {
      POST: function () {},
      getActionConfig: function (actionName) {
        return this[actionName];
      }
    };
    spyOn(mockParseResourceActions, 'getActionConfig').andCallThrough();
    PARSE_APP_EVENTS = {
      SIGN_IN: 'SIGN_IN',
      SIGN_OUT: 'SIGN_OUT',
      USE_JS_API: 'USE_JS_API',
      USE_REST_API: 'USE_REST_API',
      MODULE_REGISTERED: 'MODULE_REGISTERED',
      MODULE_INIT: 'MODULE_INIT'
    };
    module('angularParseInterface', function ($provide) {
      $provide.value('$q', mockQ);
      $provide.value('parseResourceActions', mockParseResourceActions);
      $provide.value('PARSE_APP_EVENTS', PARSE_APP_EVENTS);
      $provide.value('$log', console);
    });
    inject(function ($injector) {
      parseEvent = $injector.get('parseEvent');
    });
  });

  describe('_parseEventDecorator function', function () {
    var ParseEvent, eventName;

    beforeEach(function () {
      ParseEvent = function () {};
      eventName = 'foo';
    });

    it('should set the className on the ParseEvent object to the supplied eventName', function () {
      parseEvent._parseEventDecorator(ParseEvent, eventName);
      expect(ParseEvent.className).toEqual(eventName);
    });
  });

  describe('_encodeDate function', function () {
    var date, encodedDate;

    beforeEach(function () {
      date = new Date();
    });

    it('should return a formatted Parse Date object', function () {
      var expectedDateObj = {
        __type: 'Date',
        iso: date.toISOString()
      };
      encodedDate = parseEvent._encodeDate(date);
      expect(encodedDate).toEqual(expectedDateObj);
    });

    it('should return nothing if the supplied argument is not a valid JS Date', function () {
      var bool = true,
        num = 1,
        str = 'a string',
        obj = {},
        unDef,
        nothing = null;
      expect(parseEvent._encodeDate(bool)).toBeUndefined();
      expect(parseEvent._encodeDate(num)).toBeUndefined();
      expect(parseEvent._encodeDate(str)).toBeUndefined();
      expect(parseEvent._encodeDate(obj)).toBeUndefined();
      expect(parseEvent._encodeDate(unDef)).toBeUndefined();
      expect(parseEvent._encodeDate(nothing)).toBeUndefined();
    });
  });

  describe('createEventFactory function', function () {
    var moduleName, mocks, eventFactory;

    beforeEach(function () {
      moduleName = 'parseEvent';
      mocks = {};
      // mock Resource
//      mocks.Resource = function () {
//        var props = arguments[0],
//          self = this;
//        angular.forEach(props, function (v, k) {
//          self[k] = v;
//        });
//      };
      mocks.Resource = function () {};
      mocks.POSTresponse = {
        f: function () {}
      };
      mocks.Resource.POST = function () {
        return mocks.POSTresponse;
      };
      spyOn(mocks.Resource, 'POST').andCallThrough();
      mocks.appResourceFactory = function () {
        return mocks.Resource;
      };
      spyOn(mocks, 'appResourceFactory').andCallThrough();
//      mocks.User = {};
      mocks.appEventBus = {
        on: jasmine.createSpy(),
        once: jasmine.createSpy(),
        off: jasmine.createSpy(),
        emit: jasmine.createSpy()
      };
    });

    it('should emit a MODULE_REGISTERED event with its module name', function () {
      eventFactory = parseEvent.createEventFactory(mocks.appResourceFactory, mocks.appEventBus);
      expect(mocks.appEventBus.emit).toHaveBeenCalledWith(PARSE_APP_EVENTS.MODULE_REGISTERED, moduleName);
    });

    it('should register a one-time event handler for a namespaced MODULE_INIT event', function () {
      var eventName = PARSE_APP_EVENTS.MODULE_INIT + '.' + moduleName,
        eventHasHandler = false;
      eventFactory = parseEvent.createEventFactory(mocks.appResourceFactory, mocks.appEventBus);
      expect(mocks.appEventBus.once).toHaveBeenCalled();
      angular.forEach(mocks.appEventBus.once.argsForCall, function (args) {
        eventHasHandler = eventHasHandler || (args[0] === eventName);
        eventHasHandler = eventHasHandler && angular.isFunction(args[1]);
      });
      expect(eventHasHandler).toBeTrue();
    });

    it('should register an event handler for the USE_REST_API event', function () {
      var eventName = PARSE_APP_EVENTS.USE_REST_API,
        eventHasHandler = false;
      eventFactory = parseEvent.createEventFactory(mocks.appResourceFactory, mocks.appEventBus);
      expect(mocks.appEventBus.on).toHaveBeenCalled();
      angular.forEach(mocks.appEventBus.on.argsForCall, function (args) {
        eventHasHandler = eventHasHandler || (args[0] === eventName);
        eventHasHandler = eventHasHandler && angular.isFunction(args[1]);
      });
      expect(eventHasHandler).toBeTrue();
    });

    it('should register an event handler for the USE_JS_API event', function () {
      var eventName = PARSE_APP_EVENTS.USE_JS_API,
        eventHasHandler = false;
      eventFactory = parseEvent.createEventFactory(mocks.appResourceFactory, mocks.appEventBus);
      expect(mocks.appEventBus.on).toHaveBeenCalled();
      angular.forEach(mocks.appEventBus.on.argsForCall, function (args) {
        eventHasHandler = eventHasHandler || (args[0] === eventName);
        eventHasHandler = eventHasHandler && angular.isFunction(args[1]);
      });
      expect(eventHasHandler).toBeTrue();
    });

    it('should return a function', function () {
      expect(eventFactory).toBeFunction();
    });

    describe('eventFactory function', function () {
      var logEvent, eventName, encodedTime;

      beforeEach(function () {
        eventName = 'foo';
        encodedTime = {
          f: function () {}
        };
        spyOn(parseEvent, '_parseEventDecorator');
//        spyOn(parseEvent, '_encodeDate');
        spyOn(parseEvent, '_encodeDate').andReturn(encodedTime);
        eventFactory = parseEvent.createEventFactory(mocks.appResourceFactory, mocks.appEventBus);
      });

      it('should get the POST action from parseResourceActions', function () {
        logEvent = eventFactory(eventName);
        expect(mockParseResourceActions.getActionConfig).toHaveBeenCalledWith('POST');
      });

      it('should call the appResourceFactory function', function () {
        var expectedUrl = '/events/' + eventName,
          expectedParams = {},
          expectedCustomActions = {
            POST: mockParseResourceActions.POST
          };
        logEvent = eventFactory(eventName);
        expect(mocks.appResourceFactory).toHaveBeenCalledWith(expectedUrl, expectedParams, expectedCustomActions);
      });

      it('should call the parseEventDecorator function', function () {
        logEvent = eventFactory(eventName);
        expect(parseEvent._parseEventDecorator).toHaveBeenCalledWith(mocks.Resource, eventName);
      });

      it('should return a function', function () {
        logEvent = eventFactory(eventName);
        expect(logEvent).toBeFunction();
      });

      describe('logEvent function', function () {
        var initFunction, appConfig;

        beforeEach(function () {
          appConfig = {
            currentAPI: 'JS'
          };
          initFunction = mocks.appEventBus.once.argsForCall[0][1];
          logEvent = eventFactory(eventName);
        });

        it('should POST the supplied data using the ParseEvent\'s POST action', function () {
          var data = {
              a: 1,
              b: 2
            },
            expectedPostData = {
              dimensions: data
            };
          initFunction(null, appConfig);
          logEvent(data);
          expect(mocks.Resource.POST).toHaveBeenCalledWith(expectedPostData);
        });

        it('should POST the encoded version of the time if it is supplied', function () {
          var data = {
              a: 1,
              b: 2
            },
            time = new Date(),
            expectedPostData = {
              dimensions: data,
              at: encodedTime
            };
          initFunction(null, appConfig);
          logEvent(data, time);
          expect(parseEvent._encodeDate).toHaveBeenCalledWith(time);
          expect(mocks.Resource.POST).toHaveBeenCalledWith(expectedPostData);
        });

        it('should return whatever is returned from the POST method', function () {
          var data = {
              a: 1,
              b: 2
            },
            response;
          initFunction(null, appConfig);
          response = logEvent(data);
          expect(response).toBe(mocks.POSTresponse);
        });

        it('should not POST or return anything if currentAPI is set to REST', function () {
          var data = {
              a: 1,
              b: 2
            },
            response;
          appConfig.currentAPI = 'REST';
          initFunction(null, appConfig);
          response = logEvent(data);
          expect(mocks.Resource.POST).not.toHaveBeenCalled();
          expect(response).toBeUndefined();
        });

        it('should not POST or return anything if it receives a USE_REST_API event', function () {
          var data = {
              a: 1,
              b: 2
            },
            response,
            handler = mocks.appEventBus.on.argsForCall[0][1];
          appConfig.currentAPI = 'JS';
          initFunction(null, appConfig);
          handler();
          response = logEvent(data);
          expect(mocks.Resource.POST).not.toHaveBeenCalled();
          expect(response).toBeUndefined();
        });

        it('should POST and return the response if it receives a USE_JS_API event', function () {
          var data = {
              a: 1,
              b: 2
            },
            response,
            handler = mocks.appEventBus.on.argsForCall[1][1];
          appConfig.currentAPI = 'REST';
          initFunction(null, appConfig);
          handler();
          response = logEvent(data);
          expect(mocks.Resource.POST).toHaveBeenCalled();
          expect(response).toBeDefined();
        });

      });
    });

  });
});