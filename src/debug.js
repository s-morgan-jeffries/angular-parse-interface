var $injector;
var appResourceFactory;
var parseInterface;
var appInterface;
var Query;
//var urlFromClassName = function(className) {
//  return '/classes/' + className + '/:objectId';
//};
//var eventBus;

//t0d0: Figure out if you can post arbitrary data via a Resource (for operations)
  // Find a banana not related to test, try to use add relation method as is, use console.log in the transformRequest function
var Banana;
var bananas;
var Monkey;
var Test;
var test;
var relatedBananas;
var unrelatedBananas;

var isRelated = function (b) {
  return !!~_.pluck(relatedBananas, 'objectId').indexOf(b.objectId);
};
var not = function (f) {
  return function () {
    return !f.apply(null, arguments);
  };
};

setTimeout(function() {
  var appConfig = {
    applicationId: 'I7nfCeLupxz0EEL33ADtaOtytoZlZMIKGilruUFR',
    restKey: 'zMmhz0RI1sBLddy2OOGqkcyiCjZUIBJmtv1NgV7I'
  };
  var el = angular.element(document.body);
  $injector = el.injector();
//  var sessionState = $injector.get('$sessionStorage');

  parseInterface = $injector.get('parseInterface');
//  eventBus = $injector.get('eventBus');

//  appInterface = parseInterface.createApp(appConfig);
  appInterface = $injector.get('appInterface');
  Query = appInterface.Query;
  Banana = $injector.get('Banana');
  bananas = Banana.query();
  Monkey = $injector.get('Monkey');

  Test = appInterface.objectFactory('Test');
  tests = Test.query(function (d) {
    test = d[0];
    relatedBananas = (new Query(Banana)).isRelationOf('bananas', test).exec();
    relatedBananas.$promise.then(function () {
//      console.log(relatedBananas);
      unrelatedBananas = _.filter(bananas, not(isRelated));
    });
  });

//  eventBus = appInterface._eventBus;
//  appResourceFactory = appInterface._appResourceFactory;
}, 3000);