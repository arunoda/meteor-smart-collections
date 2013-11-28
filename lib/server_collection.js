var util = Npm.require('util');
var EventEmitter = Npm.require('events').EventEmitter;
var Fibers = Npm.require('fibers');
var Future = Npm.require('fibers/future');

function SmartCollection(collectionName, options) {
  var self = this;
  this._debug = Npm.require('debug')('sc:coll:' + collectionName);

  options = options || {};
  this._transform = options.transform;
  this._allowTransform = undefined;
  this._denyTransform = undefined;
  
  this.setMaxListeners(0);
  this._collection = null;
  this.validators = createValidators();

  this.name = this._name = collectionName;
  //add to the map
  Meteor.SmartCollection.map[this.name] = this;

  //invalidation support
  this.invalidator =  new Meteor.SmartInvalidator(this);
  this.opQueue = new Meteor.SmartOpQueue(this.invalidator);

  //from: server_methods.js
  Meteor._setSmartCollectionMethods(this);

  var handler = function () { return self.find(); };
  if(Meteor.default_server.onAutopublish) {
    //autopublish support for prior to 0.6.5
    Meteor.default_server.onAutopublish(function () {
      Meteor.default_server.publish(null, handler, {is_auto: true});
    });
  } else {
    //autopublish support for 0.6.5 +
    //TODO: add options._preventAutopublish support
    if (Package.autopublish && Meteor.server && Meteor.server.publish) {
      Meteor.server.publish(null, handler, {is_auto: true});
    }
  }

  if(Meteor.SmartMongo.ready) {
    createCollection();
  } else {
    Meteor.SmartMongo.once('ready', createCollection);
  }

  function createCollection() {
    self._collection = Meteor.SmartMongo.connection.db.collection(collectionName);
    self.emit('ready');
    self._debug('ready');
  }

  function createValidators() {
    var defaultResult =  (this.Package && Package.insecure)? true: Meteor.Collection.insecure === true;
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
  self._debug('find - selector:%j options:%j', selector, options);

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

  var query = this.invalidator.initiateQuery(selector, options);
  if(this._collection) {
    var cursor = new Meteor.SmartCursor(query, this, options);
    return cursor;
  } else {
    var cursor = new Meteor.SmartCursor();
    this.once('ready', function() {
      cursor.init(query, self, options);
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

  if(validateFunctions.transform !== undefined) {
    this._allowTransform = validateFunctions.transform;
  }
};

SmartCollection.prototype.deny = function(validateFunctions) {
  var self = this;

  ['insert', 'update', 'remove'].forEach(function(type) {
    var func = validateFunctions[type];
    if(func) {
      self.validators[type].register('deny', func);
    }
  });

  if(validateFunctions.transform !== undefined) {
    this._denyTransform = validateFunctions.transform;
  }
};

SmartCollection.prototype._findOne = function(selector, options, callback) {
  var self = this;
  self._debug('findOne - selector:%j options:%j', selector, options);

  if(Fibers.current) {
    afterFound = Meteor.bindEnvironment(afterFound, function(err) {
      Meteor._debug('error when fetching fineOne from mongo', err.stack);
    });
  }

  if(typeof(selector) == 'function') {
    callback = selector;
    options = {};
    this._collection.findOne(afterFound);
  } else if(typeof(options) == 'function') {
    selector = this._normalizeSelector(selector);
    callback = options;
    options = {};
    this._collection.findOne(selector, afterFound);
  } else {
    selector = this._normalizeSelector(selector);
    this._collection.findOne(selector, options, afterFound);
  }

  function afterFound(err, result) {
    //if options.transform is === null, we should not do the transform
    var transformFunc = (options.transform !== undefined)? options.transform : self._transform;
    if(transformFunc && result) {
      result = transformFunc(result);
    }
    callback(err, result);
  }
};

SmartCollection.prototype._insert = function _insert(document, callback, afterPublished) {
  var self = this;
  self._debug('insert - document:%j', document);

  document = _.clone(document);
  if(!document._id) {
    document._id = Random.id();
  }
  afterPublished = afterPublished || function() {};

  this._collection.insert(document, function(err) {
    if(err) {
      if(callback) callback(err);
      afterPublished();
    } else {
      if(!Meteor.SmartMongo.oplog) {
        self.opQueue.insert(document);
      }
      if(callback) callback(null, document._id);
      //this is always sends so no need to listen to anything
      afterPublished();
    }
  });
};

SmartCollection.prototype._update = function(selector, mod, options, callback, afterPublished) {
  selector = this._normalizeSelector(selector);
  var self = this;
  if(typeof(options) == 'function') {
    afterPublished = callback;
    callback = options;
    options = {};
  }

  self._debug('update - selector:%j mod:%j options:%j', selector, mod, options);
  afterPublished = afterPublished || function() {};

  var isIdSelector = typeof(selector._id) == 'string';

  this._collection.update(selector, mod, options, function(err, updateCount) {
    if(err) {
      if(callback) callback(err);
      afterPublished();
    } else {
      //write fence support
      if(isIdSelector) {
        self.invalidator._onceChanged('update', selector._id, afterPublished);
      } else {
        //does not handles multi selectors yet!
        afterPublished();
      }

      if(!Meteor.SmartMongo.oplog) {
        if(isIdSelector) {
          self.opQueue.update(selector._id, mod);
        } else {
          self.opQueue.multiUpdate(selector, mod);
        }
      }
      if(callback) callback(null, updateCount);
    }
  });
};

SmartCollection.prototype._remove = function(selector, callback, afterPublished) {
  selector = this._normalizeSelector(selector);
  afterPublished = afterPublished || function() {};
  var self = this;
  self._debug('remove - selector:%j', selector);

  var isIdSelector = typeof(selector._id) == 'string';

  this._collection.remove(selector, function(err) {
    if(err) {
      if(callback) callback(err);
      afterPublished();
    } else {
      //write fence support
      if(isIdSelector) {
        self.invalidator._onceChanged('remove', selector._id, afterPublished);
      } else {
        //does not handles multi selectors yet!
        afterPublished();
      }

      if(!Meteor.SmartMongo.oplog) {
        if(isIdSelector) {
          self.opQueue.remove(selector._id);
        } else {
          self.opQueue.multiRemove(selector);
        }
      }
      if(callback) callback();
    }
  });
};

SmartCollection.prototype.__ensureIndex = function(index, options, callback) {
  if(typeof(options) == 'function') {
    callback = options;
    options = {safe: true};
  } else {
    options = _.extend({safe: true}, options);
  }

  this._debug('_ensureIndex - index:%j options:%j', index, options);
  this._collection.ensureIndex(index, options, callback);
};

SmartCollection.prototype.__dropIndex = function(index, callback) {
  this._debug('_dropIndex - index:%j', index);
  this._collection.dropIndex(index, callback);
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

//do both fiber and non-fiber support
['insert', 'update', 'remove', 'findOne', '_ensureIndex', '_dropIndex'].forEach(function(writeMethod) {
  SmartCollection.prototype[writeMethod] = function() {
    var self = this;
    var future;
    var args = arguments;

    if(Fibers.current) {
      future = new Future();
      var resolver;
      var lastIndex = args.length -1;
      
      if(typeof(args[lastIndex]) == 'function') {
        var callback = Meteor.bindEnvironment(args[lastIndex], function(err) {
          Meteor._debug('error in callback method of the ' + writeMethod, err.stack);
        });
        args[lastIndex] = function() {
          callback.apply(null, arguments);
          future.return();
        };
      } else {
        Array.prototype.push.call(args, future.resolver());
      }

      //write fence support
      if(['insert', 'update', 'remove'].indexOf(writeMethod) >= 0) {
        var writeCommiter = maybeBeginWrite();
        var afterPublished = Meteor.bindEnvironment(function() {
          writeCommiter.committed();
        }, function(err) {
          Meteor.debug('Write Comit Error', err.stack);
        });
        Array.prototype.push.call(args, afterPublished);
      }

      applyMethod = Meteor.bindEnvironment(applyMethod, function(err) {
        Meteor._debug('error in executing: ' + writeMethod, err.stack);
      });
    }
    
    var rtn;
    if(this._collection) {
      rtn = applyMethod(args);
    } else {
      this.once('ready', function() {
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
  };
});

function maybeBeginWrite() {
  var fence = (Meteor._CurrentWriteFence)? Meteor._CurrentWriteFence.get(): DDPServer._CurrentWriteFence.get();
  if(fence) {
    return fence.beginWrite();
  }
  else {
    return {committed: function () {}};
  }
}

Meteor.SmartCollection = SmartCollection;
Meteor.SmartCollection.map = {}; //store a map of existing collections for reference use
