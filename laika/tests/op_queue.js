var assert = require('assert');
global._ = require('../../node_modules/underscore');
require('./loader')('lib/op_queue.js');

suite('OpQueue', function() {
  suite('IdUpdateQueue', function() {
    test('push and start', function(done) {
      var results = [];
      var invalidator = {
        update: function(id, mod, callback) { results.push([id, mod]); callback(); }
      };
      var q = new Meteor.SmartOpQueue.IdUpdateQueue(invalidator, function() {
        assert.deepEqual(results, [['id1', {$set: {aa: 20}}]]);
        done();  
      });
      q.push('id1', {$set: {aa: 20}});
      q.start();
    });

    test('push start push before complete', function(done) {
      var results = [];
      var invalidator = {
        update: function(id, mod, callback) { results.push([id, mod]); setTimeout(callback, 0); }
      };
      var q = new Meteor.SmartOpQueue.IdUpdateQueue(invalidator, function() {
        results.push(['done']);
      });
      q.push('id1', {$set: {aa: 20}});
      q.push('id1', {$set: {bb: 20}});
      q.start();

      setTimeout(function() {
        assert.deepEqual(results, [
          ['id1', {$set: {aa: 20}}],
          ['id1', {$set: {bb: 20}}],
          ['done']
        ]);
        done();
      }, 10);

    });

    test('push stop and start', function(done) {
      var results = [];
      var invalidator = {
        update: function(id, mod, callback) { results.push([id, mod]); setTimeout(callback, 0); }
      };
      var q = new Meteor.SmartOpQueue.IdUpdateQueue(invalidator, function() {
        results.push(['done']);
      });
      q.push('id1', {$set: {aa: 20}});
      q.stop();
      q.start();

      setTimeout(function() {
        assert.deepEqual(results, [
          ['done']
        ]);
        done();
      }, 10);

    });

  });

  test('insert', function(done) {
    var results = [];
    var invalidator = {
      insert: function(doc) { results.push(doc) }
    };
    var q = new Meteor.SmartOpQueue(invalidator);
    q.insert({_id: '20', aa: 50});
    assert.deepEqual(results, [{_id: 20, aa: 50}]);
    done();
  });

  test('remove', function(done) {
    var results = [];
    var invalidator = {
      remove: function(id) { results.push([id]) },
      update: function(id, mod, callback) { results.push([id, mod]); setTimeout(callback, 0); }
    };
    var q = new Meteor.SmartOpQueue(invalidator);
    q.update('id1', {$set: {aa: 20}});
    q.update('id1', {$set: {bb: 20}});
    q.remove('id1');

    setTimeout(function() {
      assert.deepEqual(results, [
        ['id1', {$set: {aa: 20}}],
        ['id1']
      ]);
      assert.deepEqual(q._idUpdateQueues, {});
      done();
    }, 10);
  });

  test('id update', function(done) {
    var results = [];
    var invalidator = {
      update: function(id, mod, callback) { results.push([id, mod]); setTimeout(callback, 0); }
    };
    var q = new Meteor.SmartOpQueue(invalidator);
    q.update('id1', {$set: {aa: 20}});

    setTimeout(function() {
      assert.deepEqual(results, [
        ['id1', {$set: {aa: 20}}]
      ]);
      assert.deepEqual(q._idUpdateQueues, {});
      done();
    }, 10);
  });

  test('id update twice (diff id)', function(done) {
    var results = [];
    var invalidator = {
      update: function(id, mod, callback) { results.push([id, mod]); setTimeout(callback, 0); }
    };
    var q = new Meteor.SmartOpQueue(invalidator);
    q.update('id1', {$set: {aa: 20}});
    q.update('id2', {$set: {aa: 20}});

    assert.deepEqual(_.keys(q._idUpdateQueues), ['id1', 'id2']);

    setTimeout(function() {
      assert.deepEqual(results, [
        ['id1', {$set: {aa: 20}}],
        ['id2', {$set: {aa: 20}}]
      ]);
      assert.deepEqual(q._idUpdateQueues, {});
      done();
    }, 10);
  });

  test('update id twice (same id)', function(done) {
    var results = [];
    var invalidator = {
      update: function(id, mod, callback) { results.push([id, mod]); setTimeout(callback, 0); }
    };
    var q = new Meteor.SmartOpQueue(invalidator);
    q.update('id1', {$set: {aa: 20}});
    q.update('id1', {$set: {bb: 20}});

    assert.deepEqual(_.keys(q._idUpdateQueues), ['id1']);

    setTimeout(function() {
      assert.deepEqual(results, [
        ['id1', {$set: {aa: 20}}],
        ['id1', {$set: {bb: 20}}]
      ]);
      assert.deepEqual(q._idUpdateQueues, {});
      done();
    }, 10);
  });

  test('multi update once', function(done) {
    var results = [];
    var invalidator = {
      poll: function(callback) { results.push('p'); setTimeout(callback, 0); }
    };
    var q = new Meteor.SmartOpQueue(invalidator);
    q.multiUpdate({aa: 10}, {$set: {aa: 30}});

    assert.equal(q._multiProcessing, true);

    setTimeout(function() {
      assert.deepEqual(results, ['p']);
      assert.equal(q._multiProcessing, false);
      done();
    }, 10);
  });

  test('multi update and multi remove', function(done) {
    var results = [];
    var invalidator = {
      poll: function(callback) { results.push('p'); setTimeout(callback, 0); }
    };
    var q = new Meteor.SmartOpQueue(invalidator);
    q.multiUpdate({aa: 10}, {$set: {aa: 30}});
    q.multiRemove({bb: 10});

    assert.equal(q._multiProcessing, true);
    assert.deepEqual(q._globalQueue, [['p']]);

    setTimeout(function() {
      assert.deepEqual(results, ['p', 'p']);
      assert.equal(q._multiProcessing, false);
      done();
    }, 10);
  });

  test('adding id update, while multi remove', function(done) {
    var results = [];
    var invalidator = {
      poll: function(callback) { results.push('p'); setTimeout(callback, 0); },
      update: function(id, mod, callback) { results.push([id, mod]); setTimeout(callback, 0); }
    };
    var q = new Meteor.SmartOpQueue(invalidator);
    q.multiRemove({bb: 10});
    q.update('id1', {$set: {aa: 20}});

    assert.equal(q._multiProcessing, true);
    assert.deepEqual(_.keys(q._idUpdateQueues), []);
    assert.deepEqual(q._globalQueue, [['u', 'id1', {$set: {aa: 20}}]]);

    setTimeout(function() {
      assert.deepEqual(results, [
        'p',
        ['id1', {$set: {aa: 20}}]
      ]);
      assert.equal(q._multiProcessing, false);
      assert.deepEqual(q._idUpdateQueues, {});
      done();
    }, 10);
  });

  test('add multi update, id update, multi remove', function(done) {
    var results = [];
    var invalidator = {
      poll: function(callback) { results.push('p'); setTimeout(callback, 0); },
      update: function(id, mod, callback) { 
        assert.equal(q._multiProcessing, false);
        assert.deepEqual(_.keys(q._idUpdateQueues), ['id1']);
        assert.deepEqual(q._globalQueue, [
          ['mr', {bb: 10}]
        ]);

        results.push([id, mod]); setTimeout(callback, 0); 
      }
    };
    var q = new Meteor.SmartOpQueue(invalidator);
    q.multiUpdate({aa: 10}, {$set: {cc: 20}});
    q.update('id1', {$set: {aa: 20}});
    q.multiRemove({bb: 10});

    assert.equal(q._multiProcessing, true);
    assert.deepEqual(_.keys(q._idUpdateQueues), []);
    assert.deepEqual(q._globalQueue, [
      ['p']
    ]);

    setTimeout(function() {
      assert.deepEqual(results, [
        'p', 'p'
      ]);
      assert.equal(q._multiProcessing, false);
      assert.deepEqual(q._idUpdateQueues, {});
      done();
    }, 10);
  });

  test('id update and multiUpdate', function(done) {
    var results = [];
    var invalidator = {
      poll: function(callback) { results.push('p'); setTimeout(callback, 0); },
      update: function(id, mod, callback) { results.push([id, mod]); setTimeout(callback, 0); }
    };
    var q = new Meteor.SmartOpQueue(invalidator);
    q.update('id1', {$set: {aa: 20}});
    q.multiUpdate({aa: 10}, {$set: {cc: 20}});

    assert.equal(q._multiProcessing, false);
    assert.deepEqual(_.keys(q._idUpdateQueues), ['id1']);
    assert.deepEqual(q._globalQueue, [
      ['p']
    ]);

    setTimeout(function() {
      assert.deepEqual(results, [
        ['id1', {$set: {aa: 20}}],
        'p'
      ]);
      assert.equal(q._multiProcessing, false);
      assert.deepEqual(q._idUpdateQueues, {});
      done();
    }, 10);
  });
});