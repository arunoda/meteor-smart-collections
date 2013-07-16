var util = Npm.require('util');
var EventEmitter = Npm.require('events').EventEmitter;
var Fibers = Npm.require('fibers');
var Future = Npm.require('fibers/future');

function SmartCollection(collectionName) {
  var self = this;
  this._collection = null;
  this.validators = createValidators();

  this.name = collectionName;
  this.versionManager = new Meteor.SmartVersionManager();

  //register collection
  Meteor.SmartInvalidator.registerCollection(collectionName, this);

  if(Meteor.SmartMongo.db) {
    createCollection();
  } else {
    Meteor.SmartMongo.once('ready', createCollection);
  }

  function createCollection() {
    self._collection = Meteor.SmartMongo.db.collection(collectionName);
    self.emit('ready');
  }

  //do both fiber and non-fiber support
  ['insert', 'update', 'remove', 'findOne'].forEach(function(writeMethod) {
    self[writeMethod] = function() {
      var future;
      if(Fibers.current) {
        future = new Future();
        Array.prototype.push.call(arguments, future.resolver());
      }
      
      applyMethod(arguments);
      if(future) future.wait();

      //returning _id after inserted. only available for inserts
      if(writeMethod == 'insert') {
        return arguments[0]._id;
      } else if(writeMethod == 'findOne' && future) {
        return future.value;
      }
    };

    //ensure called after once _collection is ready
    function applyMethod(args) {
      if(self._collection) {
        doApply();
      } else {
        self.once('ready', doApply);
      }

      function doApply() {
        self['_' + writeMethod].apply(self, args)
      }
    }
  });

  function createValidators() {
    var defaultResult = Meteor.Collection.insecure === true;
    return {
      insert: new Meteor.SmartValidator(defaultResult),
      update: new Meteor.SmartValidator(defaultResult),
      remove: new Meteor.SmartValidator(defaultResult)
    }
  }
}

util.inherits(SmartCollection, EventEmitter);

SmartCollection.prototype.find = function(selector, options) {
  selector = selector || {};
  options = options || {};
  var mongoCursor = this._collection.find(selector, options);
  return new Meteor.SmartCursor(mongoCursor, this);
};

SmartCollection.prototype.allow = function(validateFunctions) {
  var self = this;
  ['insert', 'update', 'remove'].forEach(function(type) {
    var func = validateFunctions[type];
    if(func) {
      self.validators[type].register('allow', func);
    }
  });
};

SmartCollection.prototype.deny = function(validateFunctions) {
  var self = this;
  ['insert', 'update', 'remove'].forEach(function(type) {
    var func = validateFunctions[type];
    if(func) {
      self.validators[type].register('deny', func);
    }
  });
};

SmartCollection.prototype._findOne = function(query, callback) {
  this._collection.findOne(query, callback);
};

SmartCollection.prototype._insert = function _insert(document, callback) {
  var self = this;
  if(!document._id) {
    document._id = Random.id();
  }

  this._collection.insert(document, function(err) {
    if(err) {
      if(callback) callback(err);
    } else {
      if(callback) callback();
      Meteor.SmartInvalidator.invalidateInsert(self.name, document);
    }
  });
};

SmartCollection.prototype._update = function(selector, mod, options, callback) {
  var self = this;
  if(typeof(options) == 'function') {
    callback = options;
    options = {};
  }

  this._collection.update(selector, mod, options, function(err) {
    if(err) {
      if(callback) callback(err);
    } else {
      if(callback) callback();
      if(typeof(selector._id) == 'string') {
        Meteor.SmartInvalidator.invalidateUpdate(self.name, selector._id, mod);
      } else {
        Meteor.SmartInvalidator.invalidateMultiUpdate(self.name, selector, mod);
      }
    }
  });
};

SmartCollection.prototype._remove = function(selector, callback) {
  var self = this;
  this._collection.remove(selector, function(err) {
    if(err) {
      if(callback) callback(err);
    } else {
      if(callback) callback();
      if(typeof(selector._id) == 'string') {
        Meteor.SmartInvalidator.invalidateRemove(self.name, selector._id);
      } else {
        Meteor.SmartInvalidator.invalidateMultiRemove(self.name, selector);
      }
    }
  });
};

Meteor.SmartCollection = SmartCollection;
