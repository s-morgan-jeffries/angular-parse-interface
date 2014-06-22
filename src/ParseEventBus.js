angular
  .module('angularParseInterface')
  .factory('ParseEventBus', function ($rootScope) {
    'use strict';

    var ParseEventBus = function ParseEventBus() {
      this._$scope = $rootScope.$new(true);
    };

    ParseEventBus.prototype.on = function (event, action) {
      this._$scope.$on(event, action);
    };

    ParseEventBus.prototype.emit = function (/* event, args */) {
      var scope = this._$scope;
      scope.$emit.apply(scope, arguments);
    };

    return ParseEventBus;
  });