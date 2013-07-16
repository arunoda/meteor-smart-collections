function SmartCollection(name) {
  var self = this;
  this.name = name;
  this._meteorCollection = new Meteor.Collection(name);

  //wrap methods from the _meteorCollection
  ['find', 'findOne', 'allow', 'deny'].forEach(function(field) {
    self[field] = function() {
      return self._meteorCollection[field].apply(self._meteorCollection, arguments);
    };
  });
}

SmartCollection.prototype.insert = function(doc, callback) {
  //_si_ == smart insert :P
  Meteor.call('_si_', this.name, doc, callback);
};

SmartCollection.prototype.update = function(selector, modifier, callback) {
  var id = this._getId(selector);
  Meteor.call('_su_', this.name, id, modifier, callback);
};

SmartCollection.prototype.remove = function(selector, callback) {
  var id = this._getId(selector);
  Meteor.call('_sr_', this.name, id, callback);
};

SmartCollection.prototype._getId = function(selector) {
  var id;
  if(typeof(selector) == 'string') {
    id = selector;
  } else if(typeof(selector) == 'object' && typeof(selector._id) == 'string') {
    id = selector._id;
  }

  if(!id) {
    throw new Meteor.Error('403', 'Not permitted. Untrusted code may only update documents by ID');
  } else {
    return id;
  }
};

Meteor.SmartCollection = SmartCollection;