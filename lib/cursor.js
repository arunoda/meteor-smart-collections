var Fibers = Npm.require('fibers');
var Future = Npm.require('fibers/future');
var util = Npm.require('util');
var EventEmitter = Npm.require('events').EventEmitter;

function Cursor(query, collection, options) {
  this._id = ++Cursor._instances;
  this.setMaxListeners(0);
  this._debug = Npm.require('debug')('sc:cursor:' + this._id);
  var self = this;

  if(query && collection) {
    this.init(query, collection, options);
  }
  this._debug('created');
}

Cursor._instances = 0;

util.inherits(Cursor, EventEmitter);

Cursor.prototype.init = function(query, collection, options) {
  this._query = query;
  this._collection = collection;
  this._transform = options.transform;

  this._debug('init query:%d coll:%s options:%j', query._id, collection.name, options);

  this._options = options;

  if(typeof(this._options.fields) == 'object') {
    this._fields = this._compileFields(this._options.fields);
  }

  this.emit('ready');
};

Cursor.prototype._forEach = function (callback, endCallback) {
  this._debug('_forEach');
  var self = this;
  var cursor = this._query.getCursor();
  
  var afterNextObjectBinded = afterNextObject;
  if(Fibers.current) {
    afterNextObjectBinded = Meteor.bindEnvironment(afterNextObject, function(err) {
      Meteor._debug('error getting next object in _forEach', err.stack);
    });
  }

  cursor.nextObject(afterNextObjectBinded);

  function afterNextObject(err, item) {
    if(err) {
      endCallback(err);
    } else if(item) {
      var transformFunc = self._getTransformFunction();
      if(transformFunc) {
        item = transformFunc(item);
      }
      callback(item);
      cursor.nextObject(afterNextObjectBinded);
    } else {
      endCallback();
    }
  }
};

Cursor.prototype._map = function _map(mapCallback, resultCallback) {
  this._debug('_map');
  var self = this;
  var data = [];
  var cursor = this._query.getCursor();
  
  var afterNextObjectBinded = afterNextObject;
  if(Fibers.current) {
    afterNextObjectBinded = Meteor.bindEnvironment(afterNextObject, function(err) {
      Meteor._debug('error getting next object in _map', err.stack);
    });
  }

  cursor.nextObject(afterNextObjectBinded);

  function afterNextObject(err, item) {
    if(err) {
      resultCallback(err);
    } else if(item) {
      var transformFunc = self._getTransformFunction();
      if(transformFunc) {
        item = transformFunc(item);
      }
      data.push(mapCallback(item));
      cursor.nextObject(afterNextObjectBinded);
    } else {
      resultCallback(null, data);
    }
  }
};

Cursor.prototype._fetch = function _fetch(callback) {
  this._debug('_fetch');
  var self = this;
  var cursor = this._query.getCursor();

  var onResultBinded = onResult;
  if(Fibers.current) {
    onResultBinded = Meteor.bindEnvironment(onResult, function(err) {
      Meteor._debug('error getting results in _fetch', err.stack);
    });
  }

  cursor.toArray(onResultBinded);

  function onResult(err, results) {
    //if options.transform is === null, we should not do the transform
    var transformFunc = self._getTransformFunction();
    if(transformFunc && results) {
      for(var lc=0; lc<results.length; lc++) {
        results[lc] = transformFunc(results[lc]);
      }
    }
    callback(err, results);
  }
};

Cursor.prototype._count = function _count(callback) {
  this._debug('count');
  var cursor = this._query.getCursor();
  cursor.count(callback);
};

Cursor.prototype.rewind = function rewind() {
  this._debug('rewind');
};

Cursor.prototype._observeChanges = function _observeChanges(callbacks, endCallback) {
  this._debug('adding observer');
  var self = this;
  var observer = new Meteor.SmartObserver(callbacks, this._fields);
  this._query.addObserver(observer, afterAdded);

  var added = false;
  function afterAdded(err) {
    added = true;
    if(err) {
      if(endCallback) endCallback(err);
    } else {
      var observeHandler = new ObserveHandler(self, observer);
      if(endCallback) endCallback(null, observeHandler);
    }
  }
};

Cursor.prototype._compileFields = function(fields) {
  var include = [];
  var exclude = [];
  for(var field in fields) {
    if(fields[field] == 0) {
      exclude.push(field);
    } else if(fields[field] == 1) {
      include.push(field);
    }
  }

  include = _.uniq(include);
  exclude = _.uniq(exclude);

  //both types (not allowed except for _id);
  if(include.length > 0 && exclude.length > 0) {
    //allow to exclude _id with inclusion
    if(!(exclude.length == 1 && exclude[0] == '_id')) {
      throw new Error("It is not possible to mix inclusion and exclusion styles in field filtering");
    }
  }

  return {
    include: include,
    exclude: exclude
  };
};

Cursor.prototype._filterFields = function(doc) {
  if(typeof(this._fields) == 'object') {
    if(this._fields.include.length > 0) {
      var filteredDoc = _.pick(doc, this._fields.include);
      //always send _id if not asked to exclude
      if(this._fields.exclude[0] != '_id' && doc._id) {
        filteredDoc['_id'] = doc._id;
      }
      return filteredDoc;
    } else if(this._fields.exclude.length >0)  {
      return _.omit(doc, this._fields.exclude);
    }
  } else {
    return doc;
  }
};

Cursor.prototype._getTransformFunction = function() {
  if(this._transform !== undefined) {
    return this._transform ;
  } else {
    return this._collection._transform;
  }
};

Cursor.prototype.__publishCursor = function(subscription, callback) {
  this._debug('__publishCursor');
  var self = this;

  this._observeChanges({
    added: function(id, doc) {
      subscription.added(self._collection.name, id, doc);
    },
    changed: function(id, fields) {
      subscription.changed(self._collection.name, id, fields);
    },
    removed: function(id) {
      subscription.removed(self._collection.name, id);
    }
  }, function(err, observeHandler) {
    if(err) {
      if(callback) callback(err);
    } else {
      subscription.onStop(function() { observeHandler.stop(); });
      if(callback) callback();
    }
  });
};

Cursor.prototype._getCollectionName = function() {
  return this._collection.name;
};

//do both fiber and non-fiber support
['forEach', 'map', 'fetch', 'count', 'observeChanges', '_publishCursor'].forEach(function(method) {
  Cursor.prototype[method] = function() {
    var self = this;
    var future;
    if(Fibers.current) {
      future = new Future();
      Array.prototype.push.call(arguments, future.resolver());
      doApply = Meteor.bindEnvironment(doApply, function(err) {
        Meteor._debug('error in: ' + method, err.stack);
      });
    }

    var args = arguments;
    modifyArgs(args, method);

    if(self._query) {
      doApply();
    } else {
      self.once('ready', doApply);
    }

    if(future) future.wait();

    if(future) {
      return future.value;
    }

    function doApply() {
      self['_' + method].apply(self, args);
    }
  };
});


function modifyArgs(args, method) {
  if(method == 'observeChanges') {
    var callbacks = args[0];
    ['added', 'changed', 'removed'].forEach(function(event) {
      var callbackFunc = callbacks[event];
      if(typeof(callbackFunc) == 'function') {
        callbacks[event] = Meteor.bindEnvironment(callbackFunc, onModifyArgsError);
      }
    });
  }

  function onModifyArgsError(err) {
    console.error('error when modifyArgs of ', method, {error: err});
  }
}

/***** ObserveHandler ******/
function ObserveHandler(cursor, observer) {
  this._cursor = cursor;
  this._observer = observer;
}

ObserveHandler.prototype.stop = function stop() {
  this._cursor._debug('remove observer');
  this._cursor._query.removeObserver(this._observer);
};
Meteor.SmartCursor = Cursor;