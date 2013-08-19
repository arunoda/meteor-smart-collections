var assert = require('assert');

suite('Limit with Sortable', function() {
  test('sort properties', function(done, server) {
    var cursor = server.evalSync(function() {
      coll = new Meteor.SmartCollection('coll');
      var cursor = coll.find({}, {sort: {aa: 1, bb: -1}});
      emit('return', _.pick(cursor, ['_sortable', '_sortFields']));
    });

    assert.equal(cursor._sortable, true);
    assert.deepEqual(cursor._sortFields, ['aa', 'bb']);        
    done();
  });

  suite('caching', function() {
    test('added', function(done, server) {
      var cursor = server.evalSync(function() {
        coll = new Meteor.SmartCollection('coll');
        var cursor = coll.find({}, {sort: {aa: 1}});
        cursor.observeChanges({});
        coll.insert({_id: 'id-aa', aa: 10, bb: 20});

        setTimeout(function() {
          emit('return', _.pick(cursor, ['_sortDocCache']));
        }, 10);
      });

      assert.deepEqual(cursor._sortDocCache, {
        'id-aa': {aa: 10}
      });
      done();
    });

    test('changed', function(done, server) {
      var cursor = server.evalSync(function() {
        coll = new Meteor.SmartCollection('coll');
        var cursor = coll.find({}, {sort: {aa: 1}});
        cursor.observeChanges({});
        coll.insert({_id: 'id-aa', aa: 10, bb: 20});
        coll.update({_id: 'id-aa'}, {$set: {aa: 30, bb: 40}});

        setTimeout(function() {
          emit('return', _.pick(cursor, ['_sortDocCache']));
        }, 10);
      });

      assert.deepEqual(cursor._sortDocCache, {
        'id-aa': {aa: 30}
      });
      done();
    });

    test('removed', function(done, server) {
      var cursor = server.evalSync(function() {
        coll = new Meteor.SmartCollection('coll');
        var cursor = coll.find({}, {sort: {aa: 1}});
        cursor.observeChanges({});
        coll.insert({_id: 'id-aa', aa: 10, bb: 20});
        coll.remove({_id: 'id-aa'});

        setTimeout(function() {
          emit('return', _.pick(cursor, ['_sortDocCache']));
        }, 10);
      });

      assert.deepEqual(cursor._sortDocCache, {});
      done();
    });
  });
});