Package.describe({
  "summery": "Smart Mongo Collection Implementation"
});

Npm.depends({
  'mongodb': '1.3.23',
  'debug': '0.7.2'
});

Package.on_use(function(api) {
  api.use(['minimongo', 'livedata', 'mongo-livedata', 'ejson', 'underscore'], ['client', 'server']);
  api.add_files([
    'lib/validator.js',
    'lib/connection.js',
    'lib/main.js',
    'lib/server_collection.js',
    'lib/invalidator.js',
    'lib/op_queue.js',
    'lib/cursor.js',
    'lib/server_methods.js',
    'lib/oplog.js',
    'lib/query.js',
    'lib/observer.js',
    'lib/projector.js'
  ], 'server');
  
  api.add_files([
    'lib/client_collection.js'
  ], 'client');
});
