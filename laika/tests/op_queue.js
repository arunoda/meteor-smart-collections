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
});