'use strict';

xdescribe('Factory: parseEvent', function () {
  var parseEvent;

  beforeEach(function () {
    module('angularParseInterface', function ($provide) {
      $provide.value('$log', console);
    });
    inject(function ($injector) {
      parseEvent = $injector.get('parseEvent');
    });
  });
});