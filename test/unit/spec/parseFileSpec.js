'use strict';

xdescribe('Factory: parseFile', function () {
  var parseFile;

  beforeEach(function () {
    module('angularParseInterface', function ($provide) {
      $provide.value('$log', console);
    });
    inject(function ($injector) {
      parseFile = $injector.get('parseFile');
    });
  });
});