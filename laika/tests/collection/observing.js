var assert = require('assert');

suite('Collection - Observing(Integration)', function() {
  test('insert doc', function(done, server) {
    server.evalSync(function() {
      coll = new Meteor.SmartCollection('abc');
      cursor = coll.find({});
      cursor.observeChanges({
        added: function(id, doc) {
          emit('added', id, doc);
        }
      }, function() {
        emit('return');
      });
    });

    server.on('added', function(id, doc) {
      doc._id = id;
      assert.deepEqual(doc, {_id: 'kkk', aa: 20});
      done();
    });
    
    server.evalSync(function() {
      coll.insert({_id: 'kkk', aa: 20}, function() {
        emit('return');
      });
    });
  });

  test('update doc with id', function(done, server) {
    server.evalSync(function() {
      var Fibers = Npm.require('fibers');
      Fibers(function() {
        coll = new Meteor.SmartCollection('abc');
        coll.insert({_id: 'kkk', aa: 20});
        cursor = coll.find({});
        cursor.observeChanges({
          changed: function(id, fields) {
            emit('changed', id, fields);
          }
        });
        emit('return');
      }).run();
    });

    server.on('changed', function(id, fields) {
      assert.equal(id, 'kkk');
      assert.deepEqual(fields, {aa: 30, bb: 50});
      done();
    });

    server.evalSync(function() {
      coll.update({_id: 'kkk'}, {$set: {aa: 30, bb: 50}}, function() {
        emit('return');
      });
    });
  });

  test('update docs with a selector', function(done, server) {
    server.evalSync(function() {
      var Fibers = Npm.require('fibers');
      Fibers(function() {
        coll = new Meteor.SmartCollection('abc');
        coll.insert({_id: 'kkk', aa: 20, bb: 25});
        coll.insert({_id: 'kkk2', aa: 20, bb: 26});
        cursor = coll.find({});
        cursor.observeChanges({
          changed: function(id, fields) {
            emit('changed', id, fields);
          }
        });
        emit('return');
      }).run();
    });

    var received = [];
    server.on('changed', function(id, fields) {
      received.push([id, fields]);
    });

    server.evalSync(function() {
      coll.update({aa: 20}, {$inc: {bb: 10}}, {multi: true}, function() {
        emit('return');
      });
    });

    setTimeout(function() {
      assert.deepEqual(received, [
        ['kkk', {bb: 35}],
        ['kkk2', {bb: 36}]
      ]);
      done();
    }, 50);
  });

  test('remove doc with id', function(done, server) {
    server.evalSync(function() {
      var Fibers = Npm.require('fibers');
      Fibers(function() {
        coll = new Meteor.SmartCollection('abc');
        coll.insert({_id: 'kkk', aa: 20});
        cursor = coll.find({});
        cursor.observeChanges({
          removed: function(id) {
            emit('removed', id);
          }
        });
        emit('return');
      }).run();
    });

    server.on('removed', function(id) {
      assert.equal(id, 'kkk');
      done();
    });

    server.evalSync(function() {
      coll.remove({_id: 'kkk'}, function() {
        emit('return');
      });
    });
  });

  test('remove docs with a selector', function(done, server) {
    server.evalSync(function() {
      var Fibers = Npm.require('fibers');
      Fibers(function() {
        coll = new Meteor.SmartCollection('abc');
        coll.insert({_id: 'kkk', aa: 20});
        coll.insert({_id: 'kkk2', aa: 20});
        cursor = coll.find({});
        cursor.observeChanges({
          removed: function(id) {
            emit('removed', id);
          }
        });
        emit('return');
      }).run();
    });

    var received = [];
    server.on('removed', function(id) {
      received.push(id);
    });

    server.evalSync(function() {
      coll.remove({aa: 20}, function() {
        emit('return');
      });
    });

    setTimeout(function() {
      assert.deepEqual(received, ['kkk', 'kkk2']);
      done();
    }, 50);
  });
});
