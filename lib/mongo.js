var EventEmitter = Npm.require('events').EventEmitter;
var MongoClient = Npm.require('mongodb').MongoClient;

Meteor.SmartMongo = new EventEmitter();
Meteor.SmartMongo.setMaxListeners(0);

var oplogOptions;

var ready = 1;
if(process.env.OPLOG_URL) {
  Meteor.SmartMongo.oplog = true;
  ready = 2;

  var options = getMongoOptions(process.env.OPLOG_URL);
  MongoClient.connect(process.env.OPLOG_URL, options, afterOpLogConnected);
}

var options = getMongoOptions(process.env.MONGO_URL);
MongoClient.connect(process.env.MONGO_URL, options, afterDbConnected);

function afterDbConnected(err, db) {
  if(err) throw err;
  Meteor.SmartMongo.db = db;
  if(--ready == 0) Meteor.SmartMongo.emit('ready');
}

function afterOpLogConnected(err, db) {
  if(err) throw err;
  console.info('** Smart Collections charged with MongoDB Oplog **');
  var query = {
    ns: new RegExp(getMongoDbName() + '.*'),
    $or: [
      {op: {$in: ['i', 'u', 'd']}},
      {op: 'c', 'o.drop': {$exists: true}}
    ]
  };

  var coll = db.collection('oplog.rs');
  var cursor = coll.find(query, {
    sort: {$natural: -1},
    limit: 1
  });

  var latestTs;
  cursor.each(function(err, doc) {
    if(err) throw err;
    if(doc) {
      latestTs = doc.ts;
    } else {
      if(latestTs) {
        query['ts'] = {$gt: latestTs};
      }
      coll.find(query, {
        tailable: true,
        awaitdata: true,
        numberOfRetries: -1
      }).each(onOpDoc);
      if(--ready == 0) Meteor.SmartMongo.emit('ready');
    }
  });
  
  function onOpDoc(err, result) {
    if(err) {
      //once reconnected, again listen to the data
      afterOpLogConnected(null, db);
    } else {
      Meteor.SmartOplog.processor(err, result);
    }
  }
}

function getMongoDbName() {
  return process.env.MONGO_URL.match(/mongodb:\/\/.*\/([^?.]+)/)[1];
}

function getMongoOptions(url) {
  //same logic meteor uses in Meteor.Collection
  var options = {db: {safe: true}};
  if (!(/[\?&]auto_?[rR]econnect=/.test(url))) {
    options.server = {auto_reconnect: true};
  }
  return options;
}