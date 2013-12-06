var assert = require('assert');

suite('No Writes', function() {
  //some times if there is a write op, nothing has been written, handle them
  test('correct update usind id string', function(done, server, client) {
    server.evalSync(function() {
      Meteor.Collection.insecure = true;
      Meteor.SmartMongo.oplog = true;
      coll = new Meteor.SmartCollection('coll');
      emit('return');
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

    assert.deepEqual(results, []);
    done();
  });

  test('correct update usind id string', function(done, server, client) {
    server.evalSync(function() {
      Meteor.Collection.insecure = true;
      Meteor.SmartMongo.oplog = true;
      coll = new Meteor.SmartCollection('coll');
      emit('return');
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
});