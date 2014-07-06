angular
  .module('angularParseInterface', [
    'ngResource',
    'ngStorage'
  ])
;

// You still need to get cloud functions, roles, files, and user linking working at minimum. Roles are an extension of
// ACLs, and getting working ACLs will depend on having your decorators set up correctly. The decorators will depend on
// the behavior of non-Resource "Resources" (e.g. cloud functions and files). So you should probably save roles until
// after you get those working.

// Okay, it turns out files are pretty complicated. Do cloud functions (or FB integration) first, then roles.