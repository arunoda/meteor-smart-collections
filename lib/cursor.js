var Fibers = Npm.require('fibers');
var Future = Npm.require('fibers/future');
var util = Npm.require('util');
var EventEmitter = Npm.require('events').EventEmitter;

function Cursor(mongoCursor, collection) {
  var self = this;
  this._cursor = mongoCursor;
  this._collection = collection;
  this._selectorMatcher = LocalCollection._compileSelector(this._cursor.selector);
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
      endCallback(err);
    } else {
      Meteor.SmartInvalidator.addCursor(self._collection.name, self);
      var observeHandler = new ObserveHandler(self);
      endCallback(null, observeHandler);
    }
  }
};

Cursor.prototype._idExists = function _idExists(id) {
  return (this._idMap[id])? true: false;
};

Cursor.prototype._added = function _added(doc) {
  self._idMap[item._id] = true;
  self.emit('added', doc._id, doc);
};

Cursor.prototype._removed = function _removed(id) {
  self._idMap[id] = null;
  self.emit('removed', id);
};

Cursor.prototype._changes = function(id, fields) {
  self.emit(id, fields); 
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