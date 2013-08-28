var assert = require('assert');

suite('Client Collection - Simulations', function() {
  test('insert simulations', function(done, server, client) {
    server.evalSync(function() {
      coll = new Meteor.SmartCollection('aa');
      Meteor.publish('coll', function() {
        return coll.find();
      });

      Meteor.methods({
        'hello': function() {
          coll.insert({name: 'hello'});
          return 'server';
        }
      });
      emit('return');
    });

    client.evalSync(function() {
      coll = new Meteor.SmartCollection('aa');
      Meteor.methods({
        'hello': function() {
          coll.insert({name : 'hello'});
          return 'client';
        }
      });

      coll.find().observeChanges({
        added: function(id) {
          emit('added', id);
        },
        removed: function(id) {
          emit('removed', id);
        }
      });
      emit('return');
    });

    var added = [];
    var removed = [];
    client.on('added', function(id) {
      added.push(id);
    });

    client.on('removed', function(id) {
      removed.push(id);
    });

    var rtn = client.evalSync(function() {
      Meteor.subscribe('coll', function() {
        Meteor.call('hello', function(err, rtn) {
          emit('return', rtn);
        });
      });
    });

    assert.equal(rtn, 'server');
    assert.ok(added[0] == removed[0]);
    assert.equal(added.length, 2);
    done();
  });

  test('update simulations', function(done, server, client) {
    server.evalSync(function() {
      coll = new Meteor.SmartCollection('aa');
      coll.insert({_id: 'aa', aa: 10});
      Meteor.publish('coll', function() {
        return coll.find();
      });

      Meteor.methods({
        'hello': function() {
          coll.update({_id: 'aa'}, {$inc: {aa: 1}});
          return 'server';
        }
      });
      emit('return');
    });
    
    client.evalSync(function() {
      coll = new Meteor.SmartCollection('aa');
      Meteor.methods({
        'hello': function() {
          coll.update({_id: 'aa'}, {$inc: {aa: 1}});
          return 'client';
        }
      });

      coll.find().observeChanges({
        added: function(id, doc) {
          emit('added', id, doc);
        },
        removed: function(id) {
          emit('removed', id);
        },
        changed: function(id, fields) {
          emit('changed', id, fields);
        }
      });
      emit('return');
    });

    var received = [];
    client.on('added', function(id, doc) {
      received.push(['added', doc]);
    });

    client.on('changed', function(id, doc) {
      received.push(['changed', doc]);
    });

    client.on('removed', function(id) {
      assert.fail('cannot emit removed!');
    });

    var rtn = client.evalSync(function() {
      Meteor.subscribe('coll', function() {
        Meteor.call('hello', function(err, rtn) {
          emit('return', rtn);
        });
      });
    });

    assert.equal(rtn, 'server');
    setTimeout(function() {
      assert.deepEqual(received, [
        ['added', {aa: 10}],
        ['changed', {aa: 11}],
        ['changed', {aa: 10}],
        ['changed', {aa: 11}]
      ]);
      done();
    }, 30);
  });

  test('remove simulations', function(done, server, client) {
    server.evalSync(function() {
      coll = new Meteor.SmartCollection('aa');
      coll.insert({_id: 'aa', aa: 10});
      Meteor.publish('coll', function() {
        return coll.find();
      });

      Meteor.methods({
        'hello': function() {
          coll.remove({_id: 'aa'});
          return 'server';
        }
      });
      emit('return');
    });
    
    client.evalSync(function() {
      coll = new Meteor.SmartCollection('aa');
      Meteor.methods({
        'hello': function() {
          coll.remove({_id: 'aa'});
          return 'client';
        }
      });

      coll.find().observeChanges({
        added: function(id, doc) {
          emit('added', id, doc);
        },
        removed: function(id) {
          emit('removed', id);
        },
        changed: function(id, fields) {
          emit('changed', id, fields);
        }
      });
      emit('return');
    });

    var received = [];
    client.on('added', function(id, doc) {
      received.push(['added', doc]);
    });

    client.on('changed', function(id, doc) {
      assert.fail('cannot received changed');
    });

    client.on('removed', function(id) {
      received.push(['removed', id]);
    });

    var rtn = client.evalSync(function() {
      Meteor.subscribe('coll', function() {
        Meteor.call('hello', function(err, rtn) {
          emit('return', rtn);
        });
      });
    });

    assert.equal(rtn, 'server');
    setTimeout(function() {
      assert.deepEqual(received, [
        ['added', {aa: 10}],
        ['removed', 'aa']
      ]);
      done();
    }, 30);
  });
});