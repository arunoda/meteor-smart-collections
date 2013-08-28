var assert = require('assert');

suite('Query - Snapshots', function() {
  test('adding new observer', function(done, server) {
    var results = server.evalSync(function() {
      coll = new Meteor.SmartCollection('coll');
      query = new Meteor.SmartQuery(coll, {aa: '_aa'});

      coll.insert({_id: 'one', aa: '_aa'});
      coll.insert({_id: 'two', bb: '_aa'});

      var states = [query.snapshotInProgress];
      var addedDocs = [];
      query.addObserver({
        added: function(doc) {
          addedDocs.push(doc);
        }
      });
      states.push(query.snapshotInProgress);

      setTimeout(function() {
        states.push(query.snapshotInProgress);
        emit('return', [addedDocs, states]);
      }, 20);
    });

    assert.deepEqual(results, [
      [{_id: 'one', aa: '_aa'}],
      [false, true, false]
    ]);
    done();
  });

  test('adding new observer twice, once', function(done, server) {
    var results = server.evalSync(function() {
      coll = new Meteor.SmartCollection('coll');
      query = new Meteor.SmartQuery(coll, {aa: '_aa'});

      coll.insert({_id: 'one', aa: '_aa'});
      coll.insert({_id: 'two', bb: '_aa'});

      var states = [query.snapshotInProgress];
      var addedDocs1 = [];
      var changedDocs1 = [];
      query.addObserver({
        added: function(doc) {
          addedDocs1.push(doc);
        },
        changed: function(id, fields) {
          changedDocs1.push([id, fields]);
        }
      });
      var addedDocs2 = [];
      query.addObserver({
        added: function(doc) {
          addedDocs2.push(doc);
        }
      });
      states.push(query.snapshotInProgress);

      setTimeout(function() {
        states.push(query.snapshotInProgress);
        emit('return', [addedDocs1, changedDocs1, addedDocs2, states]);
      }, 20);
    });

    assert.deepEqual(results, [
      [{_id: 'one', aa: '_aa'}],
      [['one', {aa: '_aa'}]],
      [{_id: 'one', aa: '_aa'}],
      [false, true, false]
    ]);
    done();
  });

  test('adding new observer twice, later', function(done, server) {
    var results = server.evalSync(function() {
      coll = new Meteor.SmartCollection('coll');
      query = new Meteor.SmartQuery(coll, {aa: '_aa'});

      coll.insert({_id: 'one', aa: '_aa'});
      coll.insert({_id: 'two', bb: '_aa'});

      var states = [query.snapshotInProgress];
      var addedDocs1 = [];
      var addedDocs2 = [];
      var changedDocs1 = [];
      query.addObserver({
        added: function(doc) {
          addedDocs1.push(doc);
        },
        changed: function(id, fields) {
          changedDocs1.push([id, fields]);
        }
      });
      states.push(query.snapshotInProgress);

      setTimeout(function() {
        states.push(query.snapshotInProgress);
        query.addObserver({
          added: function(doc) {
            addedDocs2.push(doc);
          }
        });
        states.push(query.snapshotInProgress);
      }, 50);

      setTimeout(function() {
        states.push(query.snapshotInProgress);
        emit('return', [addedDocs1, addedDocs2, changedDocs1, states]);
      }, 100);
    });

    assert.deepEqual(results, [
      [{_id: 'one', aa: '_aa'}],
      [{_id: 'one', aa: '_aa'}],
      [['one', {aa: '_aa'}]],
      [false, true, false, true, false]
    ]);
    done();
  });

  test('snapshot later', function(done, server) {
    var results = server.evalSync(function() {
      coll = new Meteor.SmartCollection('coll');
      query = new Meteor.SmartQuery(coll, {aa: '_aa'});

      coll.insert({_id: 'one', aa: '_aa'});
      coll.insert({_id: 'two', bb: '_aa'});

      var states = [query.snapshotInProgress];
      var addedDocs = [];
      var changedDocs = [];

      query.addObserver({
        added: function(doc) {
          addedDocs.push(doc);
        },
        changed: function(id, fields) {
          changedDocs.push([id, fields]);
        }
      });
      states.push(query.snapshotInProgress);

      Meteor.setTimeout(function() {
        coll.insert({_id: 'three', aa: '_aa'});

        states.push(query.snapshotInProgress);
        query.snapshot();
        states.push(query.snapshotInProgress);
      }, 50);

      setTimeout(function() {
        states.push(query.snapshotInProgress);
        emit('return', [addedDocs, changedDocs, states]);
      }, 100);
    });

    assert.deepEqual(results, [
      [{_id: 'one', aa: '_aa'}, {_id: 'three', aa: '_aa'}],
      [['one', {aa: '_aa'}]],
      [false, true, false, true, false]
    ]);
    done();
  });
});