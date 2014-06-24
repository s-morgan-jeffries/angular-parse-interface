'use strict';

describe('Factory: parseQueryBuilder', function () {
  var parseQueryBuilder;

  beforeEach(function () {
    module('angularParseInterface.queryBuilderMod', function (/*$provide*/) {
//      $provide.value('$rootScope', mockRootScope);
    });
    inject(function ($injector) {
      parseQueryBuilder = $injector.get('parseQueryBuilder');
    });
  });

  it('should have a Query constructor function', function () {
    expect(parseQueryBuilder.Query).toBeFunction();
  });

  describe('Query constructor', function () {
    var Query,
      query,
      mockResource;

    beforeEach(function () {
      Query = parseQueryBuilder.Query;
//      console.log(Query);
      mockResource = {};
      query = new Query(mockResource);
    });

    it('should assign the Resource argument to its _Resource property', function () {
      var Resource = query._Resource;
      expect(Resource).toEqual(mockResource);
    });
  });
});