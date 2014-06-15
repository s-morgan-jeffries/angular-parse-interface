'use strict';

describe('Factory: parseInterface', function () {

  // load the service's module
  beforeEach(module('angularParseInterface'));

//  var parseInterface;

  // instantiate service
  var parseInterface_;
  // Okay, note here that we're using inject() to get the service
  beforeEach(inject(function (parseInterface) {
    parseInterface_ = parseInterface;
  }));

  describe('parseInterface._resourceWrapper', function() {
    var resourceWrapper,
      resource,
      wrappedResource;

    beforeEach(function () {
      resourceWrapper = parseInterface_._resourceWrapper;

      // Mock resource service
      resource = function () {
        var Resource = function Resource () {

        };
        return Resource;
      };
    });
  });

//  // It should be a constructor
//  it('should be a function that takes a single argument', function() {
//    expect(parseInterface_).toBeFunction();
//    expect(parseInterface_.length).toBe(1);
//  });
//
//  it('should accept an object with appId and restApiKey properties and return an object', function() {
//    expect(parseAppConfig.appId).toBeTruthy();
//    expect(parseAppConfig.restApiKey).toBeTruthy();
//    parseInterface = new parseInterface_(parseAppConfig);
//    expect(parseInterface).toBeObject();
//    this.after(function() {
//      parseInterface = undefined;
//    });
//  });
//
//  it('should throw an error when the input argument does not have appId and restApiKey properties', function() {
//    var mockConfig = angular.copy(parseAppConfig);
//    delete mockConfig.appId;
//    expect(function() {
//      parseInterface = new parseInterface_(mockConfig);
//    }).toThrowError();
//    mockConfig = angular.copy(parseAppConfig);
//    delete mockConfig.restApiKey;
//    expect(function() {
//      parseInterface = new parseInterface_(mockConfig);
//    }).toThrowError();
//  });


//  describe('parseInterface instance', function() {
//    beforeEach(function() {
//      parseInterface = new parseInterface_(parseAppConfig);
//    });
//
//    afterEach(function() {
//      parseInterface = undefined;
//    });
//
//    it('should have an _appId equal to that of the config argument', function() {
//      expect(parseInterface._appId).toEqual(parseAppConfig.appId);
//    });
//
//    it('should have a _restApiKey equal to that of the config argument', function() {
//      expect(parseInterface._restApiKey).toEqual(parseAppConfig.restApiKey);
//    });
//
//    it('should have a _baseUrl property of "https://api.parse.com/1"', function() {
//      expect(parseInterface._baseUrl).toEqual('https://api.parse.com/1');
//    });
//
//  });

});