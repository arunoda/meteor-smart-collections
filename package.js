Package.describe({
  "summery": "Smart Mongo Collection Implementation"
});

Npm.depends({'mongodb': '1.3.11'});

Package.on_use(function(api) {
  api.add_files([
    'lib/smart_mongo.js',
    '/lib/smart_collection.js',
  ], 'server')
});