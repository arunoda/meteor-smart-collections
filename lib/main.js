var EventEmitter = Npm.require('events').EventEmitter;
var MongoClient = Npm.require('mongodb').MongoClient;

Meteor.SmartMongo = new EventEmitter();
Meteor.SmartMongo.setMaxListeners(0);

var oplogOptions;
var latestTs;
var justAfterError = false;

var ready = 1;
if(process.env.OPLOG_URL) {
  Meteor.SmartMongo.oplog = true;
  ready = 2;

  var options = getMongoOptions(process.env.OPLOG_URL);
  var dbName = getMongoDbName();
  
  Meteor.SmartMongo.oplogConnection = new Meteor.SmartOplogConnection(dbName, process.env.OPLOG_URL, options);
  Meteor.SmartMongo.oplogConnection.connect(afterOpLogConnected);
}

var options = getMongoOptions(process.env.MONGO_URL);
Meteor.SmartMongo.connection = new Meteor.SmartMongoConnection(process.env.MONGO_URL, options);
Meteor.SmartMongo.connection.connect(afterDbConnected);

function afterDbConnected(err) {
  if(err) throw err;
  if(--ready == 0) {
    Meteor.SmartMongo.ready = true;
    Meteor.SmartMongo.emit('ready');
  }
}

function afterOpLogConnected(err) {
  if(err) throw err;

  Meteor.SmartMongo.oplogConnection.on('op', Meteor.SmartOplog.processor);
  console.info("**SmartCollection charged with MongoDB Oplog**");
  
  if(--ready == 0) { 
    Meteor.SmartMongo.emit('ready');
    Meteor.SmartMongo.ready = true;
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