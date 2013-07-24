var util = Npm.require('util');
var EventEmitter = Npm.require('events').EventEmitter;
var Fibers = Npm.require('fibers');
var Future = Npm.require('fibers/future');

function SmartCollection(collectionName) {
  this.setMaxListeners(0);
  var self = this;
  this._collection = null;
  this.validators = createValidators();

  this.name = this._name = collectionName;
  this.versionManager = new Meteor.SmartVersionManager();

  //register collection
  Meteor.SmartInvalidator.registerCollection(collectionName, this);

  //autopublish support
  Meteor.default_server.onAutopublish(function () {
    var handler = function () { return self.find(); };
    Meteor.default_server.publish(null, handler, {is_auto: true});
  });

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
      var args = arguments;

      if(Fibers.current) {
        future = new Future();
        var resolver;
        var lastIndex = args.length -1;
        
        if(typeof(args[lastIndex]) == 'function') {
          var callback = args[lastIndex];
          args[lastIndex] = function() {
            callback.apply(null, arguments);
            future.return();
          };
        } else {
          Array.prototype.push.call(arguments, future.resolver());
        }
      }
      
      var rtn;
      if(self._collection) {
        rtn = applyMethod(args);
      } else {
        self.once('ready', function() {
          rtn = applyMethod(args);
        });
      }

      if(future) future.wait();

      //returning _id after inserted. only available for inserts
      if(future) {
        return (future.value)? future.value: undefined;
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

SmartCollection.prototype.find = function(selector, options) {
  var self = this;
  selector = this._normalizeSelector(selector);
  if(typeof(selector) == 'function') {
    callback = selector;
    selector = {};
    options = {};
  } else if(typeof(options) == 'function') {
    callback = options;
    options = {};
  }
  options = options || {};

  if(this._collection) {
    var mongoCursor = this._collection.find(selector, options);
    var cursor = new Meteor.SmartCursor(mongoCursor, this);
    return cursor;
  } else {
    var cursor = new Meteor.SmartCursor();
    this.once('ready', function() {
      var mongoCursor = self._collection.find(selector, options);
      cursor.init(mongoCursor, self);
    });
    return cursor;
  }
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

SmartCollection.prototype._findOne = function(selector, options, callback) {
  selector = this._normalizeSelector(selector);
  this._collection.findOne.apply(this._collection, arguments);
};

SmartCollection.prototype._insert = function _insert(document, callback) {
  var self = this;
  document = _.clone(document);
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
