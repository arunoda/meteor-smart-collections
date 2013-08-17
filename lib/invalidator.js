var util = Npm.require('util');
var EventEmitter = Npm.require('events').EventEmitter;
var UPDATE_OPERATIONS = generateUpdateOperationsMap();

function Invalidator(collection) {
  this._collection = collection;
  this._cursors = [];
  this._selectors = [];
}

util.inherits(Invalidator, EventEmitter);

Invalidator.prototype.addCursor = function addCursor(cursor) {
  var index = this._cursors.indexOf(cursor);
  if(index < 0) {
    this._cursors.push(cursor);
  }

  //add to correct selector
  var added = false;

  for(var lc=0; lc<this._selectors.length; lc++) {
    var selectorInfo = this._selectors[lc];
    if(EJSON.equals(selectorInfo.selector, cursor._selector)) {
      selectorInfo.cursors.push(cursor);
      added = true;
      break;
    }
  }  

  if(!added) {
    this._selectors.push({
      selector: cursor._selector,
      cursors: [cursor]
    });
  }
};

Invalidator.prototype.removeCursor = function removeCursor(cursor) {
  var index = this._cursors.indexOf(cursor);
  if(index >= 0) {
    this._cursors.splice(index, 1);
  }

  //remove cursor from the selector
  for(var lc=0; lc<this._selectors.length; lc++) {
    var selectorInfo = this._selectors[lc];
    if(EJSON.equals(selectorInfo.selector, cursor._selector)) {
      var cursorIndex = selectorInfo.cursors.indexOf(cursor);
      selectorInfo.cursors.splice(cursorIndex, 1);

      if(selectorInfo.cursors.length == 0) {
        var selectorIndex = this._selectors.indexOf(selectorInfo);
        this._selectors.splice(selectorIndex, 1);
      }
      break;
    }
  }
};

// expect doc to have _id
Invalidator.prototype.insert = function(doc) {
  this._cursors.forEach(function(cursor) {
    if(cursor._selectorMatcher(doc)) {
      cursor._added(doc);
    }
  });
};

Invalidator.prototype.remove = function(id) {
  this._cursors.forEach(function(cursor) {
    if(cursor._idExists(id)) {
      cursor._removed(id);
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
      //invalidate cursors for added if this update affect them
      self._notifyAdded(id, doc);

      //invalidate cursors for removed if this affect them
      self._notifyRemoved(id, doc);

      //invalidate cursors for update
      self._notifyChanges(id, fields, doc);
    } else {
      console.warn('no such document: ' + id);
    }
    callback();
  }
};

Invalidator.prototype.poll = function(callback) {
  var self = this;
  var collection = this._collection;
  var selectors = this._selectors;
  var iterations = 0;

  selectors.forEach(pollSelector);
  function pollSelector(selectorInfo) {
    iterations ++;
    var idsExists = [];
    collection._collection.find(selectorInfo.selector).each(function(err, doc) {
      if(err) {
        console.error('error when polling for selector in multiUpdate', {collection: collection.name, selector: selectorInfo.selector, error: err.message});
        iterations --;
      } else if(doc) {
        idsExists.push(doc._id);
        selectorInfo.cursors.forEach(function(cursor) {
          if(cursor._idExists(doc._id)) {
            cursor._changed(doc._id, _.omit(doc, '_id'));
          } else {
            cursor._added(doc);
          }
        });
      } else {
        selectorInfo.cursors.forEach(function(cursor) {
          cursor._computeAndNotifyRemoved(idsExists);
        });
        iterations --;
      }
      if(iterations == 0) callback();
    });
  }
};

Invalidator.prototype._notifyAdded = function(id, doc) {
  this._cursors.forEach(function(cursor) {
    if(!cursor._idExists(id) && cursor._selectorMatcher(doc)) {
      cursor._added(doc);
    }
  });
};

Invalidator.prototype._notifyRemoved = function(id, doc) {
  this._cursors.forEach(function(cursor) {
    if(cursor._idExists(id) && !cursor._selectorMatcher(doc)) {
      cursor._removed(id);
    }
  });
};

Invalidator.prototype._notifyChanges = function(id, fileldMap, doc) {
  var fields = {};
  for(var field in fileldMap) {
    fields[field] = (doc[field] == undefined)? null: doc[field];
  }

  this._cursors.forEach(function(cursor) {
    if(cursor._idExists(id)) {
      cursor._changed(id, fields);
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