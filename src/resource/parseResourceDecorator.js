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
      Resource.prototype.constructor = Resource;
      // Instance methods
//      Resource.prototype.isNew = function () {
//        return !this.objectId;
//      };
      // className
      Object.defineProperty(Resource.prototype, 'className', {
        enumerable: true,
        configurable: false,
        get: function () {
          return this.constructor.className;
        },
        set: function () {}
      });
      // getPointer
      Resource.prototype.getPointer = function () {
        return {
          __type: 'Pointer',
          className: this.className,
          objectId: this.objectId
        };
      };

      // Relational methods
      // hasOne
      Resource.hasOne = function (fieldName, other) {
        this._setFieldDataType(fieldName, 'Pointer');
        this._setFieldClassName(fieldName, other.className);
      };
      // hasMany
      Resource.hasMany = function (fieldName, other) {
        this._setFieldDataType(fieldName, 'Relation');
        this._setFieldClassName(fieldName, other.className);
      };
      // addRelations
      Resource.prototype.addRelations = function (fieldName/*, relations */) {
        var relations = angular.isArray(arguments[1]) ? arguments[1] : [].slice.call(arguments, 1),
          data = {};

        data[fieldName] = {
          __op: 'AddRelation',
          objects: []
        };
        angular.forEach(relations, function (o) {
          data[fieldName].objects.push(o.getPointer());
        });

        return this.$PUT(data);
      };
      // removeRelations
      Resource.prototype.removeRelations = function (fieldName/*, other*/) {
        var relations = angular.isArray(arguments[1]) ? arguments[1] : [].slice.call(arguments, 1),
          data = {};

        data[fieldName] = {
          __op: 'RemoveRelation',
          objects: []
        };
        angular.forEach(relations, function (o) {
          data[fieldName].objects.push(o.getPointer());
        });

        return this.$PUT(data);
      };

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
//        return this.PUT(data).then(function () {
//          delete self[fieldName];
//        });
//      };

      // Security
      Resource.prototype._getACLMetaData = function () {
        return this.ACL || {};
      };
      Resource.prototype._setACLMetaData = function (val) {
        this.ACL = val;
      };
      Resource.prototype._setReadPrivileges = function (obj, canRead) {
        var id, ACL;
        if (arguments.length === 1 && (typeof obj === 'boolean')) {
          canRead = obj;
          id = '*';
        } else {
          if ((obj.className !== '_User') && (obj.className !== '_Role')) {
            throw new Error('Can only set privileges for User or Role objects');
          }
          id = obj.objectId;
        }
        ACL = this._getACLMetaData();
        ACL[id] = ACL[id] || {};
        ACL[id].read = canRead;
        this._setACLMetaData(ACL);
      };
      Resource.prototype._setWritePrivileges = function (obj, canWrite) {
        var id, ACL;
        if (arguments.length === 1 && (typeof obj === 'boolean')) {
          canWrite = obj;
          id = '*';
        } else {
          if ((obj.className !== '_User') && (obj.className !== '_Role')) {
            throw new Error('Can only set privileges for User or Role objects');
          }
          id = obj.objectId;
        }
        ACL = this._getACLMetaData();
        ACL[id] = ACL[id] || {};
        ACL[id].write = canWrite;
        this._setACLMetaData(ACL);
      };
      Resource.prototype.canBeReadBy = function (obj) {
        var id = obj.objectId;
        this._setReadPrivileges(id, true);
      };
      Resource.prototype.cannotBeReadBy = function (obj) {
        var id = obj.objectId;
        this._setReadPrivileges(id, false);
      };
      Resource.prototype.canBeWrittenBy = function (obj) {
        var id = obj.objectId;
        this._setWritePrivileges(id, true);
      };
      Resource.prototype.cannotBeWrittenBy = function (obj) {
        var id = obj.objectId;
        this._setWritePrivileges(id, false);
      };
      Resource.prototype.allCanRead = function () {
        this._setReadPrivileges(true);
      };
      Resource.prototype.allCanWrite = function () {
        this._setWritePrivileges(true);
      };
    };
  });