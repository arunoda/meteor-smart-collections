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
});
