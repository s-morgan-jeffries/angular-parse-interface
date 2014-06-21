(function () {
  'use strict';

  angular
    .module('devApp', [
      'angularParseInterface',
      'ngStorage'
    ])
    .factory('appInterface', function (parseInterface, $sessionStorage) {
      var appConfig = {
        applicationId: 'I7nfCeLupxz0EEL33ADtaOtytoZlZMIKGilruUFR',
        restKey: 'zMmhz0RI1sBLddy2OOGqkcyiCjZUIBJmtv1NgV7I'
      };
      return parseInterface.createAppInterface(appConfig, $sessionStorage);
    })
    .factory('Banana', function (appInterface) {
      var Banana = appInterface.objectFactory('Banana');

      Banana.pick = function (color) {
        color = color || 'yellow';
        return new Banana({color: color});
      };

      Banana.prototype.eat = function () {
        this.eatenAt = new Date();
      };

      Banana.prototype.rate = function (rating) {
        this.rating = rating;
      };

      return Banana;
    })
    .factory('Monkey', function (appInterface, Banana, User) {
      var Monkey = appInterface.objectFactory('Monkey');

      Monkey.hasMany('lovers', Monkey);

      Banana.hasOne('owner', Monkey);

      Monkey.createMonkey = function (name) {
        var user = User.current(),
          monkey = new Monkey({name: name});
        monkey.setUserPrivileges(user, {read: true, write: true});
        monkey.$save();
        return monkey;
      };

      Monkey.prototype.pickBanana = function (color) {
        color = color || 'yellow';
        var banana = Banana.pick(color);
        banana.setPointer('owner', this);
        banana.$save();
        return banana;
      };

      Monkey.prototype.fetchBananas = function (opts) {
        var q = new appInterface.Query(Banana);
        q.isRelatedTo('owner', this);
        if (opts && opts.numBananas) {
          q.limit(opts.numBananas);
        }
        if (opts && opts.colors) {
          if (angular.isArray(opts.colors)) {
            q.containedIn('color', opts.colors);
          } else {
            q.equalTo('color', opts.colors);
          }
        }
        return q.exec();
      };

//    Monkey.prototype.takeLover = function (lover) {
//
//    };

      return Monkey;
    })
    .factory('User', function (appInterface) {
      var User = appInterface.User;

//    User.prototype.createMonkey();

      return User;
    });
}());