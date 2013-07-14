var Fibers = Npm.require('fibers');
var Future = Npm.require('fibers/future');
var util = Npm.require('util');
var EventEmitter = Npm.require('events').EventEmitter;

function Cursor(mongoCursor, collection) {
  var self = this;
  this._cursor = mongoCursor;
  this._collection = collection;
  this._selectorMatcher = LocalCollection._compileSelector(this._cursor.selector);
  this._selector = this._cursor.selector;
  this.observing = false;
  this._idMap = {};

  ['forEach', 'map', 'fetch', 'count', 'observeChanges'].forEach(function(method) {
     self[method] = function() {
      var future;
      if(Fibers.current) {
        future = new Future();
        Array.prototype.push.call(arguments, future.resolver());
      }
      
      self['_' + method].apply(self, arguments);
      if(future) future.wait();

      if(future) {
        return future.value;
      }
    };
  });
}

util.inherits(Cursor, EventEmitter);

Cursor.prototype._forEach = function _forEach(callback, endCallback) {
  this._cursor.each(function(err, item) {
    if(err) {
      endCallback(err);
    } else if(item) {
      callback(item);
    } else {
      endCallback();
    }
  })
};

Cursor.prototype._map = function _map(mapCallback, resultCallback) {
  var data = [];
  this._cursor.each(function(err, item) {
    if(err) {
      resultCallback(err);
    } else if(item) {
      data.push(mapCallback(item));
    } else {
      resultCallback(null, data);
    }
  });
};

Cursor.prototype._fetch = function _fetch(callback) {
  this._cursor.toArray(callback);
};

Cursor.prototype._count = function _count(callback) {
  this._cursor.count(callback);
};

Cursor.prototype.rewind = function rewind() {
  this._cursor.rewind();
};

Cursor.prototype._observeChanges = function _observeChanges(callbacks, endCallback) {
  var self = this;
  this.observing = true;

  ['added', 'changed', 'removed'].forEach(function(event) {
    if(typeof(callbacks[event]) == 'function') {
      self.on(event, callbacks[event]);
    }
  });

  this.rewind();
  this._forEach(function(item) {
    self._idMap[item._id] = true;
    self.emit('added', item._id, item);
  }, afterForeach);

  function afterForeach(err) {
    if(err) {
      if(endCallback) endCallback(err);
    } else {
      Meteor.SmartInvalidator.addCursor(self._collection.name, self);
      var observeHandler = new ObserveHandler(self);
      if(endCallback) endCallback(null, observeHandler);
    }
  }
};

Cursor.prototype._idExists = function _idExists(id) {
  return (this._idMap[id])? true: false;
};

Cursor.prototype._added = function _added(doc) {
  if(this.observing) {
    this._idMap[doc._id] = true;
    this.emit('added', doc._id, doc);
  }
};

Cursor.prototype._removed = function _removed(id) {
  if(this.observing && this._idMap[id]) {
    this._idMap[id] = null;
    this.emit('removed', id);
  }
};

Cursor.prototype._changed = function(id, fields) {
  if(this.observing && this._idMap[id]) {
    this.emit('changed', id, fields); 
  }
};

Cursor.prototype._computeAndNotifyRemoved = function(newIds) {
  if(this.observing) {
    var self = this;
    var existingIds = _.keys(this._idMap);
    console.log(existingIds, newIds);
    var removedIds = _.difference(existingIds, newIds);
    removedIds.forEach(function(id) {
      self._removed(id);
    });
  }
};

/***** ObserveHandler ******/
function ObserveHandler(cursor) {
  this._cursor = cursor;
}

ObserveHandler.prototype.stop = function stop() {
  Meteor.SmartInvalidator.removeCursor(this._cursor._collection.name, this._cursor)
  this._cursor.observing = false;
  this._cursor._collection = null;
  this._cursor._cursor = null;

  this._cursor.removeAllListeners('added');
  this._cursor.removeAllListeners('changed');
  this._cursor.removeAllListeners('removed');
};
Meteor.SmartCursor = Cursor;