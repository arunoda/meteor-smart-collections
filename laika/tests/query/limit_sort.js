var assert = require('assert');

suite('Query - Limit Sort', function() {
  test('sort properties', function(done, server) {
    var query = server.evalSync(function() {
      coll = new Meteor.SmartCollection('coll');
      query = new Meteor.SmartQuery(coll, {}, {sort: {aa: 1, bb: -1}});
  
      Meteor.setTimeout(function() {
        emit('return', _.pick(query, ['_sortable', '_sortFields']));
      }, 50);
    });

    assert.equal(query._sortable, true);
    assert.deepEqual(query._sortFields, ['aa', 'bb', '_id']);        
    done();
  });

  test('._isSortFieldsChanged()', function(done, server) {
    var results = server.evalSync(function() {
      coll = new Meteor.SmartCollection('coll');
      query = new Meteor.SmartQuery(coll, {}, {sort: {aa: 1, bb: -1}});

      var results = [
        query._isSortFieldsChanged({aa: 1}),
        query._isSortFieldsChanged({aa: 1, bb: 20}),
        query._isSortFieldsChanged({cc: 20}),
      ];
      emit('return', results);;
    });

    assert.deepEqual(results, [true, true, false]);        
    done();
  });

  test('._getSortFields()', function(done, server) {
    var results = server.evalSync(function() {
      coll = new Meteor.SmartCollection('coll');
      query = new Meteor.SmartQuery(coll, {}, {sort: {aa: 1, bb: -1}});
      //cursor is not yer initialized at first, so no options exists
      var results = [
        query._getSortFields([["a", "asc"], ["b", "desc"]]),
        query._getSortFields(["c", ["d", "desc"]]),
        query._getSortFields({'e': 1, 'f': -1}),
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
    test('snapshot', function(done, server) {
      var query = server.evalSync(function() {
        coll = new Meteor.SmartCollection('coll');
        query = new Meteor.SmartQuery(coll, {}, {sort: {aa: 1}});
       
        coll.insert({_id: 'id-aa', aa: 10, bb: 20});
        query.snapshot();

        setTimeout(function() {
          emit('return', _.pick(query, ['_sortDocCacheMap', '_sortDocCacheList']));
        }, 50);
      });

      assert.deepEqual(query._sortDocCacheMap, {
        'id-aa': {aa: 10, _id: 'id-aa'}
      });
      assert.deepEqual(query._sortDocCacheList, [{aa: 10, _id: 'id-aa'}]);
      done();
    });

    test('added', function(done, server) {
      var query = server.evalSync(function() {
        coll = new Meteor.SmartCollection('coll');
        query = new Meteor.SmartQuery(coll, {}, {sort: {aa: 1}});
       
        coll.insert({_id: 'id-aa', aa: 10, bb: 20});
        query.added({_id: 'id-aa', aa: 10, bb: 20});

        setTimeout(function() {
          emit('return', _.pick(query, ['_sortDocCacheMap', '_sortDocCacheList']));
        }, 100);
      });

      assert.deepEqual(query._sortDocCacheMap, {
        'id-aa': {aa: 10, _id: 'id-aa'}
      });
      assert.deepEqual(query._sortDocCacheList, [{aa: 10, _id: 'id-aa'}]);
      done();
    });

    test('changed', function(done, server) {
      var query = server.evalSync(function() {
        coll = new Meteor.SmartCollection('coll');
        query = new Meteor.SmartQuery(coll, {}, {sort: {aa: 1}});
       
        coll.insert({_id: 'id-aa', aa: 10, bb: 20});
        query.added({_id: 'id-aa', aa: 10, bb: 20});

        Meteor.setTimeout(function() {
          coll.update({_id: 'id-aa'}, {$set: {aa: 30}});
          query.changed('id-aa', {aa: 30});
        }, 100)

        setTimeout(function() {
          emit('return', _.pick(query, ['_sortDocCacheMap', '_sortDocCacheList']));
        }, 150);
      });

      assert.deepEqual(query._sortDocCacheMap, {
        'id-aa': {aa: 30, _id: 'id-aa'}
      });
      assert.deepEqual(query._sortDocCacheList, [{aa: 30, _id: 'id-aa'}]);
      done();
    });

    test('removed', function(done, server) {
      var query = server.evalSync(function() {
        coll = new Meteor.SmartCollection('coll');
        query = new Meteor.SmartQuery(coll, {}, {sort: {aa: 1}});
       
        coll.insert({_id: 'id-aa', aa: 10, bb: 20});
        query.added({_id: 'id-aa', aa: 10, bb: 20});

        Meteor.setTimeout(function() {
          coll.remove({_id: 'id-aa'});
          query.removed('id-aa');
        }, 100)

        setTimeout(function() {
          emit('return', _.pick(query, ['_sortDocCacheMap', '_sortDocCacheList']));
        }, 150);
      });

      assert.deepEqual(query._sortDocCacheMap, {});
      assert.deepEqual(query._sortDocCacheList, []);
      done();
    });
  });

  suite('sort and limit', function() {
    test('insert', function(done, server) {
      var results = server.evalSync(function() {
        coll = new Meteor.SmartCollection('coll');
        query = new Meteor.SmartQuery(coll, {}, {sort: {aa: 1}, limit: 2});

        //just to make sure, mongo connected
        coll.remove({nn: 'aa'});

        var added = []; 
        var removed = [];
        query.addObserver({
          added: function(doc) {
            added.push(doc._id);
          }, 
          removed: function(id) {
            removed.push(id);
          },
          changed: function() {

          }
        });

        coll.insert({_id: 'a', aa: 20});
        query.added({_id: 'a', aa: 20});

        coll.insert({_id: 'b', aa: 10});
        query.added({_id: 'b', aa: 10});

        coll.insert({_id: 'c', aa: 5});
        query.added({_id: 'c', aa: 5});

        coll.insert({_id: 'd', aa: 30});
        query.added({_id: 'd', aa: 30});

        Meteor.setTimeout(function() {
          emit('return', [added, removed, query._sortDocCacheList]);
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

    test('insert, remove', function(done, server) {
      var results = server.evalSync(function() {
        coll = new Meteor.SmartCollection('coll');
        query = new Meteor.SmartQuery(coll, {}, {sort: {aa: 1}, limit: 2});

        //just to make sure, mongo connected
        coll.remove({nn: 'aa'});

        var added = []; 
        var removed = [];
        query.addObserver({
          added: function(doc) {
            added.push(doc._id);
          }, 
          removed: function(id) {
            removed.push(id);
          },
          changed: function() {

          }
        });

        coll.insert({_id: 'a', aa: 20});
        query.added({_id: 'a', aa: 20});

        coll.insert({_id: 'b', aa: 10});
        query.added({_id: 'b', aa: 10});

        coll.insert({_id: 'c', aa: 5});
        query.added({_id: 'c', aa: 5});

        coll.remove({_id: 'b'});
        query.removed('b');

        Meteor.setTimeout(function() {
          emit('return', [added, removed, query._sortDocCacheList]);
        }, 100);
      });

      assert.deepEqual(results[0], ['a', 'b', 'c', 'a']);
      assert.deepEqual(results[1], ['a', 'b']);
      assert.deepEqual(results[2], [
        {_id: 'c', aa: 5},
        {_id: 'a', aa: 20}
      ]);
      done();
    });

    test('insert, update (causes add an remove)', function(done, server) {
      var results = server.evalSync(function() {
        coll = new Meteor.SmartCollection('coll');
        query = new Meteor.SmartQuery(coll, {}, {sort: {aa: 1}, limit: 2});

        //just to make sure, mongo connected
        coll.remove({nn: 'aa'});

        var added = []; 
        var removed = [];
        query.addObserver({
          added: function(doc) {
            added.push(doc._id);
          }, 
          removed: function(id) {
            removed.push(id);
          },
          changed: function() {

          }
        });

        coll.insert({_id: 'a', aa: 20});
        query.added({_id: 'a', aa: 20});

        coll.insert({_id: 'b', aa: 10});
        query.added({_id: 'b', aa: 10});

        coll.insert({_id: 'c', aa: 5});
        query.added({_id: 'c', aa: 5});

        coll.update({_id: 'c'}, {$set: {aa: 50}});
        query.changed('c', {aa: 50});

        Meteor.setTimeout(function() {
          emit('return', [added, removed, query._sortDocCacheList]);
        }, 100);
      });

      assert.deepEqual(results[0], ['a', 'b', 'c', 'a']);
      assert.deepEqual(results[1], ['a', 'c']);
      assert.deepEqual(results[2], [
        {_id: 'b', aa: 10},
        {_id: 'a', aa: 20}
      ]);
      done();
    });

    test('insert, update (only position change)', function(done, server) {
      var results = server.evalSync(function() {
        coll = new Meteor.SmartCollection('coll');
        query = new Meteor.SmartQuery(coll, {}, {sort: {aa: 1}, limit: 2});

        //just to make sure, mongo connected
        coll.remove({nn: 'aa'});

        var added = []; 
        var removed = [];
        query.addObserver({
          added: function(doc) {
            added.push(doc._id);
          }, 
          removed: function(id) {
            removed.push(id);
          },
          changed: function() {

          }
        });

        coll.insert({_id: 'a', aa: 20});
        query.added({_id: 'a', aa: 20});

        coll.insert({_id: 'b', aa: 10});
        query.added({_id: 'b', aa: 10});

        coll.insert({_id: 'c', aa: 5});
        query.added({_id: 'c', aa: 5});

        coll.update({_id: 'c'}, {$set: {aa: 12}});
        query.changed('c', {aa: 12});

        Meteor.setTimeout(function() {
          emit('return', [added, removed, query._sortDocCacheList]);
        }, 100);
      });

      assert.deepEqual(results[0], ['a', 'b', 'c']);
      assert.deepEqual(results[1], ['a']);
      assert.deepEqual(results[2], [
        {_id: 'b', aa: 10},
        {_id: 'c', aa: 12}
      ]);
      done();
    });

    test('insert, update (only position change)', function(done, server) {
      var results = server.evalSync(function() {
        coll = new Meteor.SmartCollection('coll');
        query = new Meteor.SmartQuery(coll, {}, {sort: {aa: 1}, limit: 2});

        //just to make sure, mongo connected
        coll.remove({nn: 'aa'});

        var added = []; 
        var removed = [];
        query.addObserver({
          added: function(doc) {
            added.push(doc._id);
          }, 
          removed: function(id) {
            removed.push(id);
          },
          changed: function() {

          }
        });

        coll.insert({_id: 'a', aa: 20});
        query.added({_id: 'a', aa: 20});

        coll.insert({_id: 'b', aa: 10});
        query.added({_id: 'b', aa: 10});

        coll.insert({_id: 'c', aa: 5});
        query.added({_id: 'c', aa: 5});

        coll.update({_id: 'a'}, {$set: {aa: 2}});
        query.changed('c', {aa: 2});

        Meteor.setTimeout(function() {
          emit('return', [added, removed, query._sortDocCacheList]);
        }, 100);
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