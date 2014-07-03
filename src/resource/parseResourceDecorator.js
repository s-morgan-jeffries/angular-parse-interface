angular.module('angularParseInterface')
  .factory('parseResourceDecorator', function ($log) {
    'use strict';

    // backburner: Refactor this so there are multiple decorators
    //    consider which methods every Resource will need, which may get easier as you add more features
    //backburner: Move this into the core resource module
    return function (Resource) {
      // Static methods
      Resource._getMetaData = function () {
        return this._metaData || {};
      };

      // backburner: Consider specifying some allowed inputs here
      Resource._setMetaData = function (data) {
//        if (typeof data === 'object') {
        this._metaData = data;
//        }
      };

      Resource._getMetaDataProp = function (propName) {
        var resourceMetaData = this._getMetaData();
        return resourceMetaData[propName];
      };

      Resource._setMetaDataProp = function (propName, val) {
        var resourceMetaData = this._getMetaData();
        resourceMetaData[propName] = val;
        this._setMetaData(resourceMetaData);
      };

      // A self-defining function
      var setClassName = function (val) {
        Resource._setMetaDataProp('className', val);
        // Calling it once causes the name to be redefined
        setClassName = function (val) {
          var oldVal = Resource._getMetaDataProp('className'),
            warning = 'You are renaming the Parse Object class ' + oldVal + ' to ' + val;
          // It still works, but now it issues a warning. This is mostly for me to see how often this comes up in
          // ordinary use.
          Resource._setMetaDataProp('className', val);
          $log.warn(warning);
        };
      };
      Object.defineProperty(Resource, 'className', {
        enumerable: true,
        configurable: false,
        get: function () {
          return this._getMetaDataProp('className');
        },
        set: function (val) {
          // Call the self-defining setter
          setClassName(val);
        }
      });

      Resource._getFieldsMetaData = function () {
        return this._getMetaDataProp('fields') || {};
      };

      Resource._setFieldsMetaData = function (data) {
        this._setMetaDataProp('fields', data);
      };

      Resource._getFieldMetaData = function (fieldName) {
        var fieldsMetaData = this._getFieldsMetaData();
        return fieldsMetaData[fieldName] || {};
      };

      Resource._setFieldMetaData = function (fieldName, data) {
        var fieldsMetaData = this._getFieldsMetaData();
        fieldsMetaData[fieldName] = data;
        this._setFieldsMetaData(fieldsMetaData);
      };

      Resource._getFieldMetaDataProp = function (fieldName, propName) {
        var fieldMetaData = this._getFieldMetaData(fieldName);
        return fieldMetaData[propName];
      };

      Resource._setFieldMetaDataProp = function (fieldName, propName, val) {
        var fieldMetaData = this._getFieldMetaData(fieldName);
        fieldMetaData[propName] = val;
        this._setFieldMetaData(fieldName, fieldMetaData);
      };

      Resource._getFieldDataType = function (fieldName) {
        return this._getFieldMetaDataProp(fieldName, 'dataType');
      };

      Resource._setFieldDataType = function (fieldName, val) {
        this._setFieldMetaDataProp(fieldName, 'dataType', val);
      };

      Resource._getFieldClassName = function (fieldName) {
        return this._getFieldMetaDataProp(fieldName, 'className');
      };

      Resource._setFieldClassName = function (fieldName, val) {
        this._setFieldMetaDataProp(fieldName, 'className', val);
      };

//      Resource._getFieldRelationConstructor = function (fieldName) {
//        return this._getFieldMetaDataProp(fieldName, 'relationConstructor');
//      };

//      Resource._setFieldRelationConstructor = function (fieldName, val) {
//        return this._setFieldMetaDataProp(fieldName, 'relationConstructor', val);
//      };

      Resource._addRequestBlacklistProp = function (fieldName) {
        this._setFieldMetaDataProp(fieldName, 'isRequestBlacklisted', true);
      };

      Resource._addRequestBlacklistProps = function () {
        var props = angular.isArray(arguments[0]) ? arguments[0] : [].slice.call(arguments),
          self = this,
          addBlacklistProp = function (propName) {
            self._addRequestBlacklistProp(propName);
          };
        angular.forEach(props, addBlacklistProp);
      };

      Resource._isRequestBlacklisted = function (fieldName) {
        return !!this._getFieldMetaDataProp(fieldName, 'isRequestBlacklisted');
      };

      // Blacklist createdAt and updatedAt properties
      Resource._addRequestBlacklistProps('createdAt', 'updatedAt');

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////



      // Instance methods
      Resource.prototype.isNew = function () {
        return !this.objectId;
      };
      // className
      Object.defineProperty(Resource.prototype, 'className', {
        enumerable: true,
        configurable: false,
        get: function () {
          return this.constructor.className;
        },
        set: function () {}
      });
//      // getPointer
//      Resource.prototype.getPointer = function () {
//        return {
//          __type: 'Pointer',
//          className: this.className,
//          objectId: this.objectId
//        };
//      };

//      // Relational methods
      // How could we do this?
      // hasOne
      Resource.hasOne = function (fieldName, other) {
        this._setFieldDataType(fieldName, 'Pointer');
        this._setFieldClassName(fieldName, other.className);
      };
//      // hasMany
//      Resource.hasMany = function (fieldName, other) {
//        this._setFieldDataType(fieldName, 'Relation');
//        this._setFieldClassName(fieldName, other._getClassName());
//      };
//      // setPointer
//      Resource.prototype.setPointer = function (fieldName, other) {
//        this[fieldName] = other.objectId;
//      };
//      // addRelations
//      Resource.prototype.addRelations = function (fieldName/*, other*/) {
//        var relations = angular.isArray(arguments[1]) ? arguments[1] : [].slice.call(arguments, 1),
//          data = {};
//
//        data[fieldName] = {
//          __op: 'AddRelation',
//          objects: []
//        };
//        angular.forEach(relations, function (o) {
//          data[fieldName].objects.push(o.getPointer());
//        });
//
//        return this.$putData(data);
//      };
//      // removeRelations
//      Resource.prototype.removeRelations = function (fieldName/*, other*/) {
//        var relations = angular.isArray(arguments[1]) ? arguments[1] : [].slice.call(arguments, 1),
//          data = {};
//
//        data[fieldName] = {
//          __op: 'RemoveRelation',
//          objects: []
//        };
//        angular.forEach(relations, function (o) {
//          data[fieldName].objects.push(o.getPointer());
//        });
//
//        return this.$putData(data);
//      };



//      // Probably not worth using Parse's increment operator
//      // increment
//      Resource.prototype.increment = function (fieldName, v) {
//        this[fieldName] += v;
//        return this.$save();
//      };
//      // decrement
//      Resource.prototype.decrement = function (fieldName, v) {
//        this[fieldName] -= v;
//        return this.$save();
//      };

//      // deleteField
//      Resource.prototype.deleteField = function (fieldName) {
//        var data = {},
//          self = this;
//        data[fieldName] = {
//          __op: 'Delete'
//        };
//        return this.$putData(data).then(function () {
//          delete self[fieldName];
//        });
//      };

//      // Security
//      Resource.prototype._setPrivileges = function (name, privileges) {
//        this.ACL = this.ACL || {};
//        this.ACL[name] = this.ACL[name] || {};
//        if (privileges.read) {
//          this.ACL[name].read = privileges.read;
//        }
//        if (privileges.write) {
//          this.ACL[name].write = privileges.write;
//        }
//      };
//      Resource.prototype.allCanRead = function () {
//        this._setPrivileges('*', {read: true});
//      };
//      Resource.prototype.allCanWrite = function () {
//        this._setPrivileges('*', {write: true});
//      };
//      Resource.prototype.setUserPrivileges = function (user, privileges) {
//        this._setPrivileges(user.objectId, privileges);
//      };
    };
  });