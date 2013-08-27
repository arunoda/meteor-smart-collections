/*
  @param callbacks - object of callbacks with `added`, `changed` and `removed`
  @param fields - compiled fields with Cursor._compileFields()
*/
function Observer(callbacks, fields) {
  var self = this;
  this._fields = fields;
  this._callbacks = {};

  ['added', 'changed', 'removed'].forEach(function(event) {
    var callbackFunc = callbacks[event];
    if(typeof(callbackFunc) == 'function') {
      self._callbacks[event] = Meteor.bindEnvironment(callbackFunc, self._onError(event));
    }
  });
}

Observer.prototype.added = function(doc) {
  if(this._callbacks.added) {
    this._callbacks.added(doc._id, this._filterFields(doc));
  }
};

Observer.prototype.changed = function(id, fields) {
  if(this._callbacks.changed) {
    this._callbacks.changed(id, this._filterFields(fields));
  }
};

Observer.prototype.removed = function(id) {
  if(this._callbacks.removed) {
    this._callbacks.removed(id);
  }
};

Observer.prototype._filterFields = function(doc) {
  return Meteor.SmartCursor.prototype._filterFields.call(this, doc);
};

Observer.prototype._onError = function(type) {
  return function(err) {
    console.error('error on observer callback', {type: type, error: err});
  };
};

Meteor.SmartObserver = Observer;