'use strict';

describe('Factory: parseDataCodecs', function () {
  var parseDataCodecs;

  beforeEach(function () {
    module('angularParseInterface.resourceMod', function (/*$provide*/) {
//      $provide.value('$rootScope', mockRootScope);
    });
    inject(function ($injector) {
      parseDataCodecs = $injector.get('parseDataCodecs');
    });
  });
});