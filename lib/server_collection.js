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
  ['insert', 'update', 'remove', 'findOne', 'find'].forEach(function(writeMethod) {
    self[writeMethod] = function() {
      var future;
      if(Fibers.current) {
        future = new Future();
        Array.prototype.push.call(arguments, future.resolver());
      }
      
      var args = arguments;
      var rtn;
      if(self._collection) {
        rtn = applyMethod(args);
      } else {
        self.on('ready', function() {
          rtn = applyMethod(args);
        });
      }

      if(future) future.wait();

      //returning _id after inserted. only available for inserts
      if(future) {
        return future.value;
      } else {
        return rtn;
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

SmartCollection.prototype._find = function(selector, options, callback) {
  selector = this._normalizeSelector(selector);
  if(typeof(selector) == 'function') {
    callback = selector;
    selector = {};
    options = {};
  } else if(typeof(options) == 'function') {
    callback = options;
    options = {};
  }

  var mongoCursor = this._collection.find(selector, options);
  var cursor = new Meteor.SmartCursor(mongoCursor, this);
  if(callback) callback(null, cursor);
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

SmartCollection.prototype._findOne = function(selector, callback) {
  selector = this._normalizeSelector(selector);
  this._collection.findOne(selector, callback);
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
      if(callback) callback(null, document._id);
      Meteor.SmartInvalidator.invalidateInsert(self.name, document);
    }
  });
};

SmartCollection.prototype._update = function(selector, mod, options, callback) {
  selector = this._normalizeSelector(selector);
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
  selector = this._normalizeSelector(selector);
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

SmartCollection.prototype._normalizeSelector = function(selector) {
  if(selector == undefined || selector == null) {
    return {};
  } if(typeof(selector) == 'string') {
    return {_id: selector};
  } else if(typeof(selector) == 'number') {
    throw new Error('Smart Collections does not support number as the _id yet. Use a string instead');
  } else {
    return selector;
  }
};

Meteor.SmartCollection = SmartCollection;