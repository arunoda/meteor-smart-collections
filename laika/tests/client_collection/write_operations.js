var assert = require('assert');

suite('Client Collection - Write Operations', function() {
  suite('insert', function() {
    test('correct insert', function(done, server, client) {
      server.evalSync(function() {
        Meteor.Collection.insecure = true;
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
        Meteor.Collection.insecure = true;
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
        Meteor.Collection.insecure = true;
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

  suite('update', function() {
    test('correct update usind id string', function(done, server, client) {
      server.evalSync(function() {
        Meteor.Collection.insecure = true;
        coll = new Meteor.SmartCollection('coll');
        coll.insert({_id: 'abc', aa: 20}, function() {
          emit('return');
        })
      });

      var err = client.evalSync(function() {
        coll = new Meteor.SmartCollection('coll');
        coll.update('abc', {$inc: {aa: 10}}, function(err) {
          emit('return', err);
        });
      });
      assert.equal(err, null);

      var results = server.evalSync(function() {
        coll.find({}).fetch(function(err, results) {
          emit('return', results);
        });
      });

      assert.deepEqual(results, [{_id: 'abc', aa: 30}]);
      done();
    });

    test('correct update using id object', function(done, server, client) {
      server.evalSync(function() {
        Meteor.Collection.insecure = true;
        coll = new Meteor.SmartCollection('coll');
        coll.insert({_id: 'abc', aa: 20}, function() {
          emit('return');
        })
      });

      var err = client.evalSync(function() {
        coll = new Meteor.SmartCollection('coll');
        coll.update({_id: 'abc'}, {$inc: {aa: 10}}, function(err) {
          emit('return', err);
        });
      });
      assert.equal(err, null);

      var results = server.evalSync(function() {
        coll.find({}).fetch(function(err, results) {
          emit('return', results);
        });
      });

      assert.deepEqual(results, [{_id: 'abc', aa: 30}]);
      done();
    });

    test('update with a selector', function(done, server, client) {
      server.evalSync(function() {
        Meteor.Collection.insecure = true;
        coll = new Meteor.SmartCollection('coll');
        coll.insert({_id: 'abc', aa: 20}, function() {
          emit('return');
        })
      });

      var err = client.evalSync(function() {
        coll = new Meteor.SmartCollection('coll');
        try{
          coll.update({aa: 10}, {$inc: {aa: 10}});
        } catch(err) {
          emit('return', err);
        }
      });

      assert.equal(err.error, 403);
      done();
    });

    test('update with a selector - direct Method call', function(done, server, client) {
      server.evalSync(function() {
        Meteor.Collection.insecure = true;
        coll = new Meteor.SmartCollection('coll');
        coll.insert({_id: 'abc', aa: 20}, function() {
          emit('return');
        })
      });

      var err = client.evalSync(function() {
        Meteor.call('_su_', 'coll', {aa: 10}, {$inc: {aa: 20}}, function(err) {
          emit('return', err);
        });
      });

      assert.equal(err.error, 403);
      done();
    });
  });

  suite('remove', function() {
    test('correct remove usind id string', function(done, server, client) {
      server.evalSync(function() {
        coll = new Meteor.SmartCollection('coll');
        coll.insert({_id: 'abc', aa: 20}, function() {
          emit('return');
        })
      });

      var err = client.evalSync(function() {
        coll = new Meteor.SmartCollection('coll');
        coll.remove('abc', function(err) {
          emit('return', err);
        });
      });
      assert.equal(err, null);

      var results = server.evalSync(function() {
        coll.find({}).fetch(function(err, results) {
          emit('return', results);
        });
      });

      assert.deepEqual(results, []);
      done();
    });

    test('correct remove using id object', function(done, server, client) {
      server.evalSync(function() {
        coll = new Meteor.SmartCollection('coll');
        coll.insert({_id: 'abc', aa: 20}, function() {
          emit('return');
        })
      });

      var err = client.evalSync(function() {
        coll = new Meteor.SmartCollection('coll');
        coll.remove({_id: 'abc'}, function(err) {
          emit('return', err);
        });
      });
      assert.equal(err, null);

      var results = server.evalSync(function() {
        coll.find({}).fetch(function(err, results) {
          emit('return', results);
        });
      });

      assert.deepEqual(results, []);
      done();
    });

    test('remove with a selector', function(done, server, client) {
      server.evalSync(function() {
        coll = new Meteor.SmartCollection('coll');
        coll.insert({_id: 'abc', aa: 20}, function() {
          emit('return');
        })
      });

      var err = client.evalSync(function() {
        coll = new Meteor.SmartCollection('coll');
        try{
          coll.remove({aa: 10});
        } catch(err) {
          emit('return', err);
        }
      });

      assert.equal(err.error, 403);
      done();
    });

    test('remove with a selector - direct Method call', function(done, server, client) {
      server.evalSync(function() {
        coll = new Meteor.SmartCollection('coll');
        coll.insert({_id: 'abc', aa: 20}, function() {
          emit('return');
        })
      });

      var err = client.evalSync(function() {
        Meteor.call('_sr_', 'coll', {aa: 10}, function(err) {
          emit('return', err);
        });
      });

      assert.equal(err.error, 403);
      done();
    });
  });
});