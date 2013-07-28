var assert = require('assert');

suite('ObjectId - Write on Server', function() {
  test('insert', function(done, server) {
    var doc = server.evalSync(function() {
      var coll = new Meteor.SmartCollection('coll');
      var id = coll.insert({
        _id: new Meteor.SmartCollection.ObjectID(),
        aa: 10
      });
      var doc = coll.findOne(id);
      emit('return', doc);
    });

    assert.equal(doc.aa, 10);
    done();
  });

  test('update', function(done, server) {
    var doc = server.evalSync(function() {
      var coll = new Meteor.SmartCollection('coll');
      var id = coll.insert({
        _id: new Meteor.SmartCollection.ObjectID(),
        aa: 10
      });
      coll.update(id, {$set: {aa: 40}});
      var doc = coll.findOne(id);
      emit('return', doc);
    });

    assert.equal(doc.aa, 40);
    done();
  });

  test('remove', function(done, server) {
    var doc = server.evalSync(function() {
      var coll = new Meteor.SmartCollection('coll');
      var id = coll.insert({
        _id: new Meteor.SmartCollection.ObjectID(),
        aa: 10
      });
      coll.remove(id);
      var doc = coll.findOne(id);
      emit('return', doc);
    });

    assert.equal(doc, null);
    done();
  });
});