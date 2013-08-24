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

      coll.remove({qq: 10});

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

      coll.insert({_id: '1', aa: "aa"});
      coll.insert({_id: '2', aa: "aa"});
      coll.insert({_id: '3', aa: "aa"});
      coll.insert({_id: '4', aa: "aa"});

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
        coll.remove({_id: '2'});
        query.removed('2');
      }, 50);

      setTimeout(function() {
        emit('return', [addedDocs.sort(), removedDocs.sort(), changedDocs.sort()]);
      }, 100);
    });
    assert.deepEqual(results, [
      ['1', '2', '3', '4'],
      ['2'],
      ['1', '3']
    ]);
    done();
  });

  test('snapshot, remove twice', function(done, server) {
    var results = server.evalSync(function() {
      coll = new Meteor.SmartCollection('coll');
      query = new Meteor.SmartQuery(coll, {}, {limit: 3});

      coll.insert({_id: '1', aa: "aa"});
      coll.insert({_id: '2', aa: "aa"});
      coll.insert({_id: '3', aa: "aa"});
      coll.insert({_id: '4', aa: "aa"});

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
        coll.remove({_id: '2'});
        query.removed('2');
      }, 50);

      Meteor.setTimeout(function() {
        coll.remove({_id: '3'});
        query.removed('3');
      }, 100);

      Meteor.setTimeout(function() {
        coll.remove({_id: '1'});
        query.removed('1');
      }, 150);

      setTimeout(function() {
        emit('return', [addedDocs, removedDocs]);
      }, 200);
    });
    assert.deepEqual(results, [
      ['1', '2', '3', '4'],
      ['2', '3', '1']
    ]);
    done();
  });

  test('snapshot, remove twice, added later', function(done, server) {
    var results = server.evalSync(function() {
      coll = new Meteor.SmartCollection('coll');
      query = new Meteor.SmartQuery(coll, {}, {limit: 3});

      coll.insert({_id: '1', aa: "aa"});
      coll.insert({_id: '2', aa: "aa"});
      coll.insert({_id: '3', aa: "aa"});
      coll.insert({_id: '4', aa: "aa"});

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
        coll.remove({_id: '2'});
        query.removed('2');
      }, 50);

      Meteor.setTimeout(function() {
        coll.remove({_id: '3'});
        query.removed('3');
      }, 50);

      Meteor.setTimeout(function() {
        coll.remove({_id: '1'});
        query.removed('1');
      }, 100);

      Meteor.setTimeout(function() {
        coll.insert({_id: '5', aa: 'aa'});
        query.added({_id: '5', aa: 'aa'});
      }, 100);

      setTimeout(function() {
        emit('return', [addedDocs, removedDocs]);
      }, 150);
    });
    assert.deepEqual(results, [
      ['1', '2', '3', '4', '5'],
      ['2', '3', '1']
    ]);
    done();
  });
});