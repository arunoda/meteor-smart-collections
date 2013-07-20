function SmartCollection(name) {
  var self = this;
  this.name = name;
  this._remoteCollection = new Meteor.Collection(name);
  this._localCollection = new Meteor.Collection(null);

  this._pipeHandler = this._pipe(this._remoteCollection, this._localCollection);

  //wrap methods from the _remoteCollection
  ['find', 'findOne', 'allow', 'deny'].forEach(function(field) {
    self[field] = function() {
      return self._localCollection[field].apply(self._localCollection, arguments);
    };
  });
}

SmartCollection.prototype.insert = function(doc, callback) {
  //_si_ == smart insert :P
  if(!doc._id) {
    doc._id = Random.id();
  }

  if(this._isSimulation()) {
    this._remoteCollection.insert(doc, callback);
  } else {
    Meteor.call('_si_', this.name, doc, callback);
  }
  return doc._id;
};

SmartCollection.prototype.update = function(selector, modifier, callback) {
  if(this._isSimulation()) {
    this._remoteCollection.update(selector, modifier, callback);
  } else {
    var id = this._getId(selector);
    Meteor.call('_su_', this.name, id, modifier, callback);
  }
};

SmartCollection.prototype.remove = function(selector, callback) {
  if(this._isSimulation()) {
    this._remoteCollection.remove(selector, callback);
  } else {
    var id = this._getId(selector);
    Meteor.call('_sr_', this.name, id, callback);
  }
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

SmartCollection.prototype._isSimulation = function() {
  var enclosing = Meteor._CurrentInvocation.get();
  return enclosing && enclosing.isSimulation;
};

SmartCollection.prototype._pipe = function() {
  var self = this;
  var handler = this._remoteCollection.find().observeChanges({
    added: onAdded,
    changed: onChanged,
    removed: onRemoved
  });

  function onAdded(id, doc) {
    var haveDoc = self._localCollection.findOne(id);
    if(haveDoc) {
      self._localCollection.update(id, {$set: doc});
    } else {
      doc._id = id;
      self._localCollection.insert(doc);
    }
  }

  function onChanged(id, fields) {
    var haveDoc = self._localCollection.findOne(id);
    if(haveDoc) {
      self._localCollection.update(id, {$set: fields});
    } else {
      fields._id = id;
      self._localCollection.insert(fields);
    }
  }

  function onRemoved(id) {
    self._localCollection.remove(id);
  }

  return handler;  
};

Meteor.SmartCollection = SmartCollection;