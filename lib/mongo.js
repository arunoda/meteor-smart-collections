var EventEmitter = Npm.require('events').EventEmitter;
var MongoClient = Npm.require('mongodb').MongoClient;

Meteor.SmartMongo = new EventEmitter();
Meteor.SmartMongo.setMaxListeners(0);

var ready = 1;
if(process.env.OPLOG_URL) {
  Meteor.SmartMongo.oplog = true;
  ready = 2;
  MongoClient.connect(process.env.OPLOG_URL, afterOpLogConnected);
}

MongoClient.connect(process.env.MONGO_URL, afterDbConnected);

function afterDbConnected(err, db) {
  if(err) throw err;
  Meteor.SmartMongo.db = db;
  if(--ready == 0) Meteor.SmartMongo.emit('ready');
}

function afterOpLogConnected(err, db) {
  if(err) throw err;
  
  var query = {
    ns: new RegExp(getMongoDbName() + '.*'),
    op: {$in: ['i', 'u', 'r']}
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
      }).each(Meteor.SmartOplog.processor);
      if(--ready == 0) Meteor.SmartMongo.emit('ready');
    }
  });
}

function getMongoDbName() {
  return process.env.MONGO_URL.match(/mongodb:\/\/.*\/([^?.]+)/)[1];
}