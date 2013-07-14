var util = Npm.require('util');
var EventEmitter = Npm.require('events').EventEmitter;

function Invalidator() {
  this._cursors = {};
  this._collections = {};
  this._selectors = {};
  this.UPDATE_OPERATIONS = generateUpdateOperationsMap();

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
}

util.inherits(Invalidator, EventEmitter);

Invalidator.prototype.updateModifierToFields = function updateModifierToFields(modifier) {
  var result = {update: {}, remove: {}};
  for(var operation in modifier) {
    var action = this.UPDATE_OPERATIONS[operation];
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
      result.update[field] = 1;
    });
  }
  
  return result;
};

Invalidator.prototype.registerCollection = function(name, collection) {
  this._collections[name] = collection;
};

Invalidator.prototype.addCursor = function addCursor(collectionName, cursor) {
  if(!this._cursors[collectionName]) {
    this._cursors[collectionName] = [];
  }
  var index = this._cursors[collectionName].indexOf(cursor);
  if(index < 0) {
    this._cursors[collectionName].push(cursor);
  }

  //add to correct selector
  var added = false;
  if(!this._selectors[collectionName]) {
    this._selectors[collectionName] = [];
  }
  var selectors = this._selectors[collectionName];

  for(var lc=0; lc<selectors.length; lc++) {
    var selectorInfo = selectors[lc];
    if(Meteor.deepEqual(selectorInfo.selector, cursor._selector)) {
      selectorInfo.cursors.push(cursor);
      added = true;
      break;
    }
  }  

  if(!added) {
    selectors.push({
      selector: cursor._selector,
      cursors: [cursor]
    });
  }
};

Invalidator.prototype.removeCursor = function removeCursor(collectionName, cursor) {
  var index = this._cursors[collectionName].indexOf(cursor);
  if(index >= 0) {
    this._cursors[collectionName].splice(index, 1);
  }

  //remove cursor from the selector
  var selectors = this._selectors[collectionName];
  if(selectors) {
    for(var lc=0; lc<selectors.length; lc++) {
      var selectorInfo = selectors[lc];
      if(Meteor.deepEqual(selectorInfo.selector, cursor._selector)) {
        var cursorIndex = selectorInfo.cursors.indexOf(cursor);
        selectorInfo.cursors.splice(cursorIndex, 1);

        if(selectorInfo.cursors.length == 0) {
          var selectorIndex = selectors.indexOf(selectorInfo);
          selectors.splice(selectorIndex, 1);
        }
        break;
      }
    }
  }

};

// expect doc to have _id
Invalidator.prototype.invalidateInsert = function(collectionName, doc) {
  if(this._cursors[collectionName]) {
    this._cursors[collectionName].forEach(function(cursor) {
      if(cursor._selectorMatcher(doc)) {
        cursor._added(doc);
      }
    });
  }
};

Invalidator.prototype.invalidateRemove = function(collectionName, id) {
  if(this._cursors[collectionName]) {
    this._cursors[collectionName].forEach(function(cursor) {
      if(cursor._idExists(id)) {
        cursor._removed(id);
      }
    });
  }
};

Invalidator.prototype.invalidateUpdate = function(collectionName, id, modifier) {
  var self = this;
  var collection = this._collections[collectionName];
  var fields;
  var version;

  if(collection) {
    var fieldLists = this.updateModifierToFields(modifier);
    fields = _.extend(fieldLists.update, fieldLists.remove);
    version = collection.versionManager.begin(id, fields);
    collection._collection.findOne({_id: id}, afterFound);
  } else {
    console.warn('asked to invalidateUpdate non-existing collection: ' + collectionName);
  }

  function afterFound(err, doc) {
    if(err) {
      collection.versionManager.abort(id, version);
    } else if(doc) {
      //invalidate cursors for added if this update affect them
      self._notifyAdded(collectionName, id, doc);

      //invalidate cursors for removed if this affect them
      self._notifyRemoved(collectionName, id, doc);

      //invalidate cursors for update
      var filteredFields = _.pick(doc, Object.getOwnPropertyNames(fields));
      var versionedResult = collection.versionManager.commit(id, version, filteredFields);
      self._notifyChanges(collectionName, id, versionedResult);
    } else {
      collection.versionManager.abort(id, version);
    }
  }
};

Invalidator.prototype.invalidateMultiUpdate = function(collectionName, selector, modifier) {
  var self = this;
  var collection = this._collections[collectionName];
  var fields;
  var version;

  if(collection) {
    var fieldLists = this.updateModifierToFields(modifier);
    fields = _.extend(fieldLists.update, fieldLists.remove);
    version = collection.versionManager.begin(null, fields);
    collection._collection.find(selector).each(processInvalidation);
  } else {
    console.warn('asked to invalidateUpdate non-existing collection: ' + collectionName);
  }

  function processInvalidation(err, doc) {
    if(err) {
      console.error('error when invalidation: ', {collection: collectionName, selector: selector, modifier: modifier, error: err.message});
      collection.versionManager.cleanVersion(version);
    } else if(doc) {
      var id = doc._id;
      //invalidate cursors for added if this update affect them
      self._notifyAdded(collectionName, id, doc);

      //invalidate cursors for removed if this affect them
      self._notifyRemoved(collectionName, id, doc);

      //invalidate cursors for update
      var filteredFields = _.pick(doc, Object.getOwnPropertyNames(fields));
      var versionedResult = collection.versionManager.commit(id, version, filteredFields, true);
      self._notifyChanges(collectionName, id, versionedResult);
    } else {
      collection.versionManager.cleanVersion(version);
    }
  }
};

Invalidator.prototype._notifyAdded = function(collectionName, id, doc) {
  if(this._cursors[collectionName]) {
    this._cursors[collectionName].forEach(function(cursor) {
      if(!cursor._idExists(id) && cursor._selectorMatcher(doc)) {
        cursor._added(doc);
      }
    });
  }
};

Invalidator.prototype._notifyRemoved = function(collectionName, id, doc) {
  if(this._cursors[collectionName]) {
    this._cursors[collectionName].forEach(function(cursor) {
      if(cursor._idExists(id) && !cursor._selectorMatcher(doc)) {
        cursor._removed(id);
      }
    });
  }
};

Invalidator.prototype._notifyChanges = function(collectionName, id, fields) {
  if(this._cursors[collectionName]) {
    this._cursors[collectionName].forEach(function(cursor) {
      if(cursor._idExists(id)) {
        cursor._changed(id, fields);
      }
    });
  }
};

Meteor.SmartInvalidator = new Invalidator();