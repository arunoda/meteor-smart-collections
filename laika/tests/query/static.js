var assert = require('assert');

suite('Query - Static', function() {
  test('with pending observer', function(done, server) {
    var count = server.evalSync(function() {
      coll = new Meteor.SmartCollection('coll');
      query = new Meteor.SmartQuery(coll, {});

      var afterSnapshotCallback;
      query.snapshot = function(callback) {
        afterSnapshotCallback = callback;
      };

      query.addObserver({});
      
      var rtn = {};
      rtn.pending = query.countObservers();
      afterSnapshotCallback();
      rtn.afterPending = query.countObservers();
      rtn.pendingObservers = query._pendingObservers.length;

      emit('return', rtn);
    });

    assert.deepEqual(count, {
      pending: 1,
      afterPending: 1,
      pendingObservers: 0
    });
    done();
  });
});