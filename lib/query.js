/*
  
*/
function Query(collection, selector, options) {
  this._id = ++Query._instances;
  this._debug = Npm.require('debug')('sc:query:' + this._id);
  this._selector = selector;
  this._selectorMatcher = LocalCollection._compileSelector(this._selector);
  this._options = options || {};
  this._collection = collection;

  this._amatureObservers = [];
  this._observers = [];
  //observers who are still on the snapshotting
  this._pendingObservers = [];

  this.snapshotInProgress = false;
  this._needSnapshot = false;
  this._snapShotCount = 0;
           
  this._docMap = {};
  this._pendingSnapshotCallbacks = [];
  this._afterSnapshotCallbacks = [];

  //projector support
  this._projector = new Meteor.SmartProjector(this._selector, this._options.fields);

  //sort specific fields
  if(typeof(this._options.sort) == 'object') {
    this._sortDocCacheMap = {};
    this._sortDocCacheList = [];
    this._sortable = true;
   
    this._sortFields = this._getSortFields(this._options.sort);
    //always 
    this._sortFields.push('_id');
    this._sortFields = _.uniq(this._sortFields);

    this._sortComparator = LocalCollection._compileSort(this._options.sort);
  }

  this._debug('created coll:%s, selector:%j, options:%j', collection.name, selector, options);
}

Query._instances = 0;

Query.prototype.added = function(doc, callback) {
  this._debug('added doc:%j', doc);
  callback = callback || function() {};

  //if snapshotInProgress, do not proceed just ask for a queryReRun again
  if(this.snapshotInProgress) {
    this._needSnapshot = true;
    this._pendingSnapshotCallbacks.push(callback);
    return;
  }

  if(!this._sortable && this._options.limit > 0 && _.keys(this._docMap).length >= this._options.limit) {
    callback();
    return;
  }

  if(!this._docMap[doc._id]) {
    if(this._sortable && this._options.limit > 0) {
      //add doc to the cacheList
      var index = LocalCollection._binarySearch(this._sortComparator, this._sortDocCacheList, doc);
      if(index < this._options.limit) {
        //within the limit range
        this._rawAdded(doc);

        //check for limit exceeds
        if(this._sortDocCacheList.length > this._options.limit) {
          //remove the last doc
          var lastId = this._sortDocCacheList[this._options.limit]._id;
          this._rawRemoved(lastId);
        }
      }
    } else {
      this._rawAdded(doc);
    }
  }
  //need to send this in next cycle, since invalidator may fire 
  //multiple completed trigger if done in the same cycle
  setTimeout(callback, 0);
};

Query.prototype.removed = function(id, callback) {
  this._debug('removed id:%s', id);
  callback = callback || function() {};

  //if snapshotInProgress, do not proceed just ask for a queryReRun again
  if(this.snapshotInProgress) {
    this._needSnapshot = true;
    this._pendingSnapshotCallbacks.push(callback);
    return;
  }

  if(this._docMap[id]) {
    this._rawRemoved(id);

    //start query re-run if there is a limit
    if(this._options.limit > 0) {
      this.snapshot();
    }
  }
  //need to send this in next cycle, since invalidator may fire 
  //multiple completed trigger if done in the same cycle
  setTimeout(callback, 0);
};

Query.prototype.changed = function(id, fields, callback) {
  this._debug('changed id:%s fields:%j', id, fields);
  callback = callback || function() {};
  if(this._docMap[id]) {
    if(this._options.limit > 0 && this._sortable && this._isSortFieldsChanged(fields)) {
      //if sorted and limited, we need to snapshot again
      this.snapshot(callback);
      return;
    } else {
      this._rawChanged(id, fields);
    }
  }
  //need to send this in next cycle, since invalidator may fire 
  //multiple completed trigger if done in the same cycle
  setTimeout(callback, 0);
};

Query.prototype.removeExceptTheseIds = function(newIds) {
  this._debug('removeExceptTheseIds newIds:%j', newIds);
  var self = this;
  var existingIds = _.keys(this._docMap);
  var removedIds = _.difference(existingIds, newIds);
  removedIds.forEach(function(id) {
    self._rawRemoved(id);
  });
};

Query.prototype._rawAdded = function(doc) {
  doc = _.clone(doc);
  var id = doc._id;
  doc = this._projector.filter(doc);

  this._docMap[id] = doc;
  this._observers.forEach(function(observer) {
    observer.added(_.clone(doc));
  });

  //caching for sort
  if(this._sortable) {
    var sortCacheDoc = _.pick(doc, this._sortFields);
    this._sortDocCacheMap[id] = sortCacheDoc;
    LocalCollection._insertInSortedList(this._sortComparator, this._sortDocCacheList, sortCacheDoc);
  }
};


Query.prototype._rawRemoved = function(id) {
  delete this._docMap[id];
  this._observers.forEach(function(observer) {
    observer.removed(id);
  });

  //remove sort caching
  if(this._sortable) {
    var cachedDoc = this._sortDocCacheMap[id];
    delete this._sortDocCacheMap[id];
    var index = this._sortDocCacheList.indexOf(cachedDoc);
    this._sortDocCacheList.splice(index, 1);
  }
};

Query.prototype._rawChanged = function(id, fields) {
  fields = _.clone(fields);
  fields = this._projector.filter(fields);

  //absorb changes into cache
  for(var key in fields) {
    var value = fields[key];
    if(value == undefined) {
      delete this._docMap[id][key];
    } else {
      this._docMap[id][key] = value;
    }
  }

  this._observers.forEach(function(observer) {
    observer.changed(id, _.clone(fields));
  });

  //caching for sort
  if(this._sortable) {
    var cachedDoc = this._sortDocCacheMap[id];
    var changedDoc = _.pick(fields, this._sortFields);
    _.extend(cachedDoc, changedDoc);
    this._sortDocCacheList.sort(this._sortComparator);
  }
};

Query.prototype.addObserver = function(observer, callback) {
  this._debug('addObserver');
  var self = this;
  this._pendingObservers.push(observer);

  if(this.snapshotInProgress) {
    this._afterSnapshotCallbacks.push(doAdd);
  } else if(this._snapShotCount == 0) {
    this.snapshot(doAdd);
  } else {
    doAdd();
  }

  function doAdd() {
    if(self._sortable) {
      self._sortDocCacheList.forEach(function(doc) {
        observer.added(_.clone(self._docMap[doc._id]));
      });
    } else {
      for(var _id in self._docMap) {
        observer.added(_.clone(self._docMap[_id]));
      }
    }

    self._pendingObservers.splice(self._pendingObservers.indexOf(observer), 1);
    self._observers.push(observer);
    if(callback) callback();
  }
};

Query.prototype.removeObserver = function(observer) {
  this._debug('removeObserver');
  var index = this._observers.indexOf(observer);
  if(index >= 0) {
    this._observers.splice(index, 1);
  }
};

Query.prototype.countObservers = function() {
  return this._observers.length + this._pendingObservers.length;
};

Query.prototype.snapshot = function(callback) {
  this._debug('snapshot request');
  if(this.snapshotInProgress) {
    this._needSnapshot = true;
    if(callback) {
      this._pendingSnapshotCallbacks.push(callback);
    }
    return;
  }

  this._debug('snapshot started');

  var self = this;
  this.snapshotInProgress = true;
  this._needSnapshot = false;

  var callbacks = this._pendingSnapshotCallbacks;
  if(callback) {
    callbacks.push(callback);
  }
  this._pendingSnapshotCallbacks = [];

  //we need to set this to avoid, adding observers at the middle of the SNAPSHOT
  var amatureObservers = this._amatureObservers;
  this._amatureObservers = [];

  var idsExists = [];
  this._collection._collection.find(this._selector, this._options).each(function(err, doc) {
    if(err) {
      fireCallbacks(err);
    } else if(doc) {
      idsExists.push(doc._id);
      //handling for amature observers - need to added always
      for(var lc=0; lc<amatureObservers.length; lc++) {
        var observer = amatureObservers[lc].observer;
        observer.added(doc);
      }

      if(self.idExists(doc._id)) {
        var changes = self._getChanges(self._docMap[doc._id], doc);
        if(!_.isEmpty(changes)) {
          self._rawChanged(doc._id, changes);
        }
      } else {
        self._rawAdded(doc);
      }

    } else { //end of the cursor
      //trigger for remove docs
      self.removeExceptTheseIds(idsExists);

      //merge amature observers
      for(var lc=0; lc<amatureObservers.length; lc++) {
        var observerInfo = amatureObservers[lc];
        self._observers.push(observerInfo.observer);
        if(observerInfo.callback) {
          observerInfo.callback();
        }
      }

      self._snapShotCount ++;
      self.snapshotInProgress = false
      self._debug('snapshot completed');

      fireCallbacks();

      //need an snapshot or if there is a new amature observers, we need to snapshot again
      if(self._needSnapshot || self._amatureObservers.length > 0) {
        self.snapshot();
      }
    }
  });

  function fireCallbacks(err) {
    callbacks.forEach(function(callback) {
      callback(err);
    });

    self._afterSnapshotCallbacks.forEach(function(callback) {
      callback(err);
    });
    self._afterSnapshotCallbacks = [];
  }
};

Query.prototype._isSortFieldsChanged = function(doc) {
  var commonFields = _.intersection(_.keys(doc), _.without(this._sortFields, '_id'));
  return commonFields.length > 0;
};

Query.prototype._getSortFields = function(sortExpression) {
  var fields = [];
  if(sortExpression instanceof Array) {
    sortExpression.forEach(function(exp) {
      if(typeof(exp) == 'string') {
        fields.push(exp);
      } else {
        fields.push(exp[0]);
      }
    });
  } else if(typeof sortExpression == 'object') {
    fields = _.keys(sortExpression);
  } else {
    throw new Error('invalid sort expression: ' + JSON.stringify(sortExpression));
  }

  return _.uniq(fields);
};

Query.prototype.idExists = function idExists(id) {
  return (this._docMap[id])? true: false;
};

Query.prototype.getCursor = function() {
  this._debug('getCursor');
  return this._collection._collection.find(this._selector, this._options);
};

Query.prototype._getChanges = function(oldDoc, newDoc) {
  var changes = {};
  for(var key in newDoc) {
    if(oldDoc[key] === undefined) {
      //old doc does not have it
      changes[key] = newDoc[key];
    } else {
      if(!(EJSON.equals(oldDoc[key], newDoc[key]))) {
        changes[key] = newDoc[key];
      }
    }
  }

  for(var key in oldDoc) {
    if(newDoc[key] === undefined) {
      changes[key] = undefined;
    }
  }

  return changes;
};

Meteor.SmartQuery = Query;