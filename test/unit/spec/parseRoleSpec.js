'use strict';

xdescribe('Factory: parseRole', function () {
  var parseRole;

  beforeEach(function () {
    module('angularParseInterface', function ($provide) {
      $provide.value('$log', console);
    });
    inject(function ($injector) {
      parseRole = $injector.get('parseRole');
    });
  });
});