var assert = require('assert');
require('../common');

suite('Local Propegation', function() {
  test('insert - success', function(done, server, client) {
    server.evalSync(function() {
      coll = new Meteor.SmartCollection('coll');
      coll.allow({
        insert: function() { return true; }
      });
      emit('return');
    });

    var results = [];
    client.on('added', function(id, doc) {
      doc._id = id;
      results.push(doc);
    });

    client.on('removed', function() {
      assert.fail('cannot receive removed');
    });

    client.evalSync(function() {
      coll = new Meteor.SmartCollection('coll');
      coll.find().observeChanges({
        added: function(id, doc) {
          emit('added', id, doc);
        },
        removed: function(id) {
          emit('removed', id)
        }
      });
      coll.insert({_id: 'aa', aa: 10});
      emit('return');
    });

    setTimeout(function() {
      assert.deepEqual(results, [{_id: 'aa', aa: 10}]);
      done();
    }, 50);
  });

  test('insert - failed', function(done, server, client) {
    server.evalSync(function() {
      coll = new Meteor.SmartCollection('coll');
      coll.allow({
        insert: function() { return false; }
      });
      emit('return');
    });

    var results = [];
    client.on('added', function(id, doc) {
      doc._id = id;
      results.push(doc);
    });

    client.on('removed', function(id) {
      results.push(id);
    });

    client.evalSync(function() {
      coll = new Meteor.SmartCollection('coll');
      coll.find().observeChanges({
        added: function(id, doc) {
          emit('added', id, doc);
        },
        removed: function(id) {
          emit('removed', id)
        }
      });
      coll.insert({_id: 'aa', aa: 10});
      emit('return');
    });

    setTimeout(function() {
      assert.deepEqual(results, [{_id: 'aa', aa: 10}, 'aa']);
      done();
    }, 50);
  });

  test('update - success', function(done, server, client) {
    server.evalSync(doAutoPublish);
    server.evalSync(function() {
      coll = new Meteor.SmartCollection('coll');
      coll.insert({_id: 'aa', aa: 10, bb: 40});
      coll.allow({
        update: function() { return true; }
      });
      emit('return');
    });

    client.on('added', function(id, fields) {
      client.eval(function() {
        coll.update('aa', {$set: {aa: 30}}, function(err) {
          emit('updated', err);
        });
      });
    });

    var results = [];
    client.on('changed', function(id, fields) {
      fields._id = id;
      results.push(fields);
    });

    var err = client.evalSync(function() {
      coll = new Meteor.SmartCollection('coll');
      coll.find().observeChanges({
        changed: function(id, doc) {
          emit('changed', id, doc);
        },
        added: function(id, doc) {
          emit('added', id, doc)
        }
      });
      emit('return');
    });


    client.on('updated', function(err) {
      assert.equal(err, null);
      assert.deepEqual(results, [{_id: 'aa', aa: 30}]);
      done();
    });
  });

  test('update - failed', function(done, server, client) {
    server.evalSync(doAutoPublish);
    server.evalSync(function() {
      coll = new Meteor.SmartCollection('coll');
      coll.insert({_id: 'aa', aa: 10, bb: 40});
      coll.allow({
        update: function() { return false; }
      });
      emit('return');
    });

    client.on('added', function(id, fields) {
      client.eval(function() {
        coll.update('aa', {$set: {aa: 30}}, function(err) {
          emit('updated', err);
        });
      });
    });

    var results = [];
    client.on('changed', function(id, fields) {
      fields._id = id;
      results.push(fields);
    });

    var err = client.evalSync(function() {
      coll = new Meteor.SmartCollection('coll');
      coll.find().observeChanges({
        changed: function(id, doc) {
          emit('changed', id, doc);
        },
        added: function(id, doc) {
          emit('added', id, doc)
        }
      });
      emit('return');
    });


    client.on('updated', function(err) {
      assert.equal(err.error, 403);
      assert.deepEqual(results, [{_id: 'aa', aa: 30}, {_id: 'aa', aa: 10}]);
      done();
    });
  });

  test('remove - success', function(done, server, client) {
    server.evalSync(doAutoPublish);
    server.evalSync(function() {
      coll = new Meteor.SmartCollection('coll');
      coll.insert({_id: 'aa', aa: 10, bb: 40});
      coll.allow({
        remove: function() { return true; }
      });
      emit('return');
    });

    var results = [];
    client.on('added', function(id, doc) {
      doc._id = id;
      results.push(doc);
    });

    client.on('removed', function(id) {
      results.push(id);
    });

    var err = client.evalSync(function() {
      coll = new Meteor.SmartCollection('coll');
      coll.find().observeChanges({
        added: function(id, doc) {
          emit('added', id, doc);
        },
        removed: function(id) {
          emit('removed', id)
        }
      });
      emit('return');
    });

    setTimeout(function() {
      client.eval(function() {
        coll.remove('aa', function(err) {
          emit('removed-doc', err);
        });
      });
    }, 50);

    client.on('removed-doc', function(err) {
      assert.equal(err, null);
      assert.deepEqual(results, [{_id: 'aa', aa: 10, bb: 40}, 'aa']);
      done();
    });
  });

  test('remove - failed', function(done, server, client) {
    server.evalSync(doAutoPublish);
    server.evalSync(function() {
      coll = new Meteor.SmartCollection('coll');
      coll.insert({_id: 'aa', aa: 10, bb: 40});
      coll.allow({
        remove: function() { return false; }
      });
      emit('return');
    });

    var results = [];
    client.on('added', function(id, doc) {
      doc._id = id;
      results.push(doc);
    });

    client.on('removed', function(id) {
      results.push(id);
    });

    var err = client.evalSync(function() {
      coll = new Meteor.SmartCollection('coll');
      coll.find().observeChanges({
        added: function(id, doc) {
          emit('added', id, doc);
        },
        removed: function(id) {
          emit('removed', id)
        }
      });
      emit('return');
    });

    setTimeout(function() {
      client.eval(function() {
        coll.remove('aa', function(err) {
          emit('removed-doc', err);
        });
      });
    }, 50);

    client.on('removed-doc', function(err) {
      assert.equal(err.error, 403);
      assert.deepEqual(results, [{_id: 'aa', aa: 10, bb: 40}, 'aa', {_id: 'aa', aa: 10, bb: 40}]);
      done();
    });
  });
});