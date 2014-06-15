var $injector;
var appResourceFactory;
var parseInterface;
var appInterface;
var urlFromClassName = function(className) {
  return '/classes/' + className + '/:objectId';
};
var eventBus;

setTimeout(function() {
  var el = angular.element(document.body);
  $injector = el.injector();
//  var sessionState = $injector.get('$sessionStorage');

  parseInterface = $injector.get('parseInterface');
//  eventBus = $injector.get('eventBus');

  var appConfig = {
    applicationId: 'I7nfCeLupxz0EEL33ADtaOtytoZlZMIKGilruUFR',
    restKey: 'zMmhz0RI1sBLddy2OOGqkcyiCjZUIBJmtv1NgV7I'
  };

  appInterface = parseInterface.createApp(appConfig);
  eventBus = appInterface._eventBus;
  appResourceFactory = appInterface._appResourceFactory;
}, 3000);