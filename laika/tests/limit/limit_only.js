var assert = require('assert');

suite('Cursor Limit', function() {
  test('subscribing', function(done, server, client) {
    server.evalSync(function() {
      coll = new Meteor.SmartCollection('coll');
      Meteor.publish('coll', function() {
        return coll.find({}, {limit: 3});
      });

      coll.insert({aa: 1});
      coll.insert({aa: 2});
      coll.insert({aa: 3});
      coll.insert({aa: 4});

      emit('return');
    });

    var count = client.evalSync(function() {
      coll = new Meteor.SmartCollection('coll');
      Meteor.subscribe('coll', function() {
        emit('return', coll.find().fetch().length);
      });
    });

    assert.equal(count, 3);
    done();
  });

  test('subscribing and adding after that', function(done, server, client) {
    server.evalSync(function() {
      coll = new Meteor.SmartCollection('coll');
      Meteor.publish('coll', function() {
        return coll.find({}, {limit: 3});
      });

      coll.insert({aa: 1});
      coll.insert({aa: 2});
      coll.insert({aa: 3});

      emit('return');
    });

    var count = client.evalSync(function() {
      coll = new Meteor.SmartCollection('coll');
      Meteor.subscribe('coll', function() {
        emit('return');
        coll.find({}, {sort: {aa: 1}}).observe({
          added: function(doc) {
            emit('added', doc);
          }
        })
      });
    });

    var added = [];
    client.on('added', function(doc) {
      added.push(doc.aa);
    });

    server.evalSync(function() {
      coll.insert({aa: 5});
      emit('return');
    });

    setTimeout(function() {
      assert.deepEqual(added, [1, 2,3]);
      done();
    }, 100);
  });

  test('remove from cursor', function(done, server, client) {
    server.evalSync(function() {
      coll = new Meteor.SmartCollection('coll');
      Meteor.publish('coll', function() {
        return coll.find({}, {limit: 3});
      });

      coll.insert({aa: 1});
      coll.insert({aa: 2});
      coll.insert({aa: 3});
      coll.insert({aa: 4});

      emit('return');
    });

    var count = client.evalSync(function() {
      coll = new Meteor.SmartCollection('coll');
      Meteor.subscribe('coll', function() {
        emit('return');
        coll.find({}, {sort: {aa: 1}}).observe({
          added: function(doc) {
            emit('added', doc);
          },
          removed: function(doc) {
            emit('removed', doc);
          },
          changed: function(doc) {
            emit('changed', doc);
          }
        })
      });
    });

    var added = [];
    var removed = [];
    var changed = [];
    client.on('added', function(doc) {
      added.push(doc.aa);
    });

    client.on('removed', function(doc) {
      removed.push(doc.aa);
    });

    client.on('changed', function(doc) {
      changed.push(doc.aa);
    });

    server.evalSync(function() {
      coll.remove({aa: 1});
      emit('return');
    });

    setTimeout(function() {
      assert.deepEqual(removed, [1]);
      assert.deepEqual(added, [1, 2, 3, 4]);
      assert.deepEqual(changed, []);
      done();
    }, 100);
  });

  test('subscribe, removed twice', function(done, server, client) {
    server.evalSync(function() {
      coll = new Meteor.SmartCollection('coll');
      Meteor.publish('coll', function() {
        return coll.find({}, {limit: 3});
      });

      coll.insert({aa: 1});
      coll.insert({aa: 2});
      coll.insert({aa: 3});
      coll.insert({aa: 4});

      emit('return');
    });

    var count = client.evalSync(function() {
      coll = new Meteor.SmartCollection('coll');
      Meteor.subscribe('coll', function() {
        emit('return');
        coll.find({}, {sort: {aa: 1}}).observe({
          added: function(doc) {
            emit('added', doc);
          },
          removed: function(doc) {
            emit('removed', doc);
          },
          changed: function(doc) {
            emit('changed', doc);
          }
        })
      });
    });

    var added = [];
    var removed = [];
    var changed = [];
    client.on('added', function(doc) {
      added.push(doc.aa);
    });

    client.on('removed', function(doc) {
      removed.push(doc.aa);
    });

    client.on('changed', function(doc) {
      changed.push(doc.aa);
    });

    server.evalSync(function() {
      coll.remove({aa: 1});
      coll.remove({aa: 2});
      emit('return');
    });

    setTimeout(function() {
      assert.deepEqual(removed, [1, 2]);
      assert.deepEqual(added, [1, 2, 3, 4]);
      assert.deepEqual(changed, []);
      done();
    }, 100);
  });

  test('subscribe, removed twice and added', function(done, server, client) {
    server.evalSync(function() {
      coll = new Meteor.SmartCollection('coll');
      Meteor.publish('coll', function() {
        return coll.find({}, {limit: 3});
      });

      coll.insert({aa: 1});
      coll.insert({aa: 2});
      coll.insert({aa: 3});
      coll.insert({aa: 4});

      emit('return');
    });

    var count = client.evalSync(function() {
      coll = new Meteor.SmartCollection('coll');
      Meteor.subscribe('coll', function() {
        emit('return');
        coll.find({}, {sort: {aa: 1}}).observe({
          added: function(doc) {
            emit('added', doc);
          },
          removed: function(doc) {
            emit('removed', doc);
          },
          changed: function(doc) {
            emit('changed', doc);
          }
        })
      });
    });

    var added = [];
    var removed = [];
    var changed = [];
    client.on('added', function(doc) {
      added.push(doc.aa);
    });

    client.on('removed', function(doc) {
      removed.push(doc.aa);
    });

    client.on('changed', function(doc) {
      changed.push(doc.aa);
    });

    server.evalSync(function() {
      coll.remove({aa: 1});
      coll.remove({aa: 2});
      coll.insert({aa: 5});
      emit('return');
    });

    setTimeout(function() {
      assert.deepEqual(removed, [1, 2]);
      assert.deepEqual(added, [1, 2, 3, 4, 5]);
      assert.deepEqual(changed, []);
      done();
    }, 100);
  });

  test('subscribe, removed twice and added later', function(done, server, client) {
    server.evalSync(function() {
      coll = new Meteor.SmartCollection('coll');
      Meteor.publish('coll', function() {
        return coll.find({}, {limit: 3});
      });

      coll.insert({aa: 1});
      coll.insert({aa: 2});
      coll.insert({aa: 3});
      coll.insert({aa: 4});

      emit('return');
    });

    var count = client.evalSync(function() {
      coll = new Meteor.SmartCollection('coll');
      Meteor.subscribe('coll', function() {
        emit('return');
        coll.find({}, {sort: {aa: 1}}).observe({
          added: function(doc) {
            emit('added', doc);
          },
          removed: function(doc) {
            emit('removed', doc);
          },
          changed: function(doc) {
            emit('changed', doc);
          }
        })
      });
    });

    var added = [];
    var removed = [];
    var changed = [];
    client.on('added', function(doc) {
      added.push(doc.aa);
    });

    client.on('removed', function(doc) {
      removed.push(doc.aa);
    });

    client.on('changed', function(doc) {
      changed.push(doc.aa);
    });

    server.evalSync(function() {
      coll.remove({aa: 1});
      coll.remove({aa: 2});
      setTimeout(function() {
        coll.insert({aa: 5});
      }, 50);
      emit('return');
    });

    setTimeout(function() {
      assert.deepEqual(removed, [1, 2]);
      assert.deepEqual(added, [1, 2, 3, 4, 5]);
      assert.deepEqual(changed, []);
      done();
    }, 150);
  });
});