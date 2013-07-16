var assert = require('assert');

suite('Client Collection - Find and Client Cursors', function() {
  test('send new docs', function(done, server, client) {
    server.evalSync(function() {
      coll = new Meteor.SmartCollection('coll');
      Meteor.publish('smart-data', function() {
        return coll.find();
      });
      emit('return');
    });

    client.evalSync(function() {
      coll = new Meteor.SmartCollection('coll');
      coll.find({}).observeChanges({
        added: function(id, doc) {
          emit('added', id, doc);
        }
      })
      Meteor.subscribe('smart-data');
      emit('return');
    });

    client.on('added', function(id, doc) {
      doc._id = id;
      assert.deepEqual(doc, {_id: 'pp', aa: 400});
      done();
    });

    server.evalSync(function() {
      coll.insert({_id: 'pp', aa: 400});
      emit('return');
    });
  });

  test('send changes', function(done, server, client) {
    server.evalSync(function() {
      coll = new Meteor.SmartCollection('coll');
      Meteor.publish('smart-data', function() {
        return coll.find();
      });
      emit('return');
    });

    client.evalSync(function() {
      coll = new Meteor.SmartCollection('coll');
      coll.find({}).observeChanges({
        added: function(id, doc) {
          emit('added', id, doc);
        },
        changed: function(id, fields) {
          emit('changed', id, fields)
        }
      })
      Meteor.subscribe('smart-data');
      emit('return');
    });

    var added = false;
    client.on('added', function(id, doc) {
      added = true;
    });

    client.on('changed', function(id, fields) {
      assert.equal(added, true);
      assert.equal(id, 'pp');
      assert.deepEqual(fields, {aa: 401, bb: 20});
      done();
    });

    server.evalSync(function() {
      coll.insert({_id: 'pp', aa: 400});
      emit('return');
    });

    server.evalSync(function() {
      coll.update({_id: 'pp'}, {
        $inc: {aa: 1},
        $set: {bb: 20}
      });
      emit('return');
    });
  });

  test('send removes', function(done, server, client) {
    server.evalSync(function() {
      coll = new Meteor.SmartCollection('coll');
      Meteor.publish('smart-data', function() {
        return coll.find();
      });
      emit('return');
    });

    client.evalSync(function() {
      coll = new Meteor.SmartCollection('coll');
      coll.find({}).observeChanges({
        added: function(id, doc) {
          emit('added', id, doc);
        },
        removed: function(id) {
          emit('removed', id)
        }
      })
      Meteor.subscribe('smart-data');
      emit('return');
    });

    var added = false;
    client.on('added', function(id, doc) {
      added = true;
    });

    client.on('removed', function(id) {
      assert.equal(added, true);
      assert.equal(id, 'pp');
      done();
    });

    server.evalSync(function() {
      coll.insert({_id: 'pp', aa: 400});
      emit('return');
    });

    server.evalSync(function() {
      coll.remove({_id: 'pp'});
      emit('return');
    });
  });
});