/*
  @param callbacks - object of callbacks with `added`, `changed` and `removed`
*/
function Observer(callbacks) {
  var self = this;
  this._callbacks = {};

  ['added', 'changed', 'removed'].forEach(function(event) {
    var callbackFunc = callbacks[event];
    if(typeof(callbackFunc) == 'function') {
      // self._callbacks[event] = Meteor.bindEnvironment(callbackFunc, self._onError(event));
      self._callbacks[event] = callbackFunc;
    }
  });
}

Observer.prototype.added = function(doc) {
  if(this._callbacks.added) {
    this._callbacks.added(doc._id, doc);
  }
};

Observer.prototype.changed = function(id, fields) {
  if(this._callbacks.changed) {
    this._callbacks.changed(id, fields);
  }
};

Observer.prototype.removed = function(id) {
  if(this._callbacks.removed) {
    this._callbacks.removed(id);
  }
};

Observer.prototype._onError = function(type) {
  return function(err) {
    console.error('error on observer callback', {type: type, error: err});
  };
};

Meteor.SmartObserver = Observer;