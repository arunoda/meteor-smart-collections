var assert = require('assert');
global._ = require('../../node_modules/underscore');
require('./loader')('lib/queue_invalidator');

suite('Queue Invalidator', function() {
  test('insert', function(done) {
    var qi = new Meteor.SmartQueueInvalidator({
      insert: function(id, doc) {
        assert.equal(id, 'id1');
        assert.deepEqual(doc, {aa: 20});
        done();
      }
    });
    qi.insert('id1', {aa: 20});
  });

  test('update with id', function(done) {
    var result;
    var qi = new Meteor.SmartQueueInvalidator({
      update: function(id, doc, callback) {
        result = [id, doc];
        callback();
      }
    });
    qi.update('id1', {$set: {aa: 10}});
    assert.deepEqual(result, ['id1', {aa: 1}]);
    assert.deepEqual(qi._idQueues, {id1: []});
    assert.deepEqual(qi._idsProcessing, []);
    done();
  });

  test('update with id twice', function(done) {
    var results = [];
    var qi = new Meteor.SmartQueueInvalidator({
      update: function(id, doc, callback) {
        results.push([id, doc]);
        setTimeout(callback, 0);
      }
    });
    qi.update('id1', {$set: {aa: 10}});
    qi.update('id1', {$set: {bb: 10}});

    assert.deepEqual(qi._idQueues, {id1: [['u', 'id1', {$set: {bb: 10}}]]});
    assert.deepEqual(qi._idsProcessing, ['id1']);

    setTimeout(function() {
      assert.deepEqual(results, [['id1', {aa: 1}], ['id1', {bb: 1}]]);
      assert.deepEqual(qi._idQueues, {id1: []});
      assert.deepEqual(qi._idsProcessing, []);
      done();
    }, 10);

  });

  test('update with different id', function(done) {
    var results = [];
    var qi = new Meteor.SmartQueueInvalidator({
      update: function(id, doc, callback) {
        results.push([id, doc]);
        setTimeout(callback, 0);
      }
    });
    qi.update('id1', {$set: {aa: 10}});
    qi.update('id2', {$set: {bb: 10}});
    
    assert.deepEqual(qi._idQueues, {id1: [], id2: []});
    assert.deepEqual(qi._idsProcessing, ['id1', 'id2']);

    setTimeout(function() {
      assert.deepEqual(results, [['id1', {aa: 1}], ['id2', {bb: 1}]]);
      assert.deepEqual(qi._idQueues, {id1: [], id2: []});
      assert.deepEqual(qi._idsProcessing, []);
      done();
    }, 10);
  });

  test('remove while queued', function(done) {
    var results = [];
    var qi = new Meteor.SmartQueueInvalidator({
      remove: function(id) {
        results.push(id);
      }
    });
    qi._idQueues = {'id1': [['u', 'id1', {$set: {bb: 19}}]]}
    qi.remove('id1');

    assert.deepEqual(qi._idQueues, {});
    assert.deepEqual(results, ['id1']);
    done();
  });

  test('multi update once', function(done) {
    var results = [];
    var qi = new Meteor.SmartQueueInvalidator({
      multiUpdate: function(selector, fields, callback) {
        results.push([selector, fields]);
        setTimeout(callback, 0);
      }
    });
    qi.multiUpdate({aa: 10}, {$set: {bb: 20}});

    assert.equal(qi._globalProcessing, true);
    assert.deepEqual(qi._globalQueue, []);
    assert.equal(qi._globalHook, null);

    setTimeout(function() {
      assert.deepEqual(results, [[{aa: 10}, {bb: 1}]]);
      assert.equal(qi._globalProcessing, false);
      assert.deepEqual(qi._globalQueue, []);
      assert.equal(qi._globalHook, null);
      done();
    }, 10);
  });

  test('multi update and multi remove once', function(done) {
    var results = [];
    var qi = new Meteor.SmartQueueInvalidator({
      multiUpdate: function(selector, fields, callback) {
        results.push([selector, fields]);
        setTimeout(callback, 0);
      },
      multiRemove: function(selector, callback) {
        results.push([selector]);
        setTimeout(callback, 0);
      }
    });
    qi.multiUpdate({aa: 10}, {$set: {bb: 20}});
    qi.multiRemove({cc: 10});

    assert.equal(qi._globalProcessing, true);
    assert.deepEqual(qi._globalQueue, [['mr', {cc: 10}]]);
    assert.equal(qi._globalHook, null);

    setTimeout(function() {
      assert.deepEqual(results, [[{aa: 10}, {bb: 1}], [{cc: 10}]]);
      assert.equal(qi._globalProcessing, false);
      assert.deepEqual(qi._globalQueue, []);
      assert.equal(qi._globalHook, null);
      done();
    }, 10);
  });

  test('adding id update after while multi remove', function(done) {
    var results = [];
    var qi = new Meteor.SmartQueueInvalidator({
      multiUpdate: function(selector, fields, callback) {
        results.push([selector, fields]);
        setTimeout(callback, 0);
      },
      update: function(id, fields, callback) {
        results.push([id, fields]);
        setTimeout(callback, 0);
      }
    });
    qi.multiUpdate({aa: 10}, {$set: {bb: 20}});
    qi.update('id1', {$set: {cc: 20}});

    assert.deepEqual(qi._idQueues, {});
    assert.equal(qi._globalProcessing, true);
    assert.deepEqual(qi._globalQueue, [['u', 'id1', {$set: {cc: 20}}]]);
    assert.equal(qi._globalHook, null);

    setTimeout(function() {
      assert.deepEqual(results, [[{aa: 10}, {bb: 1}], ['id1', {cc: 1}]]);
      assert.equal(qi._globalProcessing, false);
      assert.deepEqual(qi._globalQueue, []);
      assert.equal(qi._globalHook, null);
      assert.deepEqual(qi._idsProcessing, []);
      assert.deepEqual(qi._idQueues, {id1: []});

      done();
    }, 10);
  });

  test('add id update, multi update at once', function(done) {
    var results = [];
    var qi = new Meteor.SmartQueueInvalidator({
      multiUpdate: function(selector, fields, callback) {
        results.push([selector, fields]);
        setTimeout(callback, 0);
      },
      update: function(id, fields, callback) {
        results.push([id, fields]);
        setTimeout(callback, 0);
      }
    });
    qi.update('id1', {$set: {cc: 20}});
    qi.multiUpdate({aa: 10}, {$set: {bb: 20}});

    assert.deepEqual(qi._idQueues, {id1: []});
    assert.deepEqual(qi._idsProcessing, ['id1']);
    assert.equal(qi._globalProcessing, false);
    assert.deepEqual(qi._globalQueue, [['mu', {aa: 10}, {$set: {bb: 20}}]]);
    assert.equal(typeof(qi._globalHook), 'function');

    setTimeout(function() {
      assert.deepEqual(results, [['id1', {cc: 1}], [{aa: 10}, {bb: 1}]]);
      assert.equal(qi._globalProcessing, false);
      assert.deepEqual(qi._globalQueue, []);
      assert.equal(qi._globalHook, null);
      assert.deepEqual(qi._idsProcessing, []);
      assert.deepEqual(qi._idQueues, {id1: []});

      done();
    }, 10);
  });

  // test('add multi update, id update, multi remove at once', function(done) {
  //   var results = [];
  //   var qi = new Meteor.SmartQueueInvalidator({
  //     multiUpdate: function(selector, fields, callback) {
  //       results.push([selector, fields]);
  //       setTimeout(callback, 0);
  //     },
  //     update: function(id, fields, callback) {
  //       results.push([id, fields]);
  //       callback();
  //       assert.deepEqual(qi._globalProcessing, true);
  //       assert.deepEqual(qi._globalQueue, []);
  //     },
  //     multiRemove: function(selector, callback) {
  //       results.push([selector]);
  //       setTimeout(callback, 0);
  //     }
  //   });

  //   qi.multiUpdate({aa: 10}, {$set: {bb: 20}});
  //   qi.update('id1', {$set: {aa: 30}});
  //   qi.multiRemove({cc: 10});

  //   assert.deepEqual(qi._globalProcessing, true);
  //   assert.deepEqual(qi._globalQueue[
  //     ['u', 'id1', {$set: {aa: 30}}],
  //     ['mr', {cc: 10}]
  //   ]);

  //   setTimeout(function() {
  //     assert.deepEqual(results, [
  //       [{aa: 10}, {bb: 1}],
  //       ['id1', {aa: 1}],
  //       [{cc: 10}]
  //     ]);
  //     done();
  //   }, 10);
  // });
});
