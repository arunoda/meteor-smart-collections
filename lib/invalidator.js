var util = Npm.require('util');
var EventEmitter = Npm.require('events').EventEmitter;

function Invalidator() {
  this._cursors = [];
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

  return result;
};

Invalidator.prototype.addCursor = function addCursor(cursor) {
  var index = this._cursors.indexOf(cursor);
  if(index < 0) {
    this._cursors.push(cursor);
  }
};

Invalidator.prototype.removeCursor = function removeCursor(cursor) {
  var index = this._cursors.indexOf(cursor);
  if(index >= 0) {
    this._cursors.splice(index, 1);
  }
};

Meteor.SmartInvalidator = new Invalidator();