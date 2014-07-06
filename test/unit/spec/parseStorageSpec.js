'use strict';

describe('Factory: parseStorage', function () {
  var parseStorage,
    mockLocalStorage = {},
    mockSessionStorage = {};

  beforeEach(function () {
    module('angularParseInterface', function ($provide) {
      $provide.value('$log', console);
      $provide.value('$localStorage', mockLocalStorage);
      $provide.value('$sessionStorage', mockSessionStorage);
    });
    inject(function ($injector) {
      parseStorage = $injector.get('parseStorage');
    });
  });

  it('should have a localStorage property equal to $localStorage', function () {
    expect(parseStorage.localStorage).toBe(mockLocalStorage);
  });

  it('should have a sessionStorage property equal to $sessionStorage', function () {
    expect(parseStorage.sessionStorage).toBe(mockSessionStorage);
  });
});