Package.describe({
  "summery": "Smart Mongo Collection Implementation"
});

Npm.depends({'mongodb': '1.3.11'});

Package.on_use(function(api) {
  api.add_files([
    'lib/mongo.js',
    'lib/collection.js',
    'lib/invalidator.js',
    'lib/cursor.js'
  ], 'server')
});