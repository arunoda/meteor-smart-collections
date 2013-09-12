var MongoClient = Npm.require('mongodb').MongoClient;
var EventEmitter = Npm.require('events').EventEmitter;
var util = Npm.require('util');

function OplogConnection(dbName, oplogUrl, options) {
  this.dbName = dbName;
  this.oplogUrl = oplogUrl;
  this.options = options || {};

  this._latestTs = null;
  this._justAfterError = false;
}

util.inherits(OplogConnection, EventEmitter);

OplogConnection.prototype.connect = function(callback) {
  var self = this;
  this._connect(function(err, db) {
    if(!err) {
      self._startTailing(db);
      self.emit('connect');
    }
    if(callback) callback(err);
  });
};

OplogConnection.prototype._connect = function(callback) {
  MongoClient.connect(this.oplogUrl, this.options, callback);
};

OplogConnection.prototype._startTailing = function (localDb) {
  var self = this;
  var query = {
    ns: new RegExp(this.dbName + '\.'),
    $or: [
      {op: {$in: ['i', 'u', 'd']}},
      {op: 'c', 'o.drop': {$exists: true}} 
    ]
  };

  var coll = localDb.collection('oplog.rs');
  var tailingCursor;

  if(self._latestTs) {
    tailCursor();
  } else {
    var cursor = coll.find(query, {
      sort: {$natural: -1},
      limit: 1
    });
    cursor.toArray(function(err, docs) {
      if(err) throw err;
      if(docs.length > 0) {
        self._latestTs = docs[0].ts;
      }
      tailCursor();
    })
  }

  function tailCursor() {
    if(self._latestTs) {
      query['ts'] = {$gt: self._latestTs};
    }

    tailingCursor = coll.find(query, {
      tailable: true,
      awaitdata: true,
      numberOfRetries: -1
    });
    tailingCursor.nextObject(onOpDoc);
  }
  
  function onOpDoc(err, result) {
    // if(self._justAfterError) {
    //   self._justAfterError = false;
    //   tailingCursor.close();
    //   localDb.close();
    //   console.info('Reconnecting to Oplog');
    //   return self.connect();
    // }

    if(err) {
      throw err;
      // Meteor._debug("ON OPLOG DATA: " + err.message, err.stack);

      // //re-tail again
      // tailCursor();
    } else {
      self._latestTs = result.ts;
      self.emit('op', result);
      tailingCursor.nextObject(onOpDoc);
    }
  }
}

function MongoConnection(mongoUrl, options) {
  this.mongoUrl = mongoUrl;
  this.options = options;
}

util.inherits(MongoConnection, EventEmitter);

MongoConnection.prototype.connect = function(callback) {
  var self = this;
  this._connect(function(err, db) {
    if(!err) {
      self.db = db;
      self.emit('connect');
    }
    if(callback) callback(err);
  });
};

MongoConnection.prototype._connect = function(callback) {
  MongoClient.connect(this.mongoUrl, this.options, callback);
};

Meteor.SmartOplogConnection = OplogConnection;
Meteor.SmartMongoConnection = MongoConnection;