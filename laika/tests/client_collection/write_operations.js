var assert = require('assert');

suite('Client Collection - Write Operations', function() {
  suite('insert', function() {
    test('correct insert', function(done, server, client) {
      server.evalSync(function() {
        coll = new Meteor.SmartCollection('coll');
        emit('return');
      });

      var err = client.evalSync(function() {
        coll = new Meteor.SmartCollection('coll');
        coll.insert({_id: 'abc', aa: 20}, function(err) {
          emit('return', err);
        });
      });
      assert.equal(err, null);

      var results = server.evalSync(function() {
        coll.find({}).fetch(function(err, results) {
          emit('return', results);
        });
      });

      assert.deepEqual(results, [{_id: 'abc', aa: 20}]);
      done();
    });

    test('collection not exists', function(done, server, client) {
      var err = client.evalSync(function() {
        coll = new Meteor.SmartCollection('coll');
        coll.insert({_id: 'abc', aa: 20}, function(err) {
          emit('return', err);
        });
      });
      
      assert.equal(err.error, 404);
      done();
    });

    test('insert error', function(done, server, client) {
      server.evalSync(function() {
        coll = new Meteor.SmartCollection('coll');
        emit('return');
      });

      var err = client.evalSync(function() {
        coll = new Meteor.SmartCollection('coll');
        coll.insert({_id: 'abc', aa: 20}, function(err) {
          emit('return', err);
        });
      });
      assert.equal(err, null);

       var err2 = client.evalSync(function() {
        coll.insert({_id: 'abc', aa: 20}, function(err) {
          emit('return', err);
        });
      });

      assert.equal(err2.error, 500);
      done();
    });
  });
});