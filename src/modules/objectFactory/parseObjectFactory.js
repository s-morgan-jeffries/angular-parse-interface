angular
  .module('angularParseInterface.objectFactoryMod', [
    'angularParseInterface.configMod'
  ])
  .factory('parseObjectFactory', function () {
    'use strict';

    // Currently a do-little function. But because I'm going to have to pack a lot of functionality into the basic
    // ParseResource (because some things just can't be added later), this might be necessary for removing some
    // functionality (e.g. making arbitrary HTTP requests).
    var parseObjectDecorator = function (ParseObject, className) {
      ParseObject._setClassName(className);
    };

    var parseObjectFactory = {};

    parseObjectFactory.createObjectFactory = function (appResourceFactory) {
      // The objectFactory function that will be returned
      return function (className/*, defaultParams, customActions*/) {
        // Parse's URL scheme for Objects
        var url = '/classes/' + className + '/:objectId',
          defaultParams = {objectId: '@objectId'},
          customActions = {},
          ParseObject;

        ParseObject = appResourceFactory(url, defaultParams, customActions);

        parseObjectDecorator(ParseObject, className);

        return ParseObject;
      };
    };

    return parseObjectFactory;
  });