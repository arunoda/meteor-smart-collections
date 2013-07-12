var Fibers = Npm.require('fibers');
var Future = Npm.require('fibers/future');

function Cursor(mongoCursor) {
  var self = this;
  this._cursor = mongoCursor;
  this._selectorMatcher = LocalCollection._compileSelector(this._cursor.selector);

  ['forEach', 'map', 'fetch', 'count'].forEach(function(method) {
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

Meteor.SmartCursor = Cursor;