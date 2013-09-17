var assert = require('assert');
require('../common.js');

suite('Latency - Success', function() {
  test('insert', function(done, server, client) {
    server.evalSync(doAutoPublish);
    server.evalSync(function() {
      coll = new Meteor.SmartCollection('coll');
      coll.allow({
        insert: function() {return true}
      })
      emit('return');
    });

    var received = [];
    client.on('added', function(doc) {
      received.push(['a', doc])
    });

    client.on('removed', function(doc) {
      received.push(['r', doc]);
    });

    var err = client.evalSync(function() {
      coll = new Meteor.SmartCollection('coll');
      coll.find().observe({ 
        added: function(doc) {
          emit('added', doc);
        },
        removed: function(doc) {
          emit('removed', doc);
        }
      });

      coll.insert({_id: 'aa', aa: 10}, function(err) {
        emit('return', err);
      });
    });

    assert.equal(err, null);

    setTimeout(function() {
      assert.deepEqual(received, [['a', {_id: 'aa', aa: 10}]]);
      done();
    }, 300);
  });

  test('update', function(done, server, client) {
    server.evalSync(doAutoPublish);
    server.evalSync(function() {
      coll = new Meteor.SmartCollection('coll');
      coll.insert({_id: 'aa', aa: 10});

      coll.allow({
        update: function() {return true}
      })
      emit('return');
    });

    var received = [];
    client.on('added', function(doc) {
      received.push(['a', doc])
    });

    client.on('removed', function(doc) {
      received.push(['r', doc]);
    });

    client.on('changed', function(doc) {
      received.push(['c', doc]);
    });

    var err = client.evalSync(function() {
      coll = new Meteor.SmartCollection('coll');
      coll.find().observe({ 
        added: function(doc) {
          emit('added', doc);
        },
        removed: function(doc) {
          emit('removed', doc);
        },
        changed: function(doc) {
          emit('changed', doc);
        }
      });

      coll.update({_id: 'aa'}, {$set: {aa: 40}}, function(err) {
        emit('return', err);
      });
    });

    assert.equal(err, null);

    setTimeout(function() {
      assert.deepEqual(received, [
        ['a', {_id: 'aa', aa: 10}],
        ['c', {_id: 'aa', aa: 40}]
      ]);
      done();
    }, 300);
  });

  test('remove', function(done, server, client) {
    server.evalSync(doAutoPublish);
    server.evalSync(function() {
      coll = new Meteor.SmartCollection('coll');
      coll.insert({_id: 'aa', aa: 10});

      coll.allow({
        remove: function() {return true}
      })
      emit('return');
    });

    var received = [];
    client.on('added', function(doc) {
      received.push(['a', doc])
    });

    client.on('removed', function(doc) {
      received.push(['r', doc]);
    });

    client.on('changed', function(doc) {
      received.push(['c', doc]);
    });

    var err = client.evalSync(function() {
      coll = new Meteor.SmartCollection('coll');
      coll.find().observe({ 
        added: function(doc) {
          emit('added', doc);
        },
        removed: function(doc) {
          emit('removed', doc);
        },
        changed: function(doc) {
          emit('changed', doc);
        }
      });

      coll.remove({_id: 'aa'}, function(err) {
        emit('return', err);
      });
    });

    assert.equal(err, null);

    setTimeout(function() {
      assert.deepEqual(received, [
        ['a', {_id: 'aa', aa: 10}],
        ['r', {_id: 'aa', aa: 10}]
      ]);
      done();
    }, 300);
  });
});