angular.module('angularParseInterface.resourceMod', [
  'ngResource',
  'angularParseInterface.configMod'
])
  .value('_BASE_URL_', 'https://api.parse.com/1');