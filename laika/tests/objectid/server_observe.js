var assert = require('assert');

suite('ObjectId - Server Observe', function() {
  test('insert', function(done, server, client) {
    var doc = server.evalSync(function() {
      coll = new Meteor.SmartCollection('coll');
      coll.find({aa: 20}).observeChanges({
        added: function(id, doc) {
          doc._id = id;
          emit('return', doc);
        }
      });

      coll.insert({
        _id: new Meteor.SmartCollection.ObjectID(),
        aa: 20
      });
    });

    assert.equal(doc.aa, 20);
    done();
  });

  test('update', function(done, server, client) {
    var doc = server.evalSync(function() {
      coll = new Meteor.SmartCollection('coll');
      coll.find({aa: 20}).observeChanges({
        changed: function(id, doc) {
          doc._id = id;
          emit('return', doc);
        }
      });

      var id = coll.insert({
        _id: new Meteor.SmartCollection.ObjectID(),
        aa: 20
      });

      coll.update(id, {$set: {bb: 50}});
    });

    assert.equal(doc.bb, 50);
    done();
  });

  test('remove', function(done, server, client) {
    var id = server.evalSync(function() {
      coll = new Meteor.SmartCollection('coll');
      coll.find({aa: 20}).observeChanges({
        removed: function(id) {
          emit('return', id);
        }
      });

      var id = coll.insert({
        _id: new Meteor.SmartCollection.ObjectID(),
        aa: 20
      });

      coll.remove(id);
    });

    assert.ok(id);
    done();
  });

  test('multiUpdate', function(done, server, client) {
    var doc = server.evalSync(function() {
      coll = new Meteor.SmartCollection('coll');
      coll.find().observeChanges({
        changed: function(id, fields) {
          fields._id = id;
          emit('return', fields);
        }
      });

      var id = coll.insert({
        _id: new Meteor.SmartCollection.ObjectID(),
        aa: 20
      });

      coll.update({aa: 20}, {$set: {bb: 50}});
    });

    assert.equal(doc.bb, 50);
    done();
  });

  test('multiRemove', function(done, server, client) {
    var id = server.evalSync(function() {
      coll = new Meteor.SmartCollection('coll');
      coll.find({aa: 20}).observeChanges({
        removed: function(id) {
          emit('return', id);
        }
      });

      var id = coll.insert({
        _id: new Meteor.SmartCollection.ObjectID(),
        aa: 20
      });

      coll.remove({aa: 20});
    });

    assert.ok(id);
    done();
  });
});