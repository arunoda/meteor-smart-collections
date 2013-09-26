var assert = require('assert');

suite('Projection - Coverage', function() {
  suite('supported', function() {
    test('top level fields', function(done, server) {
      server.evalSync(function() {
        var projection = {'aa': 1, 'bb': 1};
        var coll = new Meteor.SmartCollection('coll');
        coll.find({}, {fields: projection});
        emit('return');
      });
      done();
    });
  });

  suite('unsupported', function() {
    test('nested fields', function(done, server) {
      server.evalSyncExpectError(function() {
        var projection = {'aa.a': 1};
        var coll = new Meteor.SmartCollection('coll');
        coll.find({}, {fields: projection});
      });
      done();
    });

    test('$ operator', function(done, server) {
      server.evalSyncExpectError(function() {
        var projection = {'array.$': 1};
        var coll = new Meteor.SmartCollection('coll');
        coll.find({}, {fields: projection});
      });
      done();
    });

    test('$elemMatch operator', function(done, server) {
      server.evalSyncExpectError(function() {
        var projection = {'field': {$elemMatch: {aa: 10}}};
        var coll = new Meteor.SmartCollection('coll');
        coll.find({}, {fields: projection});
      });
      done();
    });

    test('$slice operator', function(done, server) {
      server.evalSyncExpectError(function() {
        var projection = {'field': {$slice: -5}};
        var coll = new Meteor.SmartCollection('coll');
        coll.find({}, {fields: projection});
      });
      done();
    });

  });
});