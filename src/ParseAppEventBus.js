angular
  .module('angularParseInterface')
  .factory('ParseAppEventBus', function ($rootScope) {
    'use strict';

    // Create a new isolated scope for the event bus
    var ParseAppEventBus = function ParseAppEventBus() {
      this._$scope = $rootScope.$new(true);
    };

    // Register an event handler
    ParseAppEventBus.prototype.on = function (event, handler) {
      // Delegate to the scope's $on method
      this._$scope.$on(event, handler);
    };

    // Trigger an event
    ParseAppEventBus.prototype.emit = function (/* event, args */) {
      var scope = this._$scope;
      // Delegate to the scope's emit method
      scope.$emit.apply(scope, arguments);
    };

    return ParseAppEventBus;
  });