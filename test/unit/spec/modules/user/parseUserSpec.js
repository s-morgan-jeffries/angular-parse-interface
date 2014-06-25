'use strict';

xdescribe('Factory: parseUser', function () {
  var parseUser;

  beforeEach(function () {
    module('angularParseInterface.userMod', function (/*$provide*/) {
//      $provide.value('$rootScope', mockRootScope);
    });
    inject(function ($injector) {
      parseUser = $injector.get('parseUser');
    });
  });

});