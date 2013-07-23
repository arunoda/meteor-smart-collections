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
  var self = this;
  doc = _.clone(doc);
  //_si_ == smart insert :P
  if(!doc._id) {
    doc._id = Random.id();
  }

  if(this._isSimulation()) {
    this._remoteCollection.insert(doc, callback);
  } else {
    this._localCollection.insert(doc);
    Meteor.call('_si_', this.name, doc, afterInserted);
  }

  function afterInserted(err) {
    if(err) {
      //check the document in the remoteCollection
      var remoteDoc = self._remoteCollection.findOne(doc._id);
      if(!remoteDoc) {
        //only remove from localCollection if no such doc exits in the remoteCollection
        self._localCollection.remove(doc._id);
      }
    }

    if(callback) callback(err);
  }
  return doc._id;
};

SmartCollection.prototype.update = function(selector, modifier, callback) {
  var self = this;
  if(this._isSimulation()) {
    this._remoteCollection.update(selector, modifier, callback);
  } else {
    var id = this._getId(selector);
    this._localCollection.update(selector, modifier);
    Meteor.call('_su_', this.name, id, modifier, afterUpdated);
  }

  function afterUpdated(err) {
    if(err) {
      var remoteDoc = self._remoteCollection.findOne(selector);
      if(remoteDoc) {
        self._localCollection.update(selector, {$set: remoteDoc});
      }
    }

    if(callback) callback(err);
  }
};

SmartCollection.prototype.remove = function(selector, callback) {
  var self = this;
  if(this._isSimulation()) {
    this._remoteCollection.remove(selector, callback);
  } else {
    var id = this._getId(selector);
    this._localCollection.remove(selector);
    Meteor.call('_sr_', this.name, id, afterRemoved);
  }

  function afterRemoved(err) {
    if(err) {
      var remoteDoc = self._remoteCollection.findOne(selector);
      if(remoteDoc) {
        self._localCollection.insert(remoteDoc);
      }
    }

    if(callback) callback(err);
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