var assert = require('assert');

suite('Cursor - Fields Filtering', function() {
  suite('_compileFields', function() {
    test('with inclusion', function(done, server) {
      var info = server.evalSync(function() {
        var cursor = new Meteor.SmartCursor();
        var info = cursor._compileFields({aa: 1, bb: 1});
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
        var cursor = new Meteor.SmartCursor();
        var info = cursor._compileFields({_id: 0, aa: 1, bb: 1});
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
        var cursor = new Meteor.SmartCursor();
        var info = cursor._compileFields({aa: 0, bb: 0});
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
        var cursor = new Meteor.SmartCursor();
        try {
          var info = cursor._compileFields({aa: 0, bb: 0, cc: 1});
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
        var cursor = coll.find({});
        //allow cursor to be correctly initialized
        setTimeout(function() {
          var filtered = cursor._filterFields({aa: 10, bb: 20, _id: 1});
          emit('return', filtered);
        }, 50);
      }); 

      assert.deepEqual(filetedObject, {_id: 1, aa: 10, bb: 20});
      done();
    });

    test('with include', function(done, server) {
      var filetedObject = server.evalSync(function() {
        coll = new Meteor.SmartCollection('coll');
        var cursor = coll.find({}, {fields: {aa: 1, bb: 1}});
        setTimeout(function() {
          var filtered = cursor._filterFields({aa: 10, bb: 20, cc: 20, _id: 1});
          emit('return', filtered);
        }, 50);
      }); 

      assert.deepEqual(filetedObject, {_id: 1, aa: 10, bb: 20});
      done();
    });

    test('with include and exclude _id', function(done, server) {
      var filetedObject = server.evalSync(function() {
        coll = new Meteor.SmartCollection('coll');
        var cursor = coll.find({}, {fields: {aa: 1, bb: 1, _id: 0}});
        setTimeout(function() {
          var filtered = cursor._filterFields({aa: 10, bb: 20, cc: 20, _id: 1});
          emit('return', filtered);
        }, 50);
      }); 

      assert.deepEqual(filetedObject, {aa: 10, bb: 20});
      done();
    });

    test('with exclude', function(done, server) {
      var filetedObject = server.evalSync(function() {
        coll = new Meteor.SmartCollection('coll');
        var cursor = coll.find({}, {fields: {aa: 0, bb: 0}});
        setTimeout(function() {
          var filtered = cursor._filterFields({aa: 10, bb: 20, cc: 20, _id: 1});
          emit('return', filtered);
        }, 50);
      }); 

      assert.deepEqual(filetedObject, {cc: 20, _id: 1});
      done();
    });
  })

  suite('integration', function() {
    test('initial filtering', function(done, server) {
      var docs = server.evalSync(function() {
        coll = new Meteor.SmartCollection('coll');
        coll.insert({_id: 'aa', aa: 10, bb: 20});
        var docs = coll.find({}, {fields: {aa: 1}}).fetch();

        emit('return', docs);
      });

      assert.deepEqual(docs, [{_id: 'aa', aa: 10}]);
      done();
    });

    test('sending changes - added', function(done, server) {
      var docs = server.evalSync(function() {
        coll = new Meteor.SmartCollection('coll');
        var docs = [];
        coll.find({}, {fields: {aa: 1}}).observeChanges({
          added: function(id, doc) {
            docs.push(doc);
          }
        });
        coll.insert({_id: 'aa', aa: 10, bb: 20});

        setTimeout(function() {
          emit('return', docs);
        }, 10);
      });

      assert.deepEqual(docs, [{_id: 'aa', aa: 10}]);
      done();
    });

    test('sending changes - changed', function(done, server) {
      var docs = server.evalSync(function() {
        coll = new Meteor.SmartCollection('coll');
        var docs = [];
        coll.find({}, {fields: {aa: 1}}).observeChanges({
          added: function(id, doc) {
            docs.push(doc);
          },

          changed: function(id, doc) {
            docs.push(doc);
          }
        });

        coll.insert({_id: 'aa', aa: 10, bb: 20});
        coll.update({_id: 'aa'}, {$set: {aa: 30, bb: 40}});

        setTimeout(function() {
          emit('return', docs);
        }, 10);
      });

      assert.deepEqual(docs, [
        {_id: 'aa', aa: 10},
        {aa: 30}
      ]);
      done();
    });
  });
});