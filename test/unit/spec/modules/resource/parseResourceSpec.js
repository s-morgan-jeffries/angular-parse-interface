'use strict';

xdescribe('Factory: parseResource', function () {
  var parseResource;

  beforeEach(function () {
    module('angularParseInterface.resourceMod', function (/*$provide*/) {
//      $provide.value('$rootScope', mockRootScope);
    });
    inject(function ($injector) {
      parseResource = $injector.get('parseResource');
    });
  });

  describe('createAppResourceFactory function', function () {

  });
});