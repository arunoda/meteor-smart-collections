/*
  
*/
function Query(collection, selector, options) {
  this._selector = selector;
  this._selectorMatcher = LocalCollection._compileSelector(this._selector);
  this._options = options || {};
  this._collection = collection;

  this._amatureObserves = [];
  this._observers = [];
  this.snapshotInProgress = false;
  this._needSnapshot = false;
           
  this._idMap = {};

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

  if(typeof(this._options.fields) == 'object') {
    this._fields = this._compileFields(this._options.fields);
  }
}

Query.prototype.added = function(doc) {
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
  if(this._idMap[id]) {
    if(this._options.limit > 0 && this._sortable && this._isSortFieldsChanged(fields)) {
      //if sorted and limited, we need to snapshot again
      this.snapshot();
    } else {
      this._rawChanged(id, fields);
    }
  }
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

Query.prototype.addObserver = function(observer) {
  this._amatureObserves.push(observer);
  if(!this.snapshotInProgress) {
    this.snapshot();
  }
};

Query.prototype.removeObserver = function(observer) {
  var index = this._observers.indexOf(observer);
  if(index >= 0) {
    this._observers.splice(index, 1);
  }
};

Query.prototype.snapshot = function() {
  if(this.snapshotInProgress) {
    this._needSnapshot = true;
    return;
  }

  var self = this;
  this.snapshotInProgress = true;
  this._needSnapshot = false;

  this._collection._collection.find(this._selector, this._options).toArray(function(err, results) {
    if(err) {
      throw new err;
    } else {
      var oldIds = _.keys(self._idMap);
      var newIds = [];
      var newIdMap = {};

      for(var index in results) {
        var doc = results[index];
        newIdMap[doc._id] = doc;
        newIds.push(doc._id);

        //handling for amature observers
        self._amatureObserves.forEach(function(observer) {
          observer.added(doc);
        });
      }

      var addedIds = _.difference(newIds, oldIds);
      var removedIds = _.difference(oldIds, newIds);
      var changedIds = _.intersection(oldIds, newIds);

      removedIds.forEach(function(id) {
        self._rawRemoved(id);
      });

      addedIds.forEach(function(id) {
        self._rawAdded(newIdMap[id]);
      });

      changedIds.forEach(function(id) {
        var fields = _.omit(newIdMap[id], '_id');
        self._rawChanged(id, fields);
      });

      //merge amature observers
      if(self._amatureObserves.length > 0) {
        self._observers = self._observers.concat(self._amatureObserves);
        self._amatureObserves = [];
      }

      //setting idMap
      self._idMap = {};
      for(var key in newIdMap) {
        self._idMap[key] = true;
      }

      self.snapshotInProgress = false
      if(self._needSnapshot) {
        self.snapshot();
      }
    }
  });
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

Meteor.SmartQuery = Query;