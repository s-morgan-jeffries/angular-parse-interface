angular
  .module('angularParseInterface')
  .factory('ParseAppEventBus', function ($rootScope) {
    'use strict';

    // Create a new isolated scope for the event bus
    var ParseAppEventBus = function ParseAppEventBus() {
      this._$scope = $rootScope.$new(true);
      this._events = {};
    };

    // Register an event handler
    ParseAppEventBus.prototype.on = function (eventName, handler) {
      // Delegate to the scope's $on method
      var unregisterHandler = this._$scope.$on(eventName, handler);
      // Add the handler and deregistration function to the event handlers array
      var eventHandlers = this._events[eventName] = (this._events[eventName] || []);
      eventHandlers.push({
        handler: handler,
        unregisterHandler: unregisterHandler
      });
    };

    // Unregister an event handler
    ParseAppEventBus.prototype.off = function (eventName, handler) {
      var eventHandlers = (this._events[eventName] || []),
        updatedEventHandlers = [];
      // Loop through all the eventHandlers
      angular.forEach(eventHandlers, function (handlerObj) {
        // If there's no handler (i.e. we're unregistering all handlers for this event) or we've found the handler
        if (!handler || (handlerObj.handler === handler)) {
          // Unregister the handler on the _$scope
          handlerObj.unregisterHandler();
        } else {
          // If neither of the above is true, add this to the new eventHandlers array
          updatedEventHandlers.push(handlerObj);
        }
      });
      // Set the handlersArray to the updated value or, if the new array is empty, to undefined
      this._events[eventName] = updatedEventHandlers.length ? updatedEventHandlers : undefined;
    };

    // Calls the handler function the first time the named event is emitted
    ParseAppEventBus.prototype.once = function (eventName, handler) {
      var eventBus = this;
      // Make a wrapped handler function that will call the handler and then unregister it
      var wrappedHandler = function () {
        handler.apply(handler, arguments);
        eventBus.off(eventName, handler);
      };
      // Delegate to the scope's $on method
      var unregisterHandler = this._$scope.$on(eventName, wrappedHandler);
      // Add the handler and deregistration function to the event handlers array (using the original function allows
      // consumers to use the off function in the expected way)
      var eventHandlers = this._events[eventName] = (this._events[eventName] || []);
      eventHandlers.push({
        handler: handler,
        unregisterHandler: unregisterHandler
      });
    };

    // Trigger an event
    ParseAppEventBus.prototype.emit = function (/* event, args */) {
      var scope = this._$scope;
      // Delegate to the scope's emit method
      scope.$emit.apply(scope, arguments);
    };

    return ParseAppEventBus;
  })
  // A map of event names to the strings that are used on the event bus
  .value('PARSE_APP_EVENTS', {
    SIGN_IN: 'SIGN_IN',
    SIGN_OUT: 'SIGN_OUT',
    USE_JS_API: 'USE_JS_API',
    USE_REST_API: 'USE_REST_API',
    MODULE_REGISTERED: 'MODULE_REGISTERED',
    MODULE_INIT: 'MODULE_INIT'
  });