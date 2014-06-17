'use strict';

angular
  .module('devApp', ['angularParseInterface'])
  .factory('appInterface', function (parseInterface) {
    var appConfig = {
      applicationId: 'I7nfCeLupxz0EEL33ADtaOtytoZlZMIKGilruUFR',
      restKey: 'zMmhz0RI1sBLddy2OOGqkcyiCjZUIBJmtv1NgV7I'
    };
    return parseInterface.createApp(appConfig);
  });