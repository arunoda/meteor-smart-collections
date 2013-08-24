var assert = require('assert');

suite('Query - Limit Only', function() {
  test('snapshot with limit', function(done, server) {
    var results = server.evalSync(function() {
      coll = new Meteor.SmartCollection('coll');
      query = new Meteor.SmartQuery(coll, {}, {limit: 3});

      coll.insert({_id: 'one', aa: "aa"});
      coll.insert({_id: 'two', aa: "aa"});
      coll.insert({_id: 'three', aa: "aa"});
      coll.insert({_id: 'four', aa: "aa"});

      var addedDocs = [];
      var removedDocs = [];
      query.addObserver({
        added: function(doc) {
          addedDocs.push(doc);
        },
        removed: function(id) {
          removedDocs.push(id);
        }
      });

      setTimeout(function() {
        emit('return', [addedDocs, removedDocs]);
      }, 100);
    });
    assert.deepEqual(results, [
      [
        {_id: 'one', aa: "aa"}, {_id: 'two', aa: "aa"}, 
        {_id: 'three', aa: "aa"}
      ],
      []
    ]);
    done();
  });

  test('added later with limit', function(done, server) {
    var results = server.evalSync(function() {
      coll = new Meteor.SmartCollection('coll');
      query = new Meteor.SmartQuery(coll, {}, {limit: 3});

      var addedDocs = [];
      var removedDocs = [];
      query.addObserver({
        added: function(doc) {
          addedDocs.push(doc);
        },
        removed: function(id) {
          removedDocs.push(id);
        }
      });

      Meteor.setTimeout(function() {
        query.added({_id: 'one', aa: "aa"});
        query.added({_id: 'two', aa: "aa"});
        query.added({_id: 'three', aa: "aa"});
        query.added({_id: 'four', aa: "aa"});
      }, 50);

      setTimeout(function() {
        emit('return', [addedDocs, removedDocs]);
      }, 100);
    });
    assert.deepEqual(results, [
      [
        {_id: 'one', aa: "aa"}, {_id: 'two', aa: "aa"}, 
        {_id: 'three', aa: "aa"}
      ],
      []
    ]);
    done();
  });

  test('snapshot, remove', function(done, server) {
    var results = server.evalSync(function() {
      coll = new Meteor.SmartCollection('coll');
      query = new Meteor.SmartQuery(coll, {}, {limit: 3});

      coll.insert({_id: 'one', aa: "aa"});
      coll.insert({_id: 'two', aa: "aa"});
      coll.insert({_id: 'three', aa: "aa"});
      coll.insert({_id: 'four', aa: "aa"});

      var addedDocs = [];
      var removedDocs = [];
      var changedDocs = [];
      query.addObserver({
        added: function(doc) {
          addedDocs.push(doc._id);
        },
        removed: function(id) {
          removedDocs.push(id);
        },
        changed: function(id, fields) {
          changedDocs.push(id);
        }
      });

      Meteor.setTimeout(function() {
        coll.remove({_id: 'two'});
        query.removed('two');
      }, 50);

      setTimeout(function() {
        emit('return', [addedDocs, removedDocs, changedDocs]);
      }, 100);
    });
    assert.deepEqual(results, [
      ['one', 'two', 'three', 'four'],
      ['two'],
      ['one', 'three']
    ]);
    done();
  });

  test('snapshot, remove twice', function(done, server) {
    var results = server.evalSync(function() {
      coll = new Meteor.SmartCollection('coll');
      query = new Meteor.SmartQuery(coll, {}, {limit: 3});

      coll.insert({_id: 'one', aa: "aa"});
      coll.insert({_id: 'two', aa: "aa"});
      coll.insert({_id: 'three', aa: "aa"});
      coll.insert({_id: 'four', aa: "aa"});

      var addedDocs = [];
      var removedDocs = [];
      var changedDocs = [];
      query.addObserver({
        added: function(doc) {
          addedDocs.push(doc._id);
        },
        removed: function(id) {
          removedDocs.push(id);
        },
        changed: function(id, fields) {
          changedDocs.push(id);
        }
      });

      Meteor.setTimeout(function() {
        coll.remove({_id: 'two'});
        query.removed('two');
        coll.remove({_id: 'three'});
        query.removed('three');
      }, 50);

      Meteor.setTimeout(function() {
        coll.remove({_id: 'three'});
        query.removed('three');
      }, 100);

      setTimeout(function() {
        emit('return', [addedDocs, removedDocs, changedDocs]);
      }, 150);
    });
    assert.deepEqual(results, [
      ['one', 'two', 'three', 'four'],
      ['two', 'three'],
      ['one', 'three', 'one', 'four']
    ]);
    done();
  });

  test('snapshot, remove twice, added later', function(done, server) {
    var results = server.evalSync(function() {
      coll = new Meteor.SmartCollection('coll');
      query = new Meteor.SmartQuery(coll, {}, {limit: 3});

      coll.insert({_id: 'one', aa: "aa"});
      coll.insert({_id: 'two', aa: "aa"});
      coll.insert({_id: 'three', aa: "aa"});
      coll.insert({_id: 'four', aa: "aa"});

      var addedDocs = [];
      var removedDocs = [];
      var changedDocs = [];
      query.addObserver({
        added: function(doc) {
          addedDocs.push(doc._id);
        },
        removed: function(id) {
          removedDocs.push(id);
        },
        changed: function(id, fields) {
          changedDocs.push(id);
        }
      });

      Meteor.setTimeout(function() {
        coll.remove({_id: 'two'});
        query.removed('two');
        coll.remove({_id: 'three'});
        query.removed('three');
      }, 50);

      Meteor.setTimeout(function() {
        coll.remove({_id: 'three'});
        query.removed('three');
      }, 100);

      Meteor.setTimeout(function() {
        coll.insert({_id: 'five', aa: 'aa'});
        query.added({_id: 'five', aa: 'aa'});
      }, 100);

      setTimeout(function() {
        emit('return', [addedDocs, removedDocs, changedDocs]);
      }, 150);
    });
    assert.deepEqual(results, [
      ['one', 'two', 'three', 'four', 'five'],
      ['two', 'three'],
      ['one', 'three', 'one', 'four']
    ]);
    done();
  });
});