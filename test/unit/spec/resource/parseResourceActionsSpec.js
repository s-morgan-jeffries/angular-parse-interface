'use strict';

describe('Factory: parseResourceActions', function () {
  var parseResourceActions,
    mainAction,
    action,
    decoratorFx,
    mocks,
    instance;

  beforeEach(function () {
    module('angularParseInterface', function ($provide) {
      $provide.value('$log', console);
    });
    inject(function ($injector) {
      parseResourceActions = $injector.get('parseResourceActions');
    });
  });

  beforeEach(function () {
    mocks = {};
    mocks.Resource = function () {
      var self = this;
      angular.forEach(arguments[0], function (v, k) {
        self[k] = v;
      });
//      console.log(self);
    };
//    mocks.successFx = jas
  });

//  describe('getActionConfig method', function () {
//    it('should return a different object on each call with the same arguments', function () {
//      var firstConfig, secondConfig;
//    });
//  });

  describe('get action', function () {

    beforeEach(function () {
      mainAction = parseResourceActions.getActionConfig('get');
    });

    describe('actions', function () {

      describe('get', function () {

        beforeEach(function () {
          action = mainAction.actionConfigs.get;
        });

        it('should have a method of GET', function () {
          expect(action.method).toEqual('GET');
        });

//        xit('should have a setResource function that sets the value of the Resource variable', function () {
//          spyOn(mocks, 'Resource');
//          action.setResource(mocks.Resource);
//          action.transformResponse({});
//          expect(mocks.Resource).toHaveBeenCalled();
//        });
//
//        xit('should have a transformResponse function that returns a new instance of the Resource', function () {
//          action.setResource(mocks.Resource);
//          var data = action.transformResponse({});
//          expect(data instanceof mocks.Resource).toBeTrue();
//        });

      });
    });
  });

  describe('delete action', function () {

    beforeEach(function () {
      mainAction = parseResourceActions.getActionConfig('delete');
    });

    describe('actions', function () {

      describe('delete', function () {

        beforeEach(function () {
          action = mainAction.actionConfigs.delete;
        });

        it('should have a method of DELETE', function () {
          expect(action.method).toEqual('DELETE');
        });

      });
    });
  });

  describe('POST action', function () {

    beforeEach(function () {
      mainAction = parseResourceActions.getActionConfig('POST');
    });

    describe('actions', function () {

      describe('POST', function () {

        beforeEach(function () {
          action = mainAction.actionConfigs.POST;
        });

        it('should have a method of POST', function () {
          expect(action.method).toEqual('POST');
        });

      });
    });

    describe('decorator', function () {

      beforeEach(function () {
        decoratorFx = mainAction.decorator;
        mocks.Resource.POST = function () {};
        mocks.Resource.prototype.$POST = function () {};
      });

      it('should remove the $POST method from the prototype', function () {
        decoratorFx(mocks.Resource);
        expect(mocks.Resource.POST).toBeFunction();
        expect(mocks.Resource.prototype.$POST).toBeUndefined();
      });

      it('should create a new POST method on Resource', function () {
        var POST = mocks.Resource.POST;
        decoratorFx(mocks.Resource);
        expect(mocks.Resource.POST).not.toBe(POST);
      });

      describe('decorated POST method', function () {
        var instance, promise, POST, params, data, onSuccess, onError, res;

        beforeEach(function () {
          promise = {
            then: jasmine.createSpy()
          };
          instance = {
            $promise: promise,
            $resolved: false
          };
          mocks.Resource.POST = function () {
            return instance;
          };
          spyOn(mocks.Resource, 'POST').andCallThrough();
          params = {};
          data = {};
          onSuccess = function () {};
          onError = function () {};
          POST = mocks.Resource.POST;
          decoratorFx(mocks.Resource);
        });

        it('should pass its arguments to the original POST method', function () {
          res = mocks.Resource.POST(params, data, onSuccess, onError);
          expect(POST).toHaveBeenCalledWith(params, data, onSuccess, onError);
        });

        it('should return an object that is not the instance but that contains its $promise and $resolved properties', function () {
          res = mocks.Resource.POST(params, data, onSuccess, onError);
          expect(res).not.toBe(instance);
          expect(res.$promise).toBe(instance.$promise);
          expect(res.$resolved).toBe(instance.$resolved);
        });

        it('should copy all data properties except for $promise to the response on success', function () {
          var successFx,
            successData = {
              a: {},
              b: {},
              $promise: {}
            };
          res = mocks.Resource.POST(params, data, onSuccess, onError);
          successFx = promise.then.argsForCall[0][0];
          successFx(successData);
          expect(res.a).toBe(successData.a);
          expect(res.b).toBe(successData.b);
          // This should be true for the mock successData. For real successData, the promises might be the same.
          expect(res.$promise).not.toBe(successData.$promise);
          expect(res.$promise).toBe(instance.$promise);
        });

        it('should copy error properties to the response and set $resolved to true on error', function () {
          var errorFx,
            error = {
              data: {},
              status: 401,
              headers: function () {},
              config: {},
              statusText: 'badness'
            };
          res = mocks.Resource.POST(params, data, onSuccess, onError);
          errorFx = promise.then.argsForCall[0][1];
          errorFx(error);
          expect(res.data).toBe(error.data);
          expect(res.status).toEqual(error.status);
          expect(res.headersGetter).toBe(error.headers);
          expect(res.config).toBe(error.config);
          expect(res.statusText).toEqual(error.statusText);
          expect(res.$resolved).toBeTrue();
          // This shouldn't change
          expect(res.$promise).toBe(instance.$promise);
        });

      });
    });
  });

  describe('PUT action', function () {

    beforeEach(function () {
      mainAction = parseResourceActions.getActionConfig('PUT');
    });

    describe('actions', function () {

      describe('PUT', function () {

        beforeEach(function () {
          action = mainAction.actionConfigs.PUT;
        });

        it('should have a method of PUT', function () {
          expect(action.method).toEqual('PUT');
        });

      });
    });

    describe('decorator', function () {

      beforeEach(function () {
        decoratorFx = mainAction.decorator;
        mocks.Resource.PUT = function () {};
        mocks.Resource.prototype.$PUT = function () {};
      });

      it('should create a new $PUT method on the prototype', function () {
        var $PUT = mocks.Resource.prototype.$PUT;
        decoratorFx(mocks.Resource);
        expect(mocks.Resource.prototype.$PUT).not.toBe($PUT);
      });

      it('should create a new PUT method on Resource', function () {
        var PUT = mocks.Resource.PUT;
        decoratorFx(mocks.Resource);
        expect(mocks.Resource.PUT).not.toBe(PUT);
      });

      describe('$PUT method', function () {
        var objectId,
          data,
          successFx,
          errorFx,
          PUTargs;

        beforeEach(function () {
          decoratorFx(mocks.Resource);
          spyOn(mocks.Resource, 'PUT');
          instance = new mocks.Resource();
          instance.objectId = objectId = '12345';
          data = {a: 1, b: 2};
          successFx = function () {};
          errorFx = function () {};
          instance.$PUT(data, successFx, errorFx);
          PUTargs = mocks.Resource.PUT.argsForCall[0];
        });

        it('should call the PUT method on Resource', function () {
          expect(mocks.Resource.PUT).toHaveBeenCalled();
        });

        it('should create a parameter argument from its objectId and pass it as the first argument to PUT', function () {
          var paramArg = PUTargs[0];
          expect(paramArg.objectId).toEqual(objectId);
        });

        it('should pass its data, successFx, and errorFx arguments to PUT unmodified', function () {
          expect(PUTargs[1]).toBe(data);
          expect(PUTargs[2]).toBe(successFx);
          expect(PUTargs[3]).toBe(errorFx);
        });

      });


      describe('decorated PUT method', function () {
        var instance, promise, PUT, params, data, onSuccess, onError, res;

        beforeEach(function () {
          promise = {
            then: jasmine.createSpy()
          };
          instance = {
            $promise: promise,
            $resolved: false
          };
          mocks.Resource.PUT = function () {
            return instance;
          };
          spyOn(mocks.Resource, 'PUT').andCallThrough();
          params = {};
          data = {};
          onSuccess = function () {};
          onError = function () {};
          PUT = mocks.Resource.PUT;
          decoratorFx(mocks.Resource);
        });

        it('should pass its arguments to the original PUT method', function () {
          res = mocks.Resource.PUT(params, data, onSuccess, onError);
          expect(PUT).toHaveBeenCalledWith(params, data, onSuccess, onError);
        });

        it('should return an object that is not the instance but that contains its $promise and $resolved properties', function () {
          res = mocks.Resource.PUT(params, data, onSuccess, onError);
          expect(res).not.toBe(instance);
          expect(res.$promise).toBe(instance.$promise);
          expect(res.$resolved).toBe(instance.$resolved);
        });

        it('should copy all data properties except for $promise to the response on success', function () {
          var successFx,
            successData = {
              a: {},
              b: {},
              $promise: {}
            };
          res = mocks.Resource.PUT(params, data, onSuccess, onError);
          successFx = promise.then.argsForCall[0][0];
          successFx(successData);
          expect(res.a).toBe(successData.a);
          expect(res.b).toBe(successData.b);
          // This should be true for the mock successData. For real successData, the promises might be the same.
          expect(res.$promise).not.toBe(successData.$promise);
          expect(res.$promise).toBe(instance.$promise);
        });

        it('should copy error properties to the response and set $resolved to true on error', function () {
          var errorFx,
            error = {
              data: {},
              status: 401,
              headers: function () {},
              config: {},
              statusText: 'badness'
            };
          res = mocks.Resource.PUT(params, data, onSuccess, onError);
          errorFx = promise.then.argsForCall[0][1];
          errorFx(error);
          expect(res.data).toBe(error.data);
          expect(res.status).toEqual(error.status);
          expect(res.headersGetter).toBe(error.headers);
          expect(res.config).toBe(error.config);
          expect(res.statusText).toEqual(error.statusText);
          expect(res.$resolved).toBeTrue();
          // This shouldn't change
          expect(res.$promise).toBe(instance.$promise);
        });

      });

    });
  });

  describe('query action', function () {

    beforeEach(function () {
      mainAction = parseResourceActions.getActionConfig('query');
    });

    describe('actions', function () {

      describe('query', function () {

        var data;

        beforeEach(function () {
          action = mainAction.actionConfigs.query;
          data = {
            results: [
              {a: 1, b: 2},
              {c: 3, d: 4}
            ]
          };
        });

        it('should have a method of GET', function () {
          expect(action.method).toEqual('GET');
        });

        it('should have an isArray value of true', function () {
          expect(action.isArray).toEqual(true);
        });

        it('should have a setResource function that sets the value of the Resource variable', function () {
          spyOn(mocks, 'Resource');
          action.setResource(mocks.Resource);
          action.transformResponse(data);
          expect(mocks.Resource).toHaveBeenCalled();
        });

        describe('transformResponse method', function () {
          var transformedData;

          beforeEach(function () {
            action.setResource(mocks.Resource);
          });

          it('should return a Resource instance for each item in the results array', function () {
            transformedData = action.transformResponse(data);
            angular.forEach(transformedData, function (item, idx) {
              expect(item instanceof mocks.Resource).toBeTrue();
              angular.forEach(item, function (val, key) {
                expect(val).toEqual(data.results[idx][key]);
              });
            });
          });

          it('should return an empty array if the results array is empty', function () {
            data = {
              results: []
            };
            transformedData = action.transformResponse(data);
            expect(transformedData).toEqual([]);
          });

        });

      });

      describe('count', function () {

        beforeEach(function () {
          action = mainAction.actionConfigs.count;
        });

        it('should have a method of GET', function () {
          expect(action.method).toEqual('GET');
        });

        it('should have an isArray value of false', function () {
          expect(action.isArray).toEqual(false);
        });

        it('should have a transformResponse method that returns an object with the count', function () {
          var count = 20;
          var data = action.transformResponse({a: 1, b: 2, count: count});
          expect(data.count).toEqual(count);
        });

      });
    });

    describe('decorator', function () {

      var countFx, queryFx, queryParams, successFx, errorFx;

      beforeEach(function () {
        decoratorFx = mainAction.decorator;
        mocks.Resource.query = function () {};
        spyOn(mocks.Resource, 'query');
        queryFx = mocks.Resource.query;
        mocks.Resource.prototype.$query = function () {};
        mocks.Resource.count = function () {};
        spyOn(mocks.Resource, 'count');
        countFx = mocks.Resource.count;
        mocks.Resource.prototype.$count = function () {};
        decoratorFx(mocks.Resource);
        successFx = function () {};
        errorFx = function () {};
      });

      it('should delete the Resource\'s count method and the prototype\'s $count and $query methods', function () {
        expect(mocks.Resource.query).toBeFunction();
        expect(mocks.Resource.count).toBeUndefined();
        expect(mocks.Resource.prototype.$query).toBeUndefined();
        expect(mocks.Resource.prototype.$count).toBeUndefined();
      });

      describe('decorated query function', function () {
        it('it should call the original count function with the same arguments if the query parameters include a count property equal to 1', function () {
          var args;
          spyOn(mocks.Resource, 'query').andCallThrough();
          queryParams = {
            a: 1,
            b: 2,
            count: 1
          };
          mocks.Resource.query(queryParams, successFx, errorFx);
          args = mocks.Resource.query.argsForCall[0];
          expect(countFx).toHaveBeenCalledWith(queryParams, successFx, errorFx);
        });
        it('it should otherwise call the original query function with the same arguments', function () {
          queryParams = {
            a: 1,
            b: 2
          };
          mocks.Resource.query(queryParams, successFx, errorFx);
          expect(queryFx).toHaveBeenCalledWith(queryParams, successFx, errorFx);
        });
      });

    });
  });

  describe('save action', function () {

    beforeEach(function () {
      mainAction = parseResourceActions.getActionConfig('save');
    });

    describe('actions', function () {

      describe('save', function () {

        beforeEach(function () {
          action = mainAction.actionConfigs.save;
        });

        it('should have a method property', function () {
          expect(action.method).toBeDefined();
        });

      });

      describe('create', function () {

        beforeEach(function () {
          action = mainAction.actionConfigs.create;
        });

        it('should have a method of POST', function () {
          expect(action.method).toEqual('POST');
        });

      });

      describe('update', function () {

        beforeEach(function () {
          action = mainAction.actionConfigs.update;
        });

        it('should have a method of PUT', function () {
          expect(action.method).toEqual('PUT');
        });

      });
    });

    describe('decorator', function () {

      var saveFx, createFx, updateFx, successFx, errorFx;

      beforeEach(function () {
        decoratorFx = mainAction.decorator;
        mocks.Resource.save = function () {};
        saveFx = mocks.Resource.save;
        mocks.Resource.prototype.$save = function () {};
        mocks.Resource.create = function () {
//          console.log(arguments[0]);
        };
        spyOn(mocks.Resource, 'create').andCallThrough();
        createFx = mocks.Resource.create;
        mocks.Resource.prototype.$create = function () {};
        mocks.Resource.update = function () {
//          console.log(arguments[0]);
        };
        spyOn(mocks.Resource, 'update').andCallThrough();
        updateFx = mocks.Resource.update;
        mocks.Resource.prototype.$update = function () {};
        decoratorFx(mocks.Resource);
        successFx = function () {};
        errorFx = function () {};
      });

      it('should replace the original save method with a new method', function () {
        expect(mocks.Resource.save).toBeFunction();
        expect(mocks.Resource.save).not.toBe(saveFx);
      });

      it('should delete the create, update, $create, and $update methods', function () {
        expect(mocks.Resource.create).toBeUndefined();
        expect(mocks.Resource.update).toBeUndefined();
        expect(mocks.Resource.prototype.$create).toBeUndefined();
        expect(mocks.Resource.prototype.$update).toBeUndefined();
      });

      describe('decorated save function', function () {
        var objectId, successFx, errorFx;

        beforeEach(function () {
          instance = new mocks.Resource();
          instance.objectId = objectId = '12345';
          instance.data1 = 1;
          instance.data2 = 2;
          successFx = jasmine.createSpy();
          errorFx = jasmine.createSpy();
        });

        it('should delegate to the original update function if the data being saved has an objectId', function () {
          mocks.Resource.save(instance);
          expect(updateFx).toHaveBeenCalled();
        });

        it('should delegate to the original create function if the data being saved has no objectId', function () {
          delete instance.objectId;
          mocks.Resource.save(instance);
          expect(createFx).toHaveBeenCalled();
        });

        it('should call the underlying save function with four arguments: two objects and two functions', function () {
          var args;
          mocks.Resource.save(instance);
          args = updateFx.argsForCall[0];
          expect(args.length).toEqual(4);
          expect(args[0]).toBeObject();
          expect(args[1]).toBeObject();
          expect(args[2]).toBeFunction();
          expect(args[3]).toBeFunction();
        });

        it('should pass an empty object as the first argument if it receives only one object argument', function () {
          var paramsArg;
          mocks.Resource.save(instance);
          paramsArg = updateFx.argsForCall[0][0];
          expect(paramsArg).toEqual({});
        });

        it('should pass an instance of Resource unchanged as the second argument', function () {
          var dataArg;
          mocks.Resource.save(instance);
          dataArg = updateFx.argsForCall[0][1];
          expect(dataArg).toBe(instance);
        });

        it('should create an instance from a single object argument or second object argument and pass it as the second argument to the save function', function () {
          var nonInstanceObj, dataArg;
          delete instance.objectId;
          nonInstanceObj = angular.copy(instance);
          mocks.Resource.save(nonInstanceObj);
          dataArg = createFx.argsForCall[0][1];
          // All the data should still be there
          angular.forEach(nonInstanceObj, function (v, k) {
            expect(v).toEqual(dataArg[k]);
          });
          // But it should be an instance of Resource
          expect(dataArg instanceof mocks.Resource).toBeTrue();
          createFx.reset();
          mocks.Resource.save({}, nonInstanceObj);
          dataArg = createFx.argsForCall[0][1];
          // All the data should still be there
          angular.forEach(nonInstanceObj, function (v, k) {
            expect(v).toEqual(dataArg[k]);
          });
          // But it should be an instance of Resource
          expect(dataArg instanceof mocks.Resource).toBeTrue();
        });

        it('it should wrap the original successFx in a wrapper that adds puts the original instance values back on the instance, unless they\'ve been overwritten', function () {
          var wrappedSuccessFx,
            headers = {},
            newVal = 50;
          mocks.Resource.save({}, instance, successFx, errorFx);
          wrappedSuccessFx = updateFx.argsForCall[0][2];
          delete instance.objectId;
          wrappedSuccessFx(instance, headers);
          expect(instance.objectId).toEqual(objectId);
          expect(successFx).toHaveBeenCalledWith(instance, headers);
          instance.objectId = newVal;
          wrappedSuccessFx(instance, headers);
          expect(instance.objectId).toEqual(newVal);
        });

        it('it should wrap the original errorFx in a wrapper that resets the original instance values back on the instance', function () {
          var wrappedErrorFx,
            newVal = 50,
            response = {};
          mocks.Resource.save({}, instance, successFx, errorFx);
          wrappedErrorFx = updateFx.argsForCall[0][3];
          delete instance.objectId;
          wrappedErrorFx(response);
          expect(instance.objectId).toEqual(objectId);
          expect(errorFx).toHaveBeenCalledWith(response);
          instance.objectId = newVal;
          wrappedErrorFx(response);
          expect(instance.objectId).toEqual(objectId);
        });

      });

    });
  });

});