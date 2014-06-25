'use strict';

xdescribe('Factory: parseObjectFactory', function () {
  var parseObjectFactory;

  beforeEach(function () {
    module('angularParseInterface.userMod', function (/*$provide*/) {
//      $provide.value('$rootScope', mockRootScope);
    });
    inject(function ($injector) {
      parseObjectFactory = $injector.get('parseObjectFactory');
    });
  });

});