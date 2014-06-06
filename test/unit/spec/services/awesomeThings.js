'use strict';

describe('Factory: awesomeThingsService', function () {

  // load the service's module
  beforeEach(module('angular-parse-interface'));

  // instantiate service
  var _awesomeThingsService;
  // Okay, note here that we're using inject() to get the service
  beforeEach(inject(function (awesomeThingsService) {
    _awesomeThingsService = awesomeThingsService;
  }));

  it('should exist', function () {
    expect(!!_awesomeThingsService).toBe(true);
  });

  describe('getAwesomeThings method', function() {
    var awesomeThings;

    beforeEach(function() {
      awesomeThings = _awesomeThingsService.getAwesomeThings();
    });

    it('should return a value', function () {
      expect(!!awesomeThings).toBe(true);
    });

    describe('awesomeThings', function() {
      it('should be an array of objects', function() {
        var acc = true;
        expect(angular.isArray(awesomeThings)).toBe(true);
        angular.forEach(awesomeThings, function(v) {
          acc = acc && angular.isObject(v);
        });
        expect(acc).toBe(true);
      });
      it('should have elements that have both `thing` and `description` properties', function() {
        var acc = true;
        angular.forEach(awesomeThings, function(v) {
          acc = acc && v.hasOwnProperty('thing') && v.hasOwnProperty('description');
        });
        expect(acc).toBe(true);
      });
      it('should have a total of three elements', function() {
        expect(awesomeThings.length).toEqual(3);
      });

    });
  });

});
