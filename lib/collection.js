var util = Npm.require('util');
var EventEmitter = Npm.require('events').EventEmitter;
var Fibers = Npm.require('fibers');
var Future = Npm.require('fibers/future');

function SmartCollection(collectionName) {
  var self = this;
  this._collection = null;

  if(Meteor.SmartMongo.db) {
    createCollection();
  } else {
    Meteor.SmartMongo.on('ready', createCollection);
  }

  function createCollection() {
    self._collection = Meteor.SmartMongo.db.collection(collectionName);
    self.emit('ready');
  }

  //do both fiber and non-fiber support
  ['insert', 'update', 'remove', 'findOne'].forEach(function(writeMethod) {
    self[writeMethod] = function() {
      var future;
      if(Fibers.current) {
        future = new Future();
        Array.prototype.push.call(arguments, future.resolver());
      }
      
      applyMethod(arguments);
      if(future) future.wait();

      //returning _id after inserted. only available for inserts
      if(writeMethod == 'insert') {
        return arguments[0]._id;
      } else if(writeMethod == 'findOne' && future) {
        return future.value;
      }
    };

    //ensure called after once _collection is ready
    function applyMethod(args) {
      if(self._collection) {
        doApply();
      } else {
        self.once('ready', doApply);
      }

      function doApply() {
        self['_' + writeMethod].apply(self, args)
      }
    }
  });
}

util.inherits(SmartCollection, EventEmitter);

SmartCollection.prototype.find = function(selector, options) {
  selector = selector || {};
  options = options || {};
  var mongoCursor = this._collection.find(selector, options);
  return new Meteor.SmartCursor(mongoCursor);
};

SmartCollection.prototype._findOne = function(query, callback) {
  this._collection.findOne(query, callback);
};

SmartCollection.prototype._insert = function _insert(document, callback) {
  if(!document._id) {
    document._id = Random.id();
  }

  this._collection.insert(document, callback);
};

SmartCollection.prototype._update = function(selector, mod, options, callback) {
  this._collection.update(selector, mod, options, callback);
};

SmartCollection.prototype._remove = function(selector, callback) {
  this._collection.remove(selector, callback);
};

Meteor.SmartCollection = SmartCollection;
