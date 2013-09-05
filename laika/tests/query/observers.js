var assert = require('assert');

suite('Query - Observers', function() {
  test('added', function(done, server) {
    var results = server.evalSync(function() {
      coll = new Meteor.SmartCollection('coll');
      query = new Meteor.SmartQuery(coll, {aa: '_aa'});

      coll.insert({_id: 'one', aa: '_aa'});
      coll.insert({_id: 'two', bb: '_aa'});

      var addedDocs = [];
      query.addObserver({
        added: function(doc) {
          addedDocs.push(doc);
        }
      });

      setTimeout(function() {
        emit('return', [addedDocs]);
      }, 20);
    });

    assert.deepEqual(results, [
      [{_id: 'one', aa: '_aa'}]
    ]);
    done();
  });

  test('changed', function(done, server) {
    var results = server.evalSync(function() {
      coll = new Meteor.SmartCollection('coll');
      query = new Meteor.SmartQuery(coll, {aa: '_aa'});

      coll.insert({_id: 'one', aa: '_aa'});
      coll.insert({_id: 'two', bb: '_aa'});

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

      setTimeout(function() {
        coll.update({_id: 'one'}, {$set: {bb: '20'}});
        query.snapshot();
      }, 50);

      setTimeout(function() {
        emit('return', [addedDocs, changedDocs]);
      }, 100);
    });

    assert.deepEqual(results, [
      [{_id: 'one', aa: '_aa'}],
      [['one', {aa: '_aa', bb: '20'}]]
    ]);
    done();
  });

  test('removed', function(done, server) {
    var results = server.evalSync(function() {
      coll = new Meteor.SmartCollection('coll');
      query = new Meteor.SmartQuery(coll, {aa: '_aa'});

      coll.insert({_id: 'one', aa: '_aa'});
      coll.insert({_id: 'two', bb: '_aa'});

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
        coll.remove({_id: 'one'});
        query.snapshot();
      }, 50);

      setTimeout(function() {
        emit('return', [addedDocs, removedDocs]);
      }, 100);
    });

    assert.deepEqual(results, [
      [{_id: 'one', aa: '_aa'}],
      ['one']
    ]);
    done();
  });

  suite('.addObserver', function() {
    test('no previous snapshot', function(done, server) {
      var results = server.evalSync(function() {
        coll = new Meteor.SmartCollection('coll');
        query = new Meteor.SmartQuery(coll, {aa: '_aa'});

        coll.insert({_id: 'one', aa: '_aa'});
        coll.insert({_id: 'two', bb: '_aa'});

        var addedDocs = [];
        query.addObserver({
          added: function(doc) {
            addedDocs.push(doc);
          }
        });

        setTimeout(function() {
          emit('return', [addedDocs]);
        }, 20);
      });

      assert.deepEqual(results, [
        [{_id: 'one', aa: '_aa'}]
      ]);
      done();
    });

    test('snapshot in progress', function(done, server) {
      var results = server.evalSync(function() {
        coll = new Meteor.SmartCollection('coll');
        query = new Meteor.SmartQuery(coll, {aa: '_aa'});

        coll.insert({_id: 'one', aa: '_aa'});
        coll.insert({_id: 'two', bb: '_aa'});

        query.snapshot();

        var addedDocs = [];
        query.addObserver({
          added: function(doc) {
            addedDocs.push(doc);
          }
        });

        setTimeout(function() {
          emit('return', [addedDocs]);
        }, 20);
      });

      assert.deepEqual(results, [
        [{_id: 'one', aa: '_aa'}]
      ]);
      done();
    })

    test('have previous snapshots', function(done, server) {
      var results = server.evalSync(function() {
        coll = new Meteor.SmartCollection('coll');
        query = new Meteor.SmartQuery(coll, {aa: '_aa'});

        coll.insert({_id: 'one', aa: '_aa'});
        coll.insert({_id: 'two', bb: '_aa'});

        query.snapshot(Meteor.bindEnvironment(function() {
          var addedDocs = [];
          query.addObserver({
            added: function(doc) {
              addedDocs.push(doc);
            }
          });

          setTimeout(function() {
            emit('return', [addedDocs]);
          }, 20);
        }, function(err) {
          throw errl
        }));
        
      });

      assert.deepEqual(results, [
        [{_id: 'one', aa: '_aa'}]
      ]);
      done();
    })
  });
});