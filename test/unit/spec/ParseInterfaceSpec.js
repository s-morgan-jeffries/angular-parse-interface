'use strict';

describe('Factory: parseInterface', function () {

  var parseInterface,
    appInterface,
    $httpBackend,
    callback,
    appConfig = {
      applicationId: '12345',
      restKey: 'abcde'
    },
    clientStore = {};

  // load the service's module
  beforeEach(function () {
    var $resource, $log, $rootScope;
    inject(function ($injector) {
      $resource = $injector.get('$resource');
    });
    module('angularParseInterface', function ($provide) {
      $provide.value('$resource', $resource);
    });
  });

  // instantiate service
  // Okay, note here that we're using inject() to get the service
  beforeEach(inject(function ($injector) {
    $httpBackend = $injector.get('$httpBackend');
    parseInterface = $injector.get('parseInterface');
    callback = jasmine.createSpy();
  }));

  afterEach(function() {
    $httpBackend.verifyNoOutstandingExpectation();
  });


//  it('should be trivially true', function () {
//    expect(true).toBe(true);
//  });

  describe('createAppInterface', function () {
    it('should return an appInterface', function () {
//      console.log(_.keys(parseInterface));
//      console.log(parseInterface.$rootScope);
      appInterface = parseInterface.createAppInterface(appConfig, clientStore);
      expect(angular.isObject(appInterface)).toBeTrue();
    });

    xdescribe('appInterface', function () {

      beforeEach(function () {
        appInterface = parseInterface.createAppInterface(appConfig, clientStore);
      });

      xdescribe('objectFactory', function () {

      });

      xdescribe('User', function () {});

      xdescribe('Query', function () {});

    });
  });
});