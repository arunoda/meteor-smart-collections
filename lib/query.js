/*
  
*/
function Query(collection, query, options) {
  this._query = query;
  this._options = options || {};
  this._collection = collection;

  this._amatureObserves = [];
  this._observers = [];
  this.snapshotInProgress = false;
  this._needSnapshot = false;
           
  this._idMap = {};
}

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

  this._collection._collection.find(this._query, this._options).toArray(function(err, results) {
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
        self._observers.forEach(function(observer) {
          observer.removed(id);
        });
      });

      addedIds.forEach(function(id) {
        self._observers.forEach(function(observer) {
          observer.added(newIdMap[id]);
        });
      });

      changedIds.forEach(function(id) {
        self._observers.forEach(function(observer) {
          var fields = _.omit(newIdMap[id], '_id');
          observer.changed(id, fields);
        });
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

Meteor.SmartQuery = Query;