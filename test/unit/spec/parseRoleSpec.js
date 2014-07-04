'use strict';

describe('Factory: parseRole', function () {
  var parseRole, mockDeferred, mockQ, mockParseResourceActions, mockQueryResponse, mockParseQueryBuilder;

  beforeEach(function () {
    mockDeferred = {
      promise: {
        then: jasmine.createSpy()
      },
      resolve: jasmine.createSpy(),
      reject: jasmine.createSpy()
    };
    mockQ = {
      defer: function () {
        return mockDeferred;
      }
    };
    spyOn(mockQ, 'defer').andCallThrough();
    mockParseResourceActions = {
      getActionConfig: function () {
        return {};
      }
    };
    spyOn(mockParseResourceActions, 'getActionConfig').andCallThrough();
    mockParseQueryBuilder = {
      Query: function () {}
    };
    spyOn(mockParseQueryBuilder, 'Query').andCallThrough();
    mockParseQueryBuilder.Query.prototype.equalTo = function () {
      return this;
    };
    spyOn(mockParseQueryBuilder.Query.prototype, 'equalTo').andCallThrough();
    mockParseQueryBuilder.Query.prototype.exec = function () {
      return mockQueryResponse;
    };
    spyOn(mockParseQueryBuilder.Query.prototype, 'exec').andCallThrough();
    mockQueryResponse = {
      $promise: {
        then: jasmine.createSpy()
      }
    };
    module('angularParseInterface', function ($provide) {
      $provide.value('$log', console);
      $provide.value('$q', mockQ);
      $provide.value('parseResourceActions', mockParseResourceActions);
      $provide.value('parseQueryBuilder', mockParseQueryBuilder);
    });
    inject(function ($injector) {
      parseRole = $injector.get('parseRole');
    });
  });

  describe('createRoleFactory method', function () {
    var mocks, roleFactory;

    beforeEach(function () {
      mocks = {};
      // mock Resource
      mocks.Resource = function () {
        var props = arguments[0],
          self = this;
        angular.forEach(props, function (v, k) {
          self[k] = v;
        });
      };
      spyOn(mocks, 'Resource').andCallThrough();
      mocks.Resource.hasMany = jasmine.createSpy();
      Object.defineProperty(mocks.Resource.prototype, 'className', {
        get: function () {
          return mocks.Resource.className;
        }
      });
      mocks.Resource.prototype.getPointer = function () {
        return {a: 1, b: 2};
      };
      spyOn(mocks.Resource.prototype, 'getPointer').andCallThrough();
      mocks.Resource.prototype.$save = jasmine.createSpy();
      mocks.Resource.prototype.addRelations = jasmine.createSpy();
      mocks.Resource.prototype.removeRelations = jasmine.createSpy();

      mocks.appResourceFactory = function () {
        return mocks.Resource;
      };
      spyOn(mocks, 'appResourceFactory').andCallThrough();
      mocks.User = {};
    });

    it('should get the correct custom actions from the action library', function () {
      var expectedActions = ['get', 'query', 'save', 'delete', 'PUT'];
      roleFactory = parseRole.createRoleFactory(mocks.appResourceFactory, mocks.User);
      angular.forEach(expectedActions, function (val) {
        expect(mockParseResourceActions.getActionConfig).toHaveBeenCalledWith(val);
      });
    });

    it('should call appResourceFactory with the correct arguments', function () {
      var expectedUrl = 'classes/_Role/:objectId',
        expectedDefaultParams = {
          objectId: '@objectId'
        },
        expectedActions = {
          get: {},
          query: {},
          save: {},
          delete: {},
          PUT: {}
        },
        actualUrl, actualDefaultParams, actualActions;
      roleFactory = parseRole.createRoleFactory(mocks.appResourceFactory, mocks.User);
      expect(mocks.appResourceFactory).toHaveBeenCalled();
      actualUrl = mocks.appResourceFactory.argsForCall[0][0];
      actualDefaultParams = mocks.appResourceFactory.argsForCall[0][1];
      actualActions = mocks.appResourceFactory.argsForCall[0][2];
      expect(actualUrl).toEqual(expectedUrl);
      expect(actualDefaultParams).toEqual(expectedDefaultParams);
      expect(actualActions).toEqual(expectedActions);
    });

    describe('roleDecorator', function () {
      it('should set the Role\'s className to _Role', function () {
        roleFactory = parseRole.createRoleFactory(mocks.appResourceFactory, mocks.User);
        expect(mocks.Resource.className).toEqual('_Role');
      });

      it('should create a \'users\' Relation with User', function () {
        roleFactory = parseRole.createRoleFactory(mocks.appResourceFactory, mocks.User);
        expect(mocks.Resource.hasMany).toHaveBeenCalledWith('users', mocks.User);
      });

      it('should create a \'roles\' Relation with Role', function () {
        roleFactory = parseRole.createRoleFactory(mocks.appResourceFactory, mocks.User);
        expect(mocks.Resource.hasMany).toHaveBeenCalledWith('roles', mocks.Resource);
      });
    });

    it('should return a function', function () {
      roleFactory = parseRole.createRoleFactory(mocks.appResourceFactory, mocks.User);
      expect(roleFactory).toBeFunction();
    });

    describe('roleFactory function', function () {
      var mockRole, name, roleFacade;

      beforeEach(function () {
        name = 'foo';
        mockRole = mocks.Resource;
        roleFactory = parseRole.createRoleFactory(mocks.appResourceFactory, mocks.User);
      });

      it('should create a new Role with the supplied name', function () {
        roleFacade = roleFactory(name);
        expect(mockRole).toHaveBeenCalledWith({name: name});
      });

      it('should create a new deferred object and add its promise to the roleFacade', function () {
        roleFacade = roleFactory(name);
        expect(mockQ.defer).toHaveBeenCalled();
        expect(roleFacade.$promise).toBe(mockDeferred.promise);
      });

      it('should set an initial $resolved value on the roleFacade of false', function () {
        roleFacade = roleFactory(name);
        expect(roleFacade.$resolved).toEqual(false);
      });

      it('should query the server for a Role with the name matching the supplied name and supply handlers to the response', function () {
        var promiseArgs;
        roleFacade = roleFactory(name);
        expect(mockParseQueryBuilder.Query).toHaveBeenCalledWith(mockRole);
        expect(mockParseQueryBuilder.Query.prototype.equalTo).toHaveBeenCalledWith('name', name);
        expect(mockParseQueryBuilder.Query.prototype.exec).toHaveBeenCalled();
        expect(mockQueryResponse.$promise.then).toHaveBeenCalled();
        promiseArgs = mockQueryResponse.$promise.then.argsForCall[0];
        expect(promiseArgs[0]).toBeFunction();
        expect(promiseArgs[1]).toBeFunction();
      });

      it('should assign handlers to the promise on roleFacade', function () {
        var promiseArgs;
        roleFacade = roleFactory(name);
        expect(roleFacade.$promise.then).toHaveBeenCalled();
        promiseArgs = roleFacade.$promise.then.argsForCall[0];
        expect(promiseArgs[0]).toBeFunction();
        expect(promiseArgs[1]).toBeFunction();
      });

      describe('on query success', function () {
        var onSuccess, savedRole, responseData;

        beforeEach(function () {
          roleFacade = roleFactory(name);
          onSuccess = mockQueryResponse.$promise.then.argsForCall[0][0];
          savedRole = {
            a: 1,
            b: 2
          };
          responseData = [savedRole];
        });

        it('should resolve the promise on roleFacade regardless of whether the server response contains any data', function () {
          // With response data
          onSuccess(responseData);
          expect(mockDeferred.resolve).toHaveBeenCalled();
          expect(roleFacade.$resolved).toBeTrue();
          // With empty response data
          mockDeferred.resolve.reset();
          roleFacade.$resolved = false;
          responseData = [];
          onSuccess(responseData);
          expect(mockDeferred.resolve).toHaveBeenCalled();
          expect(roleFacade.$resolved).toBeTrue();
        });

        describe('createFacadeInterface function', function () {
          var createFacadeInterface;

          beforeEach(function () {
            createFacadeInterface = roleFacade.$promise.then.argsForCall[0][0];
          });

          it('should define a name property that has a getter and a do-nothing setter', function () {
            var newName = 'New' + name;
            expect(roleFacade.name).toBeUndefined();
            createFacadeInterface();
            expect(roleFacade.name).toEqual(name);
            roleFacade.name = newName;
            expect(roleFacade.name).not.toEqual(newName);
            expect(roleFacade.name).toEqual(name);
          });

          it('should define a className property that has a getter and a do-nothing setter', function () {
            var className = '_Role',
              newClassName = 'NotRole';
            expect(roleFacade.className).toBeUndefined();
            createFacadeInterface();
            expect(roleFacade.className).toEqual(className);
            roleFacade.className = newClassName;
            expect(roleFacade.className).not.toEqual(newClassName);
            expect(roleFacade.className).toEqual(className);
          });

          it('should define a getPointer method that delegates to the underlying role\'s getPointer method', function () {
            var rolePointer = mocks.Resource.prototype.getPointer(),
              roleFacadePointer;
            mocks.Resource.prototype.getPointer.reset();
            expect(roleFacade.getPointer).toBeUndefined();
            createFacadeInterface();
            expect(roleFacade.getPointer).toBeFunction();
            roleFacadePointer = roleFacade.getPointer();
            expect(mocks.Resource.prototype.getPointer).toHaveBeenCalled();
            expect(roleFacadePointer).toEqual(rolePointer);
          });

          it('should define a $save method that delegates to the underlying role\'s $save method', function () {
            var onSuccess = function () {},
              onError = function () {};
            expect(roleFacade.$save).toBeUndefined();
            createFacadeInterface();
            expect(roleFacade.$save).toBeFunction();
            roleFacade.$save(onSuccess, onError);
            expect(mocks.Resource.prototype.$save).toHaveBeenCalledWith(onSuccess, onError);
          });

          it('should define an addUsers method that calls to the underlying role\'s addRelations method with \'users\' and the supplied arguments', function () {
            var mockArg1 = {},
              mockArg2 = {};
            expect(roleFacade.addUsers).toBeUndefined();
            createFacadeInterface();
            expect(roleFacade.addUsers).toBeFunction();
            roleFacade.addUsers(mockArg1, mockArg2);
            expect(mocks.Resource.prototype.addRelations).toHaveBeenCalledWith('users', mockArg1, mockArg2);
          });

          it('should define a removeUsers method that calls to the underlying role\'s removeRelations method with \'users\' and the supplied arguments', function () {
            var mockArg1 = {},
              mockArg2 = {};
            expect(roleFacade.removeUsers).toBeUndefined();
            createFacadeInterface();
            expect(roleFacade.removeUsers).toBeFunction();
            roleFacade.removeUsers(mockArg1, mockArg2);
            expect(mocks.Resource.prototype.removeRelations).toHaveBeenCalledWith('users', mockArg1, mockArg2);
          });

          it('should define an addIncludedRoles method that calls to the underlying role\'s addRelations method with \'roles\' and the supplied arguments', function () {
            var mockArg1 = {},
              mockArg2 = {};
            expect(roleFacade.addIncludedRoles).toBeUndefined();
            createFacadeInterface();
            expect(roleFacade.addIncludedRoles).toBeFunction();
            roleFacade.addIncludedRoles(mockArg1, mockArg2);
            expect(mocks.Resource.prototype.addRelations).toHaveBeenCalledWith('roles', mockArg1, mockArg2);
          });

          it('should define an removeIncludedRoles method that calls to the underlying role\'s removeRelations method with \'roles\' and the supplied arguments', function () {
            var mockArg1 = {},
              mockArg2 = {};
            expect(roleFacade.removeIncludedRoles).toBeUndefined();
            createFacadeInterface();
            expect(roleFacade.removeIncludedRoles).toBeFunction();
            roleFacade.removeIncludedRoles(mockArg1, mockArg2);
            expect(mocks.Resource.prototype.removeRelations).toHaveBeenCalledWith('roles', mockArg1, mockArg2);
          });
        });
      });

      describe('on query error', function () {
        var onError, err;

        beforeEach(function () {
          roleFacade = roleFactory(name);
          onError = mockQueryResponse.$promise.then.argsForCall[0][1];
          err = {
            a: 1,
            b: 2
          };
        });

        it('should reject the promise on roleFacade', function () {
          onError(err);
          expect(mockDeferred.reject).toHaveBeenCalledWith(err);
          expect(roleFacade.$resolved).toBeTrue();
        });

        describe('processQueryError', function () {
          var processQueryError;

          beforeEach(function () {
            processQueryError = roleFacade.$promise.then.argsForCall[0][1];
          });

          it('should assign the supplied error to the error property on roleFacade', function () {
            expect(roleFacade.error).toBeUndefined();
            processQueryError(err);
            expect(roleFacade.error).toEqual(err);
          });
        });

      });
    });
  });
});