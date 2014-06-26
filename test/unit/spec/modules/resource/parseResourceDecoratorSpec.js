'use strict';

xdescribe('Factory: parseResourceDecorator', function () {
  var parseResourceDecorator;

  beforeEach(function () {
    module('angularParseInterface.resourceMod', function (/*$provide*/) {
//      $provide.value('$rootScope', mockRootScope);
    });
    inject(function ($injector) {
      parseResourceDecorator = $injector.get('parseResourceDecorator');
    });
  });

  it('should be a function', function () {
    expect(parseResourceDecorator).toBeFunction();
  });
});