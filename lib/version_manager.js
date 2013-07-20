function VersionManager() {
  this._lastVersion = 0;
  this._idHandlers = {};
  this._versionDefaults = {};
  this._multiIdVersions = [];
}

VersionManager.prototype.begin = function begin(id, fields) {

  var version = ++this._lastVersion;
  //copy and make field values into null
  var defaults = {};
  for(var field in fields) {
    defaults[field] = null;
  }
  this._versionDefaults[version] = defaults;

  if(id) {
    //id may be null for the updates without indicating ids
    this._ensureIdHandlerExist(id);
    this._idHandlers[id].pendingVersions.push(version);
  } else {
    //need to add this, since we can't delete idHandlers when atleast one multiIdVersion exists
    this._multiIdVersions.push(version);
  }

  return version;
};

/*
  Algorithm
  ----------
  merge result with the fields
  check if this is the latestVersion
    make the object to result
    set the currVersion to this
    set return = result
  if this is not the latestVersion
    diff for additional fields
    set return = diff
    merge diff to the object
  remove version and releated data
  if no version any pendingVersions exists
    clear idHandler
  finally do return
*/
VersionManager.prototype.commit = function commit(id, version, result, dontClearVersion) {
  if(!this._versionDefaults[version]) {
    throw new Error('no such version exists');
  }

  this._ensureIdHandlerExist(id);

  var changes = null;
  var idHandler = this._idHandlers[id];
  //merge result with the fields - which shows us deleted fields
  result = _.defaults(result, this._versionDefaults[version]);

  if(version > idHandler.currVersion) {
    //if this version is greater than the currVersion
    idHandler.object = result;
    idHandler.currVersion = version;
    changes = result;
  } else {
    //if there is a latest version commited before
    var diff = VersionManager.diffObject(idHandler.object, result);
    changes = diff;
    _.extend(idHandler.object, diff);
  }

  //used with update sectors without _id, then we've multiple ids for a version
  if(dontClearVersion) {
    this._clean(id);
  } else {
    this._clean(id, version);
  }

  return  changes;
};

//used with update sectors without _id, then we've multiple ids for a version
VersionManager.prototype.cleanVersion = function(version) {
  delete this._versionDefaults[version];
  var index = this._multiIdVersions.indexOf(version);
  this._multiIdVersions.splice(index, 1);

  if(this._multiIdVersions.length == 0) {
    //check and remove idHandlers if can
    for(var id in this._idHandlers) {
      if(this._idHandlers[id].pendingVersions.length == 0) {
        delete this._idHandlers[id];
      }
    }
  }
};

VersionManager.prototype.abort = function abort(id, version) {
  this._clean(id, version);
};

//remove default and the version from the idHandler.pendingVersions
VersionManager.prototype._clean = function _clean(id, version) {
  var idHandler = this._idHandlers[id];

  if(version) {
    delete this._versionDefaults[version];
    var versionIndex = idHandler.pendingVersions.indexOf(version);
    idHandler.pendingVersions.splice(versionIndex, 1);
  }

  //only clean idHandler if there is no multi id version
  if(this._multiIdVersions.length == 0 && idHandler.pendingVersions.length == 0) {
    //if there is no perndingVersions, we don't need to track
    delete this._idHandlers[id];
  }
};

VersionManager.prototype._ensureIdHandlerExist = function(id) {
  if(!this._idHandlers[id]) {
    this._idHandlers[id] = {pendingVersions: [], object: null, currVersion: null};
  }
};

VersionManager.diffObject = function diffObject(parent, child) {
  var diff = {};
  for(var key in child) {
    if(!parent[key]) {
      diff[key] = child[key];
    }
  }

  return diff;
};

Meteor.SmartVersionManager = VersionManager;