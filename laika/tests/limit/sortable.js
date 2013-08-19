var assert = require('assert');

suite('Limit with Sortable', function() {
  test('sort properties', function(done, server) {
    var cursor = server.evalSync(function() {
      coll = new Meteor.SmartCollection('coll');
      var cursor = coll.find({}, {sort: {aa: 1, bb: -1}});
      Meteor.setTimeout(function() {
        emit('return', _.pick(cursor, ['_sortable', '_sortFields']));
      }, 50);
    });

    assert.equal(cursor._sortable, true);
    assert.deepEqual(cursor._sortFields, ['aa', 'bb', '_id']);        
    done();
  });

  test('._isSortFieldsChanged()', function(done, server) {
    var results = server.evalSync(function() {
      coll = new Meteor.SmartCollection('coll');
      var cursor = coll.find({}, {sort: {aa: 1, bb: -1}});
      //cursor is not yer initialized at first, so no options exists
      Meteor.setTimeout(function() {
        var results = [
          cursor._isSortFieldsChanged({aa: 1}),
          cursor._isSortFieldsChanged({aa: 1, bb: 20}),
          cursor._isSortFieldsChanged({cc: 20}),
        ];
        emit('return', results);;
      }, 50)
    });

    assert.deepEqual(results, [true, true, false]);        
    done();
  });

  test('._getSortFields()', function(done, server) {
    var results = server.evalSync(function() {
      coll = new Meteor.SmartCollection('coll');
      var cursor = coll.find({}, {sort: {aa: 1, bb: -1}});
      //cursor is not yer initialized at first, so no options exists
      var results = [
        cursor._getSortFields([["a", "asc"], ["b", "desc"]]),
        cursor._getSortFields(["c", ["d", "desc"]]),
        cursor._getSortFields({'e': 1, 'f': -1}),
      ];
      emit('return', results);
    });

    assert.deepEqual(results, [
      ['a', 'b'],
      ['c', 'd'],
      ['e', 'f']
    ]);        
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
          emit('return', _.pick(cursor, ['_sortDocCacheMap', '_sortDocCacheList']));
        }, 10);
      });

      assert.deepEqual(cursor._sortDocCacheMap, {
        'id-aa': {aa: 10, _id: 'id-aa'}
      });
      assert.deepEqual(cursor._sortDocCacheList, [{aa: 10, _id: 'id-aa'}]);
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
          emit('return', _.pick(cursor, ['_sortDocCacheMap', '_sortDocCacheList']));
        }, 10);
      });

      assert.deepEqual(cursor._sortDocCacheMap, {
        'id-aa': {aa: 30, _id: 'id-aa'}
      });
      assert.deepEqual(cursor._sortDocCacheList, [{aa: 30, _id: 'id-aa'}]);
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
          emit('return', _.pick(cursor, ['_sortDocCacheMap', '_sortDocCacheList']));
        }, 10);
      });

      assert.deepEqual(cursor._sortDocCacheMap, {});
      assert.deepEqual(cursor._sortDocCacheList, []);
      done();
    });

    test('cache in list ordered', function(done, server) {
      var cursor = server.evalSync(function() {
        coll = new Meteor.SmartCollection('coll');
        var cursor = coll.find({}, {sort: {aa: 1}});
        cursor.observeChanges({});
        coll.insert({_id: 'a', aa: 10, bb: 20});
        coll.insert({_id: 'b', aa: 20, bb: 20});
        coll.insert({_id: 'c', aa: 1, bb: 20});

        setTimeout(function() {
          emit('return', _.pick(cursor, ['_sortDocCacheMap', '_sortDocCacheList']));
        }, 10);
      });

      assert.deepEqual(cursor._sortDocCacheMap, {
        'a': {_id: 'a', aa: 10},
        'b': {_id: 'b', aa: 20},
        'c': {_id: 'c', aa: 1}
      });
      assert.deepEqual(cursor._sortDocCacheList, [
        {_id: 'c', aa: 1},
        {_id: 'a', aa: 10},
        {_id: 'b', aa: 20}
      ]);
      done();
    });
  });

  suite('sort and limited', function() {
    test('inserting only', function(done, server) {
      var results = server.evalSync(function() {
        coll = new Meteor.SmartCollection('coll');
        var added = []; 
        var removed = [];
        var cursor = coll.find({}, {sort: {aa: 1}, limit: 2});
        cursor.observeChanges({
          added: function(id, doc) {
            added.push(id);
          }, 
          removed: function(id) {
            removed.push(id);
          }
        });

        coll.insert({_id: 'a', aa: 20});
        coll.insert({_id: 'b', aa: 10});
        coll.insert({_id: 'c', aa: 5});
        coll.insert({_id: 'd', aa: 30});

        Meteor.setTimeout(function() {
          emit('return', [added, removed, cursor._sortDocCacheList]);
        }, 10);
      });

      assert.deepEqual(results[0], ['a', 'b', 'c']);
      assert.deepEqual(results[1], ['a']);
      assert.deepEqual(results[2], [
        {_id: 'c', aa: 5},
        {_id: 'b', aa: 10}
      ]);
      done();
    });

    test('insert and remove', function(done, server) {
      var results = server.evalSync(function() {
        coll = new Meteor.SmartCollection('coll');
        var added = []; 
        var removed = [];
        var cursor = coll.find({}, {sort: {aa: 1}, limit: 2});
        cursor.observeChanges({
          added: function(id, doc) {
            added.push(id);
          }, 
          removed: function(id) {
            removed.push(id);
          }
        });

        coll.insert({_id: 'a', aa: 20});
        coll.insert({_id: 'b', aa: 10});
        coll.insert({_id: 'c', aa: 5});
        coll.remove({_id: 'b'});

        Meteor.setTimeout(function() {
          emit('return', [added, removed, cursor._sortDocCacheList]);
        }, 10);
      });

      assert.deepEqual(results[0], ['a', 'b', 'c', 'a']);
      assert.deepEqual(results[1], ['a', 'b']);
      assert.deepEqual(results[2], [
        {_id: 'c', aa: 5},
        {_id: 'a', aa: 20}
      ]);
      done();
    });

    test('insert update (causes add an remove)', function(done, server) {
      var results = server.evalSync(function() {
        coll = new Meteor.SmartCollection('coll');
        var added = []; 
        var removed = [];
        var cursor = coll.find({}, {sort: {aa: 1}, limit: 2});
        cursor.observeChanges({
          added: function(id, doc) {
            added.push(id);
          }, 
          removed: function(id) {
            removed.push(id);
          }
        });

        coll.insert({_id: 'a', aa: 20});
        coll.insert({_id: 'b', aa: 10});
        coll.insert({_id: 'c', aa: 5});
        coll.update({_id: 'c'}, {$set: {aa: 50}});

        Meteor.setTimeout(function() {
          emit('return', [added, removed, cursor._sortDocCacheList]);
        }, 10);
      });

      assert.deepEqual(results[0], ['a', 'b', 'c', 'a']);
      assert.deepEqual(results[1], ['a', 'c']);
      assert.deepEqual(results[2], [
        {_id: 'b', aa: 10},
        {_id: 'a', aa: 20}
      ]);
      done();
    });

    test('insert update (only position change)', function(done, server) {
      var results = server.evalSync(function() {
        coll = new Meteor.SmartCollection('coll');
        var added = []; 
        var removed = [];
        var cursor = coll.find({}, {sort: {aa: 1}, limit: 2});
        cursor.observeChanges({
          added: function(id, doc) {
            added.push(id);
          }, 
          removed: function(id) {
            removed.push(id);
          }
        });

        coll.insert({_id: 'a', aa: 20});
        coll.insert({_id: 'b', aa: 10});
        coll.insert({_id: 'c', aa: 5});
        coll.update({_id: 'c'}, {$set: {aa: 12}});

        Meteor.setTimeout(function() {
          emit('return', [added, removed, cursor._sortDocCacheList]);
        }, 10);
      });

      assert.deepEqual(results[0], ['a', 'b', 'c']);
      assert.deepEqual(results[1], ['a']);
      assert.deepEqual(results[2], [
        {_id: 'b', aa: 10},
        {_id: 'c', aa: 12}
      ]);
      done();
    });

    test('insert update (but doc not in the cursor)', function(done, server) {
      var results = server.evalSync(function() {
        coll = new Meteor.SmartCollection('coll');
        var added = []; 
        var removed = [];
        var cursor = coll.find({}, {sort: {aa: 1}, limit: 2});
        cursor.observeChanges({
          added: function(id, doc) {
            added.push(id);
          }, 
          removed: function(id) {
            removed.push(id);
          }
        });

        coll.insert({_id: 'a', aa: 20});
        coll.insert({_id: 'b', aa: 10});
        coll.insert({_id: 'c', aa: 5});
        coll.update({_id: 'a'}, {$set: {aa: 2}});

        Meteor.setTimeout(function() {
          emit('return', [added, removed, cursor._sortDocCacheList]);
        }, 10);
      });

      assert.deepEqual(results[0], ['a', 'b', 'c', 'a']);
      assert.deepEqual(results[1], ['a', 'b']);
      assert.deepEqual(results[2], [
        {_id: 'a', aa: 2},
        {_id: 'c', aa: 5}
      ]);
      done();
    });
  });
});