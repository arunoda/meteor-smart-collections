Package.describe({
  "summery": "Smart Mongo Collection Implementation"
});

Npm.depends({
  'mongodb': '1.3.17'
});

Package.on_use(function(api) {
  api.use(['minimongo', 'livedata'], ['client', 'server']);
  api.add_files([
    'lib/deep_equal.js',
    'lib/validator.js',
    'lib/mongo.js',
    'lib/server_collection.js',
    'lib/invalidator.js',
    'lib/op_queue.js',
    'lib/cursor.js',
    'lib/server_methods.js',
    'lib/oplog.js'
  ], 'server');

  api.use(['random'], 'client');
  api.add_files([
    'lib/client_collection.js'
  ], 'client');
});
