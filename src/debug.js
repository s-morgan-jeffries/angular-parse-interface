var $injector;
var appResourceFactory;
var parseInterface;
var appInterface;
var Query;
//var urlFromClassName = function(className) {
//  return '/classes/' + className + '/:objectId';
//};
//var eventBus;
var Banana;
var Monkey;

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
  Monkey = $injector.get('Monkey');
//  eventBus = appInterface._eventBus;
//  appResourceFactory = appInterface._appResourceFactory;
}, 3000);