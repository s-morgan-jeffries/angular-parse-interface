angular
  .module('angularParseInterface')
  .factory('parseEvent', function ($q, parseResourceActions, PARSE_APP_EVENTS) {
    'use strict';

    // Currently a do-little function. But because I'm going to have to pack a lot of functionality into the basic
    // ParseResource (because some things just can't be added later), this might be necessary for removing some
    // functionality (e.g. making arbitrary HTTP requests).
    var parseEventDecorator = function (ParseEvent, eventName) {
      ParseEvent.className = eventName;
    };

    var parseEvent = {};

    parseEvent.createEventFactory = function (appResourceFactory, appEventBus) {
      var useJsApi = false,
        moduleName = 'parseEvent',
        // Namespaced initialization event. The appInterface will emit this with the appConfig when the
        // MODULE_REGISTERED event is emitted with our moduleName.
        INIT_EVENT = PARSE_APP_EVENTS.MODULE_INIT + '.' + moduleName;

      //t0d0: Add tests for this
      // Register event handlers
      // This is the handler for the INIT_EVENT
      // Register the handler for the INIT_EVENT
      appEventBus.once(INIT_EVENT, function (event, appConfig) {
        // Determine whether we're using the JS API
        useJsApi = appConfig.currentAPI === 'JS';
      });
      // Now that the handler is set up, we can emit the MODULE_REGISTERED event, which will cause the appInterface to
      // emit the INIT_EVENT with the appConfig
      appEventBus.emit(PARSE_APP_EVENTS.MODULE_REGISTERED, moduleName);
      // On a USE_REST_API event, set useJsApi to false
      appEventBus.on(PARSE_APP_EVENTS.USE_REST_API, function () {
        useJsApi = false;
      });
      // On a USE_JS_API event, set useJsApi to true
      appEventBus.on(PARSE_APP_EVENTS.USE_JS_API, function () {
        useJsApi = true;
      });

      // The objectFactory function that will be returned
      return function (eventName/*, defaultParams, customActions*/) {
        // Parse's URL scheme for Objects
        var url = '/events/' + eventName,
          defaultParams = {},
        // Custom actions from the action library
          customActions = {
            POST: parseResourceActions.getActionConfig('POST')
          },
          ParseEvent;

        ParseEvent = appResourceFactory(url, defaultParams, customActions);

        parseEventDecorator(ParseEvent, eventName);

        var encodeDate = function (date) {
          if (date instanceof Date) {
            return {
              __type: 'Date',
              iso: date.toISOString()
            };
          }
        };

        //t0d0: Add tests for this
        return function logEvent(data, time) {
          var postData = {
            dimensions: data
          };
          if (time) {
            postData.at = encodeDate(time);
          }
          if (useJsApi) {
            return ParseEvent.POST(postData);
          }
        };
      };
    };

    return parseEvent;
  });