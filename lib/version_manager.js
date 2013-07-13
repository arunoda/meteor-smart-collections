function VersionManager() {
  this._lastVersion = 0;
  this._idHandlers = {};
  this._versionDefaults = {};
}

VersionManager.prototype.begin = function begin(id, fields) {
  if(!this._idHandlers[id]) {
    this._idHandlers[id] = {pendingVersions: [], object: null, currVersion: null};
  }

  var version = ++this._lastVersion;
  //copy and make field values into null
  var defaults = {};
  for(var field in fields) {
    defaults[field] = null;
  }
  this._versionDefaults[version] = defaults;
  this._idHandlers[id].pendingVersions.push(version);

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
VersionManager.prototype.commit = function commit(id, version, result) {
  if(!this._versionDefaults[version]) {
    throw new Error('no such version exists');
  }

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

  //remove default and the version from the idHandler.pendingVersions
  this._clearVersion(id, version);

  return  changes;
};

VersionManager.prototype.abort = function abort(id, version) {
  this._clearVersion(id, version);
};

VersionManager.prototype._clearVersion = function _clearVersion(id, version) {
  var idHandler = this._idHandlers[id];
  this._versionDefaults[version] = null;

  var versionIndex = idHandler.pendingVersions.indexOf(version);
  idHandler.pendingVersions.splice(versionIndex, 1);

  if(idHandler.pendingVersions.length == 0) {
    //if there is no perndingVersions, we don't need to track
    this._idHandlers[id] = null;
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