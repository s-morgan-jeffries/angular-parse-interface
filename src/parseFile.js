angular
  .module('angularParseInterface')
  .factory('parseFile', function () {
    'use strict';

    // This should create the File service for an application. I need to see what's out there in terms of file
    // uploaders, but I feel like this should only upload pre-serialized data and that something else should take
    // responsibility for that part of it.
    var parseFile = {};

    // You could use FormData to serialize data and pass that in, but that doesn't work in some older browsers, which
    // might bother some people.

    return parseFile;
  });