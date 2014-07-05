angular
  .module('angularParseInterface')
  .factory('parseEvent', function ($q, parseResourceActions) {
    'use strict';

    // Currently a do-little function. But because I'm going to have to pack a lot of functionality into the basic
    // ParseResource (because some things just can't be added later), this might be necessary for removing some
    // functionality (e.g. making arbitrary HTTP requests).
    var parseEventDecorator = function (ParseEvent, eventName) {
      ParseEvent.className = eventName;
    };

    var parseEvent = {};

    parseEvent.createEventFactory = function (appResourceFactory) {
      // The objectFactory function that will be returned
      return function (eventName/*, defaultParams, customActions*/) {
        // Parse's URL scheme for Objects
        var url = '/events/' + eventName,
          defaultParams = {},
        // Custom actions from the action library
          customActions = {
            POST: parseResourceActions.getActionConfig('POST')
          },
          ParseEvent,
          useJSApi = false;

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

        if (!useJSApi) {
          return;
        }

        return function logEvent(data, time) {
          var postData = {
            dimensions: data
          };
          if (time) {
            postData.at = encodeDate(time);
          }
          if (useJSApi) {
            return ParseEvent.POST(postData);
          }
        };
      };
    };

    return parseEvent;
  });