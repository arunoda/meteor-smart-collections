var assert = require('assert');

suite('Query - Callback', function() {
  test('callback fires', function(done, server) {
    server.evalSync(function() {
      coll = new Meteor.SmartCollection('coll');
      query = new Meteor.SmartQuery(coll, {});

      coll.remove({tt: 0});

      query.snapshot(function() {
        emit('return');
      });
    });
    done();
  });

  test('callback fires', function(done, server) {
    var result = server.evalSync(function() {
      coll = new Meteor.SmartCollection('coll');
      query = new Meteor.SmartQuery(coll, {});

      coll.remove({tt: 0});

      var callbacks = [];
      var states = [];
      states.push(query.snapshotInProgress);
      query.snapshot(function() { callbacks.push(1); });
      states.push(query.snapshotInProgress);
      query.snapshot(function() { callbacks.push(2); });
      states.push(query.snapshotInProgress);
      query.snapshot(function() { callbacks.push(3); });
      states.push(query.snapshotInProgress);

      setTimeout(function() {
        states.push(query.snapshotInProgress);
        emit('return', [callbacks, states]);
      }, 50);
    });

    assert.deepEqual(result, [
      [1, 2, 3],
      [false, true, true, true, false]
    ]);
    done();
  });
});