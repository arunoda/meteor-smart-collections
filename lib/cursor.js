var Fibers = Npm.require('fibers');
var Future = Npm.require('fibers/future');
var util = Npm.require('util');
var EventEmitter = Npm.require('events').EventEmitter;

function Cursor(mongoCursor, collection, options) {
  this.setMaxListeners(0);
  var self = this;

  if(mongoCursor && collection) {
    this.init(mongoCursor, collection, options);
  }
}

util.inherits(Cursor, EventEmitter);

Cursor.prototype.init = function(mongoCursor, collection, options) {
  this._cursor = mongoCursor;
  this._collection = collection;
  this._transform = options.transform;

  this._selectorMatcher = LocalCollection._compileSelector(this._cursor.selector);
  this._selector = this._cursor.selector;
  this._options = options;

  this.observing = false;
  this._idMap = {};
  this._used = false;
  this.emit('ready');

  //when query re-run is happening we need to block any .added or .removed, 
  //so this indicate that
  this._blocked = false;
  //while in the blocked state, if .added or .removed happens, we need to re-run query again
  //so this will take care of that
  this._needReRun = false;
};

Cursor.prototype._forEach = function (callback, endCallback) {
  var self = this;
  this._cursor.nextObject(afterNextObject);
  function afterNextObject(err, item) {
    Fibers(function() {
      if(err) {
        endCallback(err);
      } else if(item) {
        var transformFunc = self._getTransformFunction();
        if(transformFunc) {
          item = transformFunc(item);
        }
        callback(item);
        self._cursor.nextObject(afterNextObject);
      } else {
        endCallback();
      }
    }).run();
  }
};

Cursor.prototype._map = function _map(mapCallback, resultCallback) {

  var self = this;
  var data = [];
  this._cursor.nextObject(afterNextObject);

  function afterNextObject(err, item) {
    Fibers(function() {
      if(err) {
        resultCallback(err);
      } else if(item) {
        var transformFunc = self._getTransformFunction();
        if(transformFunc) {
          item = transformFunc(item);
        }
        data.push(mapCallback(item));
        self._cursor.nextObject(afterNextObject);
      } else {
        resultCallback(null, data);
      }
    }).run();
  }
};

Cursor.prototype._fetch = function _fetch(callback) {
  var self = this;
  this._cursor.toArray(function(err, results) {
    Fibers(function() {
      //if options.transform is === null, we should not do the transform
      var transformFunc = self._getTransformFunction();
      if(transformFunc && results) {
        for(var lc=0; lc<results.length; lc++) {
          results[lc] = transformFunc(results[lc]);
        }
      }
      callback(err, results);
    }).run();
  });
};

Cursor.prototype._count = function _count(callback) {
  this._cursor.count(callback);
};

Cursor.prototype.rewind = function rewind() {
  this._cursor.rewind();
};

Cursor.prototype._observeChanges = function _observeChanges(callbacks, endCallback) {
  if(this._used) {
    return (callback)? callback(new Error('Cursor has been used or in observing')): null;
  }

  var self = this;
  this.observing = true;
  this._used = true;

  ['added', 'changed', 'removed'].forEach(function(event) {
    if(typeof(callbacks[event]) == 'function') {
      self.on(event, callbacks[event]);
    }
  });

  this._collection.invalidator.addCursor(this);

  this.rewind();
  this._forEach(function(item) {
    self._added(item);
  }, afterForeach);

  function afterForeach(err) {
    if(err) {
      self._clean();
      if(endCallback) endCallback(err);
    } else {
      var observeHandler = new ObserveHandler(self);
      if(endCallback) endCallback(null, observeHandler);
    }
  }
};

Cursor.prototype._idExists = function _idExists(id) {
  return (this._idMap[id])? true: false;
};

Cursor.prototype._added = function _added(doc, ignoreBlock) {
  //if blocked, do not proceed just ask for a queryReRun again
  if(!ignoreBlock && this._blocked) {
    this._needReRun = true;
    return;
  }

  //if the current documents in the cursor is aligned with the limit, do no add them
  if(this._options.limit != null && _.keys(this._idMap).length >= this._options.limit) {
    return;
  }

  if(this.observing && !this._idMap[doc._id]) {
    this._idMap[doc._id] = true;
    this._fiberEmit('added', doc._id, doc);
  }
};

Cursor.prototype._removed = function _removed(id, ignoreBlock) {
  //if blocked, do not proceed just ask for a queryReRun again
  if(!ignoreBlock && this._blocked) {
    this._needReRun = true;
    return;
  }

  if(this.observing && this._idMap[id]) {
    delete this._idMap[id];
    this._fiberEmit('removed', id);

    //start query re-run if there is a limit and not blocked
    //we need to check this._blocked because, top check allows come to here, if ignoreBlock is true
    if(!this._blocked && this._options.limit != null) {
      this._queryReRun();
    }
  }
};

Cursor.prototype._changed = function(id, fields) {
  if(this.observing && this._idMap[id]) {
    this._fiberEmit('changed', id, fields); 
  }
};

Cursor.prototype._computeAndNotifyRemoved = function(newIds) {
  if(this.observing) {
    var self = this;
    var existingIds = _.keys(this._idMap);
    var removedIds = _.difference(existingIds, newIds);
    removedIds.forEach(function(id) {
      self._removed(id);
    });
  }
};

Cursor.prototype._getTransformFunction = function() {
  if(this._transform !== undefined) {
    return this._transform ;
  } else {
    return this._collection._transform;
  }
};

Cursor.prototype._clean = function() {
  this._collection.invalidator.removeCursor(this)
  this.observing = false;
  this._collection = null;
  this._cursor = null;

  this.removeAllListeners('added');
  this.removeAllListeners('changed');
  this.removeAllListeners('removed');
};

Cursor.prototype._queryReRun = function() {
  var self = this;

  if(this._blocked) {
    throw new Error('cannot rerun a query while blocked');
  }
  this._blocked = true;
  self._needReRun = false;

  this._cursor.rewind();
  this._fetch(function(err, results) {
    if(err) {
      throw new err;
    } else {
      var oldIds = _.keys(self._idMap);
      var newIds = [];
      var newIdMap = {};

      for(var index in results) {
        var doc = results[index];
        newIdMap[doc._id] = doc;
        newIds.push(doc._id);
      }

      var addedIds = _.difference(newIds, oldIds);
      var removedIds = _.difference(oldIds, newIds);
      var changedIds = _.intersection(oldIds, newIds);

      removedIds.forEach(function(id) {
        self._removed(id, true);
      });

      addedIds.forEach(function(id) {
        self._added(newIdMap[id], true);
      });

      changedIds.forEach(function(id) {
        self._changed(id, newIdMap[id]);
      });

      self._blocked = false;
      if(self._needReRun) {
        self._queryReRun();
      }
    }
  });
};

Cursor.prototype.__publishCursor = function(subscription, callback) {
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

Cursor.prototype._fiberEmit = function(event, doc) {
  var self = this;
  var args = arguments;

  Fibers(function() {
    self.emit.apply(self, args);
  }).run();
};

//do both fiber and non-fiber support
['forEach', 'map', 'fetch', 'count', 'observeChanges', '_publishCursor'].forEach(function(method) {
  Cursor.prototype[method] = function() {
    var self = this;
    var future;
    if(Fibers.current) {
      future = new Future();
      Array.prototype.push.call(arguments, future.resolver());
    }

    var args = arguments;
    if(self._cursor) {
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

/***** ObserveHandler ******/
function ObserveHandler(cursor) {
  this._cursor = cursor;
}

ObserveHandler.prototype.stop = function stop() {
  this._cursor._clean();
};
Meteor.SmartCursor = Cursor;