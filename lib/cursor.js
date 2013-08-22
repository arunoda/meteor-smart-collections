var Fibers = Npm.require('fibers');
var Future = Npm.require('fibers/future');
var util = Npm.require('util');
var EventEmitter = Npm.require('events').EventEmitter;

function Cursor(mongoCursor, collection, options) {
  this.setMaxListeners(0);
  var self = this;

  if(mongoCursor && collection) {
    this.init(mongoCursor, collection, options);
  }
}

util.inherits(Cursor, EventEmitter);

Cursor.prototype.init = function(mongoCursor, collection, options) {
  this._cursor = mongoCursor;
  this._collection = collection;
  this._transform = options.transform;

  this._selectorMatcher = LocalCollection._compileSelector(this._cursor.selector);
  this._selector = this._cursor.selector;
  this._options = options;

  this.observing = false;
  this._idMap = {};
  this._used = false;
  this.emit('ready');

  //when query re-run is happening we need to block any .added or .removed, 
  //so this indicate that
  this._blocked = false;
  //while in the blocked state, if .added or .removed happens, we need to re-run query again
  //so this will take care of that
  this._needReRun = false;

  //sorted cursor specific fields
  //cache fields related to sort
  if(typeof(this._options.sort) == 'object') {
    this._sortDocCacheMap = {};
    this._sortDocCacheList = [];
    this._sortable = true;
   
    //todo: add support for other sorting methods - http://docs.meteor.com/#sortspecifiers
    this._sortFields = this._getSortFields(this._options.sort);
    this._sortFields.push('_id');
    this._sortFields = _.uniq(this._sortFields);

    this._sortComparator = LocalCollection._compileSort(this._options.sort);
  }

  if(typeof(this._options.fields) == 'object') {
    this._fields = this._compileFields(this._options.fields);
  }
};

Cursor.prototype._forEach = function (callback, endCallback) {
  var self = this;
  this._cursor.nextObject(afterNextObject);
  function afterNextObject(err, item) {
    Fibers(function() {
      if(err) {
        endCallback(err);
      } else if(item) {
        var transformFunc = self._getTransformFunction();
        if(transformFunc) {
          item = transformFunc(item);
        }
        callback(item);
        self._cursor.nextObject(afterNextObject);
      } else {
        endCallback();
      }
    }).run();
  }
};

Cursor.prototype._map = function _map(mapCallback, resultCallback) {

  var self = this;
  var data = [];
  this._cursor.nextObject(afterNextObject);

  function afterNextObject(err, item) {
    Fibers(function() {
      if(err) {
        resultCallback(err);
      } else if(item) {
        var transformFunc = self._getTransformFunction();
        if(transformFunc) {
          item = transformFunc(item);
        }
        data.push(mapCallback(item));
        self._cursor.nextObject(afterNextObject);
      } else {
        resultCallback(null, data);
      }
    }).run();
  }
};

Cursor.prototype._fetch = function _fetch(callback) {
  var self = this;
  this._cursor.toArray(function(err, results) {
    Fibers(function() {
      //if options.transform is === null, we should not do the transform
      var transformFunc = self._getTransformFunction();
      if(transformFunc && results) {
        for(var lc=0; lc<results.length; lc++) {
          results[lc] = transformFunc(results[lc]);
        }
      }
      callback(err, results);
    }).run();
  });
};

Cursor.prototype._count = function _count(callback) {
  this._cursor.count(callback);
};

Cursor.prototype.rewind = function rewind() {
  this._cursor.rewind();
};

Cursor.prototype._observeChanges = function _observeChanges(callbacks, endCallback) {
  if(this._used) {
    return (callback)? callback(new Error('Cursor has been used or in observing')): null;
  }

  var self = this;
  this.observing = true;
  this._used = true;

  ['added', 'changed', 'removed'].forEach(function(event) {
    if(typeof(callbacks[event]) == 'function') {
      self.on(event, callbacks[event]);
    }
  });

  this._collection.invalidator.addCursor(this);

  this.rewind();
  this._forEach(function(item) {
    self._added(item);
  }, afterForeach);

  function afterForeach(err) {
    if(err) {
      self._clean();
      if(endCallback) endCallback(err);
    } else {
      var observeHandler = new ObserveHandler(self);
      if(endCallback) endCallback(null, observeHandler);
    }
  }
};

Cursor.prototype._idExists = function _idExists(id) {
  return (this._idMap[id])? true: false;
};

Cursor.prototype._added = function _added(doc) {
  
  //if blocked, do not proceed just ask for a queryReRun again
  if(this._blocked) {
    this._needReRun = true;
    return;
  }

  //if the current documents in the cursor is aligned with the limit, do no add them
  if(!this._sortable && this._options.limit > 0 && _.keys(this._idMap).length >= this._options.limit) {
    return;
  }

  if(this.observing && !this._idMap[doc._id]) {
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
      //get its position
      //if it is in between limit procedd
      //if not ignore
    } else {
      this._rawAdded(doc);
    }
  }
};

Cursor.prototype._removed = function _removed(id) {
  //if blocked, do not proceed just ask for a queryReRun again
  if(this._blocked) {
    this._needReRun = true;
    return;
  }

  if(this.observing && this._idMap[id]) {
    
    this._rawRemoved(id);

    //start query re-run if there is a limit
    if(this._options.limit > 0) {
      this._queryReRun();
    }
  }
};

Cursor.prototype._changed = function(id, fields) {
  if(this.observing && this._idMap[id]) {
    if(this._options.limit > 0 && this._sortable && this._isSortFieldsChanged(fields)) {
      //if sorted and limited, we need to re-run the query
      if(this._blocked) {
        this._needReRun = true;
      } else {
        this._queryReRun();
      }
    } else {
      this._rawChanged(id, fields);
    }
  }
};

Cursor.prototype._isSortFieldsChanged = function(doc) {
  var commonFields = _.intersection(_.keys(doc), _.without(this._sortFields, '_id'));
  return commonFields.length > 0;
};

Cursor.prototype._getSortFields = function(sortExpression) {
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

Cursor.prototype._rawAdded = function(doc) {
  this._idMap[doc._id] = true;
  this._fiberEmit('added', doc._id, this._filterFields(doc));

  //caching for sort
  if(this._sortable) {
    var sortCacheDoc = _.pick(doc, this._sortFields);
    this._sortDocCacheMap[doc._id] = sortCacheDoc;
    LocalCollection._insertInSortedList(this._sortComparator, this._sortDocCacheList, sortCacheDoc);
  }
};

Cursor.prototype._rawRemoved = function(id) {
  delete this._idMap[id];
  this._fiberEmit('removed', id);

  //remove sort caching
  if(this._sortable) {
    var cachedDoc = this._sortDocCacheMap[id];
    delete this._sortDocCacheMap[id];
    var index = this._sortDocCacheList.indexOf(cachedDoc);
    this._sortDocCacheList.splice(index, 1);
  }
};

Cursor.prototype._rawChanged = function(id, fields) {
  this._fiberEmit('changed', id, this._filterFields(fields)); 

  //caching for sort
  if(this._sortable) {
    var cachedDoc = this._sortDocCacheMap[id];
    var changedDoc = _.pick(fields, this._sortFields);
    _.extend(cachedDoc, changedDoc);
    this._sortDocCacheList.sort(this._sortComparator);
  }
};

Cursor.prototype._compileFields = function(fields) {
  var include = [];
  var exclude = [];
  for(var field in fields) {
    if(fields[field] == 0) {
      exclude.push(field);
    } else if(fields[field] == 1) {
      include.push(field);
    }
  }

  include = _.uniq(include);
  exclude = _.uniq(exclude);

  //both types (not allowed except for _id);
  if(include.length > 0 && exclude.length > 0) {
    //allow to exclude _id with inclusion
    if(!(exclude.length == 1 && exclude[0] == '_id')) {
      throw new Error("It is not possible to mix inclusion and exclusion styles in field filtering");
    }
  }

  return {
    include: include,
    exclude: exclude
  };
};

Cursor.prototype._filterFields = function(doc) {
  if(typeof(this._fields) == 'object') {
    if(this._fields.include.length > 0) {
      var filteredDoc = _.pick(doc, this._fields.include);
      //always send _id if not asked to exclude
      if(this._fields.exclude[0] != '_id' && doc._id) {
        filteredDoc['_id'] = doc._id;
      }
      return filteredDoc;
    } else if(this._fields.exclude.length >0)  {
      return _.omit(doc, this._fields.exclude);
    }
  } else {
    return doc;
  }
};

Cursor.prototype._computeAndNotifyRemoved = function(newIds) {
  if(this.observing) {
    var self = this;
    var existingIds = _.keys(this._idMap);
    var removedIds = _.difference(existingIds, newIds);
    removedIds.forEach(function(id) {
      self._removed(id);
    });
  }
};

Cursor.prototype._getTransformFunction = function() {
  if(this._transform !== undefined) {
    return this._transform ;
  } else {
    return this._collection._transform;
  }
};

Cursor.prototype._clean = function() {
  this._collection.invalidator.removeCursor(this)
  this.observing = false;
  this._collection = null;
  this._cursor = null;

  this.removeAllListeners('added');
  this.removeAllListeners('changed');
  this.removeAllListeners('removed');
};

Cursor.prototype._queryReRun = function() {
  var self = this;

  if(this._blocked) {
    throw new Error('cannot rerun a query while blocked');
  }
  this._blocked = true;
  self._needReRun = false;

  this._cursor.rewind();
  this._fetch(function(err, results) {
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
        self._rawChanged(id, newIdMap[id]);
      });

      self._blocked = false;
      if(self._needReRun) {
        self._queryReRun();
      }
    }
  });
};

Cursor.prototype.__publishCursor = function(subscription, callback) {
  var self = this;

  this._observeChanges({
    added: function(id, doc) {
      subscription.added(self._collection.name, id, doc);
    },
    changed: function(id, fields) {
      subscription.changed(self._collection.name, id, fields);
    },
    removed: function(id) {
      subscription.removed(self._collection.name, id);
    }
  }, function(err, observeHandler) {
    if(err) {
      if(callback) callback(err);
    } else {
      subscription.onStop(function() { observeHandler.stop(); });
      if(callback) callback();
    }
  });
};

Cursor.prototype._getCollectionName = function() {
  return this._collection.name;
};

Cursor.prototype._fiberEmit = function(event, doc) {
  var self = this;
  var args = arguments;

  Fibers(function() {
    self.emit.apply(self, args);
  }).run();
};

//do both fiber and non-fiber support
['forEach', 'map', 'fetch', 'count', 'observeChanges', '_publishCursor'].forEach(function(method) {
  Cursor.prototype[method] = function() {
    var self = this;
    var future;
    if(Fibers.current) {
      future = new Future();
      Array.prototype.push.call(arguments, future.resolver());
    }

    var args = arguments;
    if(self._cursor) {
      doApply();
    } else {
      self.once('ready', doApply);
    }

    if(future) future.wait();

    if(future) {
      return future.value;
    }

    function doApply() {
      self['_' + method].apply(self, args);
    }
  };
});

/***** ObserveHandler ******/
function ObserveHandler(cursor) {
  this._cursor = cursor;
}

ObserveHandler.prototype.stop = function stop() {
  this._cursor._clean();
};
Meteor.SmartCursor = Cursor;