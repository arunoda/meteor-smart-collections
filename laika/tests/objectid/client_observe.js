var assert = require('assert');

suite('ObjectId - Client Observe', function() {
  test('insert', function(done, server, client) {
    client.eval(function() {
      coll = new Meteor.SmartCollection('coll');
      coll.find({}).observeChanges({
        added: function(id, doc) {
          doc._id = id;
          emit('added', doc);
        }
      })
    });

    server.evalSync(function() {
      Meteor.default_server.autopublish();
      coll = new Meteor.SmartCollection('coll');
      coll.insert({
        _id: new Meteor.Collection.ObjectID(),
        aa: 20
      });
      emit('return');
    });

    client.on('added', function(doc) {
      assert.equal(doc.aa, 20);
      done();
    });
  });

  test('update', function(done, server, client) {
    client.evalSync(function() {
      coll = new Meteor.SmartCollection('coll');
      coll.find({}).observeChanges({
        changed: function(id, doc) {
          doc._id = id;
          emit('changed', doc);
        }
      })
      emit('return');
    });

    server.evalSync(function() {
      Meteor.default_server.autopublish();
      coll = new Meteor.SmartCollection('coll');
      id = coll.insert({
        _id: new Meteor.Collection.ObjectID(),
        aa: 20
      });
      coll.update(id, {$set: {aa: 40}});
      emit('return');
    });

    client.on('changed', function(doc) {
      assert.equal(doc.aa, 40);
      done();
    });
  });

  test('remove', function(done, server, client) {
    client.evalSync(function() {
      coll = new Meteor.SmartCollection('coll');
      coll.find({}).observeChanges({
        removed: function(id) {
          emit('removed', id);
        }
      })
      emit('return');
    });

    server.evalSync(function() {
      Meteor.default_server.autopublish();
      coll = new Meteor.SmartCollection('coll');
      id = coll.insert({
        _id: new Meteor.Collection.ObjectID(),
        aa: 20
      });
      coll.remove(id);
      emit('return');
    });

    client.on('removed', function(id) {
      assert.ok(id);
      done();
    });
  });

  test('multiRemove', function(done, server, client) {
    client.evalSync(function() {
      coll = new Meteor.SmartCollection('coll');
      coll.find({}).observeChanges({
        added: function() {
          console.log('added', arguments);
        },
        removed: function(id) {
          console.log('removed', arguments);
          emit('removed', id);
        }
      })
      emit('return');
    });

    server.evalSync(function() {
      Meteor.default_server.autopublish();
      coll = new Meteor.SmartCollection('coll');
      id = coll.insert({
        _id: new Meteor.Collection.ObjectID(),
        aa: 20
      });
      setTimeout(function() {
        coll.remove({});
        emit('return');
      }, 50);
    });

    client.on('removed', function(id) {
      assert.ok(id);
      done();
    });
  });
});