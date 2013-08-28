var util = Npm.require('util');
var EventEmitter = Npm.require('events').EventEmitter;
var UPDATE_OPERATIONS = generateUpdateOperationsMap();

function Invalidator(collection) {
  this._collection = collection;
  this._selectors = [];

  this._queryInfoList = [];
}

util.inherits(Invalidator, EventEmitter);

Invalidator.prototype.initiateQuery = function(selector, options) {
  options = options || {};

  for(var lc=0; lc<this._queryInfoList.length; lc++) {
    var queryInfo = this._queryInfoList[lc];
    if(!EJSON.equals(selector, queryInfo.selector)) {
      continue;
    }

    if(!EJSON.equals(options.sort, queryInfo.options.sort)) {
      continue;
    }

    if(options.limit != queryInfo.options.limit) {
      continue;
    }

    //there is an exiting query
    return queryInfo.query;
  }

  //add a query if there is no maching query
  var query = new Meteor.SmartQuery(this._collection, selector, options);
  this._queryInfoList.push({
    selector: selector, 
    options: options,
    query: query
  });

  return query;
};

// expect doc to have _id
Invalidator.prototype.insert = function(doc) {
  this._queryInfoList.forEach(function(queryInfo) {
    if(queryInfo.query._selectorMatcher(doc)) {
      queryInfo.query.added(doc);
    }
  });
};

Invalidator.prototype.remove = function(id) {
  this._queryInfoList.forEach(function(queryInfo) {
    if(queryInfo.query.idExists(id)) {
      queryInfo.query.removed(id);
    }
  });
};

Invalidator.prototype.update = function(id, modifier, callback) {
  var self = this;
  var collection = this._collection;
  var fields;
  var version;

  var fieldLists = Invalidator.updateModifierToFields(modifier);
  fields = _.extend(fieldLists.update, fieldLists.remove);
  collection._collection.findOne({_id: id}, afterFound);

  function afterFound(err, doc) {
    if(err) {
      console.error('error finding document: ' + id + ' with error: ' + err.message);
    } else if(doc) {
      //invalidate queries for added if this update affect them
      self._notifyAdded(id, doc);

      //invalidate queries for removed if this affect them
      self._notifyRemoved(id, doc);

      //invalidate queries for update
      self._notifyChanges(id, fields, doc);
    } else {
      console.warn('no such document: ' + id);
    }
    callback();
  }
};

Invalidator.prototype.poll = function(callback) {
  var self = this;
  var snapshotCount = 0;
  var received = 0;

  this._queryInfoList.forEach(function(queryInfo) {
    snapshotCount++;
    queryInfo.query.snapshot(afterSnapshot);
  });

  function afterSnapshot() {
    if(++received == snapshotCount) {
      if(callback) callback();
    }
  }
};

Invalidator.prototype._notifyAdded = function(id, doc) {
  this._queryInfoList.forEach(function(queryInfo) {
    var query = queryInfo.query;
    if(!query.idExists(id) && query._selectorMatcher(doc)) {
      query.added(doc);
    }
  });
};

Invalidator.prototype._notifyRemoved = function(id, doc) {
  this._queryInfoList.forEach(function(queryInfo) {
    var query = queryInfo.query;
    if(query.idExists(id) && !query._selectorMatcher(doc)) {
      query.removed(id);
    }
  });
};

Invalidator.prototype._notifyChanges = function(id, fileldMap, doc) {
  var fields = {};
  for(var field in fileldMap) {
    fields[field] = (doc[field] == undefined)? null: doc[field];
  }

  this._queryInfoList.forEach(function(queryInfo) {
    var query = queryInfo.query;
    if(query.idExists(id)) {
      query.changed(id, fields);
    }
  });
};

Invalidator.updateModifierToFields = function updateModifierToFields(modifier) {
  var result = {update: {}, remove: {}};
  for(var operation in modifier) {
    var action = UPDATE_OPERATIONS[operation];
    pickFields(modifier[operation], action);
  }

  function pickFields(updateCommand, action) {
    if(action == 'UPDATE_ONLY') {
      for(var key in updateCommand) {
        result.update[handleDot(key)] = 1;
      }
    } else if(action == 'REMOVE_ONLY') {
      for(var key in updateCommand) {
        result.remove[handleDot(key)] = 1;
      }
    } else if(action == 'UPDATE_AND_REMOVE') {
      for(var key in updateCommand) {
        result.update[handleDot(key)] = 1;
        result.remove[handleDot(key)] = 1;
      }
    }
  }

  function handleDot(key) {
    var dotIndex = key.indexOf('.');
    if(dotIndex >= 0) {
      return key.substring(0, dotIndex);
    } else {
      return key;
    }
  }

  //no modifiers, then direct doc update
  if(_.keys(result.update).length == 0 && _.keys(result.remove).length == 0) {
    _.keys(modifier).forEach(function(field) {
      if(field[0] != '.' && field[0] != '$') {
        result.update[field] = 1;
      }
    });
  }
  
  return result;
};

function generateUpdateOperationsMap() {
  var updateOnly = ['$inc', '$setOnInsert', '$set', '$addToSet', '$pop', '$pullAll', '$pull', '$pushAll', '$push', '$bit'];
  var removeOnly = ['$unset'];
  var updateAndRemove = ['$rename'];

  var map = {};
  updateOnly.forEach(function(field) {
    map[field] = 'UPDATE_ONLY';
  });

  removeOnly.forEach(function(field) {
    map[field] = 'REMOVE_ONLY';
  });

  updateAndRemove.forEach(function(field) {
    map[field] = 'UPDATE_AND_REMOVE';
  });

  return map;
};

Meteor.SmartInvalidator = Invalidator;