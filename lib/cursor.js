var Fibers = Npm.require('fibers');
var Future = Npm.require('fibers/future');
var util = Npm.require('util');
var EventEmitter = Npm.require('events').EventEmitter;

function Cursor(mongoCursor) {
  var self = this;
  this._cursor = mongoCursor;
  this._selectorMatcher = LocalCollection._compileSelector(this._cursor.selector);
  this.observing = false;

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
    self.emit('added', item._id, item);
  }, afterForeach);

  function afterForeach(err) {
    if(err) {
      endCallback(err);
    } else {
      Meteor.SmartInvalidator.addCursor(self);
      var observeHandler = new ObserveHandler(self);
      endCallback(null, observeHandler);
    }
  }
};

/***** ObserveHandler ******/
function ObserveHandler(cursor) {
  this._cursor = cursor;
}

ObserveHandler.prototype.stop = function stop() {
  Meteor.SmartInvalidator.removeCursor(this._cursor)
  this._cursor.observing = false;
  this._cursor.removeAllListeners('added');
  this._cursor.removeAllListeners('changed');
  this._cursor.removeAllListeners('removed');
};
Meteor.SmartCursor = Cursor;