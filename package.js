Package.describe({
  "summery": "Smart Mongo Collection Implementation"
});

Npm.depends({
  'mongodb': '1.3.11'
});

Package.on_use(function(api) {
  api.add_files([
    'lib/deep_equal.js',
    'lib/validator.js',
    'lib/version_manager.js',
    'lib/mongo.js',
    'lib/server_collection.js',
    'lib/invalidator.js',
    'lib/cursor.js',
    'lib/server_methods.js'
  ], 'server');

  api.add_files([
    'lib/client_collection.js'
  ], 'client');
});

