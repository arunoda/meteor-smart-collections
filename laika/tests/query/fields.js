var assert = require('assert');
require('../common');

suite('Query - Fields Filtering', function() {
  suite('_compileFields', function() {
    test('with inclusion', function(done, server) {
      var info = server.evalSync(function() {
        var info = Meteor.SmartQuery.prototype._compileFields({aa: 1, bb: 1});
        emit('return', info);
      });

      assert.deepEqual(info, {
        include: ['aa', 'bb'],
        exclude: []
      });
      done();
    });

    test('with inclusion - wihtout _id', function(done, server) {
      var info = server.evalSync(function() {
        var info = Meteor.SmartQuery.prototype._compileFields({_id: 0, aa: 1, bb: 1});
        emit('return', info);
      });

      assert.deepEqual(info, {
        include: ['aa', 'bb'],
        exclude: ['_id']
      });
      done();
    });

    test('with exclusion', function(done, server) {
      var info = server.evalSync(function() {
        var info = Meteor.SmartQuery.prototype._compileFields({aa: 0, bb: 0});
        emit('return', info);
      });

      assert.deepEqual(info, {
        include: [],
        exclude: ['aa', 'bb']
      });
      done();
    });

    test('with both types', function(done, server) {
      var exception = server.evalSync(function() {
        try {
          var info = Meteor.SmartQuery.prototype._compileFields({aa: 0, bb: 0, cc: 1});
        } catch(ex) {
          emit('return', ex);
        }
        emit('return', null);
      });

      assert.ok(exception);
      done();
    });
  });

  suite('_filterFields', function() {
    test('without field filtering', function(done, server) {
      var filetedObject = server.evalSync(function() {
        coll = new Meteor.SmartCollection('coll');
        var query = new Meteor.SmartQuery(coll, {});
        //allow cursor to be correctly initialized
        setTimeout(function() {
          var filtered = query._filterFields({aa: 10, bb: 20, _id: 1});
          emit('return', filtered);
        }, 50);
      }); 

      assert.deepEqual(filetedObject, {_id: 1, aa: 10, bb: 20});
      done();
    });

    test('with include', function(done, server) {
      var filetedObject = server.evalSync(function() {
        coll = new Meteor.SmartCollection('coll');
        var query = new Meteor.SmartQuery(coll, {}, {fields: {aa: 1, bb: 1}});
        setTimeout(function() {
          var filtered = query._filterFields({aa: 10, bb: 20, cc: 20, _id: 1});
          emit('return', filtered);
        }, 50);
      }); 

      assert.deepEqual(filetedObject, {_id: 1, aa: 10, bb: 20});
      done();
    });

    test('with include and exclude _id', function(done, server) {
      var filetedObject = server.evalSync(function() {
        coll = new Meteor.SmartCollection('coll');
        var query = new Meteor.SmartQuery(coll, {}, {fields: {aa: 1, bb: 1, _id: 0}});
        setTimeout(function() {
          var filtered = query._filterFields({aa: 10, bb: 20, cc: 20, _id: 1});
          emit('return', filtered);
        }, 50);
      }); 

      assert.deepEqual(filetedObject, {aa: 10, bb: 20});
      done();
    });

    test('with exclude', function(done, server) {
      var filetedObject = server.evalSync(function() {
        coll = new Meteor.SmartCollection('coll');
        var query = new Meteor.SmartQuery(coll, {}, {fields: {aa: 0, bb: 0}});
        setTimeout(function() {
          var filtered = query._filterFields({aa: 10, bb: 20, cc: 20, _id: 1});
          emit('return', filtered);
        }, 50);
      }); 

      assert.deepEqual(filetedObject, {cc: 20, _id: 1});
      done();
    });
  })

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