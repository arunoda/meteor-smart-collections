var assert = require('assert');
require('../common');

suite('Query - Fields Filtering', function() {
  suite('._raw*', function() {
    test('._rawAdded', function(done, server, client) {
      var docMap = server.evalSync(function() {
        var coll = new Meteor.SmartCollection('coll');
        var query = new Meteor.SmartQuery(coll, {}, {fields: {aa: 1}});
        query._rawAdded({_id: 'aa', aa: 10, bb: 20});
        emit('return', query._docMap);
      });

      assert.deepEqual(docMap, {'aa': {_id: 'aa', aa: 10}});
      done();
    });

    test('._rawAdded - nested filtering', function(done, server, client) {
      var docMap = server.evalSync(function() {
        var coll = new Meteor.SmartCollection('coll');
        var query = new Meteor.SmartQuery(coll, {}, {fields: {aa: 1, "bb.c": 1}});
        query._rawAdded({_id: 'aa', aa: 10, bb: {c: 10, k: 12}});
        emit('return', query._docMap);
      });

      assert.deepEqual(docMap, {'aa': {_id: 'aa', aa: 10, bb: {c: 10}}});
      done();
    });

    test('._rawAdded - nested filtering - ommited', function(done, server, client) {
      var docMap = server.evalSync(function() {
        var coll = new Meteor.SmartCollection('coll');
        var query = new Meteor.SmartQuery(coll, {}, {fields: {aa: 0, "bb.c": 0}});
        query._rawAdded({_id: 'aa', aa: 50, bb: {k: 12}});
        emit('return', query._docMap);
      });

      assert.deepEqual(docMap, {'aa': {_id: 'aa', bb: {k: 12}}});
      done();
    });

    test('._rawAdded id removed', function(done, server, client) {
      var docMap = server.evalSync(function() {
        var coll = new Meteor.SmartCollection('coll');
        var query = new Meteor.SmartQuery(coll, {}, {fields: {aa: 1, _id: 0}});
        query._rawAdded({_id: 'aa', aa: 10, bb: 20});
        emit('return', query._docMap);
      });

      assert.deepEqual(docMap, {'aa': {aa: 10}});
      done();
    });
    
    test('._rawChanged', function(done, server, client) {
      var docMap = server.evalSync(function() {
        var coll = new Meteor.SmartCollection('coll');
        var query = new Meteor.SmartQuery(coll, {}, {fields: {aa: 1}});
        query._rawAdded({_id: 'aa', aa: 10, bb: 20});
        query._rawChanged('aa', {aa: 50, bb: 30});
        emit('return', query._docMap);
      });

      assert.deepEqual(docMap, {'aa': {_id: 'aa', aa: 50}});
      done();
    });

    test('._rawChanged id removed', function(done, server, client) {
      var docMap = server.evalSync(function() {
        var coll = new Meteor.SmartCollection('coll');
        var query = new Meteor.SmartQuery(coll, {}, {fields: {aa: 1, _id: 0}});
        query._rawAdded({_id: 'aa', aa: 10, bb: 20});
        query._rawChanged('aa', {_id: 'aa', aa: 50, bb: 40});
        emit('return', query._docMap);
      });

      assert.deepEqual(docMap, {'aa': {aa: 50}});
      done();
    });

    test('with ._getChanges', function(done, server, client) {
      var docMap = server.evalSync(function() {
        var coll = new Meteor.SmartCollection('coll');
        var query = new Meteor.SmartQuery(coll, {}, {fields: {aa: 1, _id: 0}});
        query._rawAdded({_id: 'aa', aa: 10, bb: 20});
        var changes = query._getChanges(query._docMap['aa'], {_id: 'aa', aa: 50, bb: 40});
        query._rawChanged('aa', changes);
        emit('return', query._docMap);
      });

      assert.deepEqual(docMap, {'aa': {aa: 50}});
      done();
    });
  });

  suite('Integration', function() {
    test('insert', function(done, server, client) {
      server.evalSync(function() {
        coll = new Meteor.SmartCollection('coll');
        coll.allow({
          insert: function() {return true;}
        })
        Meteor.publish('coll', function() {
          return coll.find({}, {fields: {aa: 1}});
        });
        coll.insert({_id: 'aa', aa: 10, bb: 40})
        emit('return');
      });

      var results = client.evalSync(function() {
        coll = new Meteor.SmartCollection('coll');
        Meteor.subscribe('coll', function() {
          emit('return', coll.find().fetch());
        });
      });

      assert.deepEqual(results, [{_id: 'aa', aa: 10}]);
      done();
    });

    test('update', function(done, server, client) {
      server.evalSync(function() {
        coll = new Meteor.SmartCollection('coll');
        coll.allow({
          insert: function() {return true;}
        })
        Meteor.publish('coll', function() {
          return coll.find({}, {fields: {aa: 1}});
        });
        coll.insert({_id: 'aa', aa: 10, bb: 40})
        emit('return');
      });

      var results = client.evalSync(function() {
        coll = new Meteor.SmartCollection('coll');
        Meteor.subscribe('coll', function() {
          emit('return', coll.find().fetch());
        });
        coll.find().observe({
          changed: function(doc) {
            emit('changed', doc);
          }
        });
      });
      assert.deepEqual(results, [{_id: 'aa', aa: 10}]);

      client.on('changed', function(doc) {
        assert.deepEqual(doc, {_id: 'aa', aa: 20})
        done();
      });

      server.evalSync(function() {
        coll.update('aa', {$set: {aa: 20}});
        emit('return');
      });
    });
  }); 
});