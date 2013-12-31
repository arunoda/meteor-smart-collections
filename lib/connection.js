var MongoClient = Npm.require('mongodb').MongoClient;
var EventEmitter = Npm.require('events').EventEmitter;
var util = Npm.require('util');

function OplogConnection(dbName, oplogUrl, options) {
  this.dbName = dbName;
  this.oplogUrl = oplogUrl;
  this.options = options || {};
  this._debug = Npm.require('debug')('sc:oplog');

  this._latestTs = null;
  this._justAfterError = false;
  this._debug("init dbName: %s url %s", dbName, oplogUrl);
}

util.inherits(OplogConnection, EventEmitter);

OplogConnection.prototype.connect = function(callback) {
  var self = this;
  this._debug('connect');
  this._connect(function(err, db) {
    if(!err) {
      self._startTailing(db);
      self.emit('connect');
      self._debug('connected');
    } else {
      self._debug('connecting error %s', err.message);
    }
    if(callback) callback(err);
  });
};

OplogConnection.prototype._connect = function(callback) {
  MongoClient.connect(this.oplogUrl, this.options, callback);
};

OplogConnection.prototype._startTailing = function (localDb) {
  var query = {
    ns: {$in: this._getNsList()},
    $or: [
      {op: {$in: ['i', 'u', 'd']}},
      {op: 'c', 'o.drop': {$exists: true}} 
    ]
  };

  var latestTs = null;
  var coll = localDb.collection('oplog.rs');
  var tailingCursor;
  var cursor = coll.find(query, {
    sort: {$natural: -1},
    limit: 1
  });

  cursor.each(onEach);

  function onEach(err, doc) {
    if(err) throw err;
    if(doc) {
      latestTs = doc.ts;
    } else {
      tailCursor();
    }
  }

  function tailCursor() {
    if(latestTs) {
      query['ts'] = {$gt: latestTs};
    }

    tailingCursor = coll.find(query, {
      tailable: true,
      awaitdata: true,
      numberOfRetries: 99999
    });
    tailingCursor.each(onOpDoc);
  }
  
  function onOpDoc(err, result) {
    if(err) {
      Meteor._debug("ON OPLOG DATA: " + err.message, err.stack);
      throw err;
    } else if(result) {
      latestTs = result.ts;
      Meteor.SmartOplog.processor(result);
    } else {
      //at the end of the cursor, need to tail again
      tailCursor();
    }
  }
}

OplogConnection.prototype._getNsList = function() {
  var nsList = [];
  //for the drop command
  nsList.push(this.dbName + '.$cmd'); 
  //add other collections
  for(var collName in Meteor.SmartCollection.map) {
    nsList.push(this.dbName + '.' + collName);
  }

  return nsList;
};

function MongoConnection(mongoUrl, options) {
  this.mongoUrl = mongoUrl;
  this.options = options;
  this._debug = Npm.require('debug')('sc:mongo');
  this._debug('init url: %s', mongoUrl);
}

util.inherits(MongoConnection, EventEmitter);

MongoConnection.prototype.connect = function(callback) {
  var self = this;
  this._debug('connect');
  this._connect(function(err, db) {
    if(!err) {
      self._debug('connected');
      self.db = db;
      self.emit('connect');
    } else {
      self._debug('connecting error: %', err.message);
    }
    if(callback) callback(err);
  });
};

MongoConnection.prototype._connect = function(callback) {
  MongoClient.connect(this.mongoUrl, this.options, callback);
};

Meteor.SmartOplogConnection = OplogConnection;
Meteor.SmartMongoConnection = MongoConnection;