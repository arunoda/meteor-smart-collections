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
  this.snapshotInProgress = false;
  this._needSnapshot = false;
  this._snapShotCount = 0;
           
  this._idMap = {};
  this._pendingSnapshotCallbacks = [];
  this._afterSnapshotCallbacks = [];

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

Query.prototype.added = function(doc) {
  this._debug('added doc:%j', doc);
  //if snapshotInProgress, do not proceed just ask for a queryReRun again
  if(this.snapshotInProgress) {
    this._needSnapshot = true;
    return;
  }

  //if the current documents in the cursor is aligned with the limit, do no add them
  if(!this._sortable && this._options.limit > 0 && _.keys(this._idMap).length >= this._options.limit) {
    return;
  }

  if(!this._idMap[doc._id]) {
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
};

Query.prototype.removed = function(id) {
  this._debug('removed id:%s', id);
  //if snapshotInProgress, do not proceed just ask for a queryReRun again
  if(this.snapshotInProgress) {
    this._needSnapshot = true;
    return;
  }

  if(this._idMap[id]) {
    this._rawRemoved(id);

    //start query re-run if there is a limit
    if(this._options.limit > 0) {
      this.snapshot();
    }
  }
};

Query.prototype.changed = function(id, fields) {
  this._debug('changed id:%s fields:%j', id, fields);
  if(this._idMap[id]) {
    if(this._options.limit > 0 && this._sortable && this._isSortFieldsChanged(fields)) {
      //if sorted and limited, we need to snapshot again
      this.snapshot();
    } else {
      this._rawChanged(id, fields);
    }
  }
};

Query.prototype.removeExceptTheseIds = function(newIds) {
  this._debug('removeExceptTheseIds newIds:%j', newIds);
  var self = this;
  var existingIds = _.keys(this._idMap);
  var removedIds = _.difference(existingIds, newIds);
  removedIds.forEach(function(id) {
    self._rawRemoved(id);
  });
};

Query.prototype._rawAdded = function(doc) {
  this._idMap[doc._id] = true;
  this._observers.forEach(function(observer) {
    observer.added(doc);
  });

  //caching for sort
  if(this._sortable) {
    var sortCacheDoc = _.pick(doc, this._sortFields);
    this._sortDocCacheMap[doc._id] = sortCacheDoc;
    LocalCollection._insertInSortedList(this._sortComparator, this._sortDocCacheList, sortCacheDoc);
  }
};

Query.prototype._rawRemoved = function(id) {
  delete this._idMap[id];
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
  this._observers.forEach(function(observer) {
    observer.changed(id, fields);
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
  this._amatureObservers.push({
    observer: observer, 
    callback: callback
  });

  if(!this.snapshotInProgress) {
    this.snapshot();
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
  return this._observers.length;
};

/*
  count based on the _idMap keys
*/
Query.prototype.count = function(callback) {
  var self = this;

  if(this.snapshotInProgress) {
    this._afterSnapshotCallbacks.push(doCount);
  } else if(this._snapShotCount == 0) {
    //use the count command on the server
    this._collection._collection.count(this._selector, callback);
  } else {
    doCount();
  }

  function doCount() {
    callback(null, _.keys(self._idMap).length);
  }
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
        var fields = _.omit(doc, '_id');
        self._rawChanged(doc._id, fields);
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
  return (this._idMap[id])? true: false;
};

Query.prototype.getCursor = function() {
  this._debug('getCursor');
  return this._collection._collection.find(this._selector, this._options);
};

Meteor.SmartQuery = Query;