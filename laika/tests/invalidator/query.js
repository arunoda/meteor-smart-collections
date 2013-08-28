var assert = require('assert');

suite('Invalidator - Query', function() {
  test('single query', function(done, server) {
    var results = server.evalSync(function() {
      var coll = {dumb: true};
      var invalidator = new Meteor.SmartInvalidator(coll);
      var query = invalidator.initiateQuery({aa: 10});
      var query2 = invalidator.initiateQuery({aa: 10});

      var same = query == query2;
      emit('return', [same, invalidator._queryInfoList.length]);
    });

    assert.deepEqual(results, [true, 1]);
    done();
  });

  test('two queries', function(done, server) {
    var results = server.evalSync(function() {
      var coll = {dumb: true};
      var invalidator = new Meteor.SmartInvalidator(coll);
      var query = invalidator.initiateQuery({aa: 10});
      var queryTwo = invalidator.initiateQuery({aa: 20});
      var query2 = invalidator.initiateQuery({aa: 10});

      var same = query == query2;
      emit('return', [same, invalidator._queryInfoList.length]);
    });

    assert.deepEqual(results, [true, 2]);
    done();
  });

  test('with sort', function(done, server) {
    var results = server.evalSync(function() {
      var coll = {dumb: true};
      var invalidator = new Meteor.SmartInvalidator(coll);
      var query = invalidator.initiateQuery({aa: 10}, {sort: {aa: 1}});
      var query2 = invalidator.initiateQuery({aa: 10}, {sort: {aa: 1}});

      var same = query == query2;
      emit('return', [same, invalidator._queryInfoList.length]);
    });

    assert.deepEqual(results, [true, 1]);
    done();
  });

  test('with limit', function(done, server) {
    var results = server.evalSync(function() {
      var coll = {dumb: true};
      var invalidator = new Meteor.SmartInvalidator(coll);
      var query = invalidator.initiateQuery({aa: 10}, {sort: {aa: 1}, limit: 2});
      var query2 = invalidator.initiateQuery({aa: 10}, {sort: {aa: 1}, limit: 2});

      var same = query == query2;
      emit('return', [same, invalidator._queryInfoList.length]);
    });

    assert.deepEqual(results, [true, 1]);
    done();
  });
});