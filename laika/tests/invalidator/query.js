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

  test('with fields', function(done, server) {
    var results = server.evalSync(function() {
      var coll = {dumb: true};
      var invalidator = new Meteor.SmartInvalidator(coll);
      var query = invalidator.initiateQuery({aa: 10}, { fields: {a: 1}});
      var query2 = invalidator.initiateQuery({aa: 10}, { fields: {a: 1}});

      var same = query == query2;
      emit('return', [same, invalidator._queryInfoList.length]);
    });

    assert.deepEqual(results, [true, 1]);
    done();
  });

  test('with diff fields', function(done, server) {
    var results = server.evalSync(function() {
      var coll = {dumb: true};
      var invalidator = new Meteor.SmartInvalidator(coll);
      var query = invalidator.initiateQuery({aa: 10}, { fields: {a: 1}});
      var query2 = invalidator.initiateQuery({aa: 10}, { fields: {a: 2}});

      var same = query == query2;
      emit('return', [same, invalidator._queryInfoList.length]);
    });

    assert.deepEqual(results, [false, 2]);
    done();
  });

  suite('._disposeEmptyQueries', function() {
    test('not disposing', function(done, server) {
      var results = server.evalSync(function() {
        var coll = new Meteor.SmartCollection('coll-here');
        var invalidator = new Meteor.SmartInvalidator(coll, {queryDisposeInterval: 100});
        var query = invalidator.initiateQuery({aa: 10});
        var queryTwo = invalidator.initiateQuery({aa: 20});
        var query2 = invalidator.initiateQuery({aa: 10});

        coll.remove({nothing: 'here'});
        query.addObserver({added: function() {}});

        setTimeout(function() {
          //initiating agaian to allow dispose
          invalidator.initiateQuery({aa: 10});
        }, 150);

        setTimeout(function() {
          emit('return', [invalidator._queryInfoList.length]);
        }, 200);
      });

      assert.deepEqual(results, [2]);
      done();
    });

    test('disposing', function(done, server) {
      var results = server.evalSync(function() {
        var coll = new Meteor.SmartCollection('coll-here');
        var invalidator = new Meteor.SmartInvalidator(coll, {queryDisposeInterval: 100});
        var query = invalidator.initiateQuery({aa: 10});
        var queryTwo = invalidator.initiateQuery({aa: 20});
        var query2 = invalidator.initiateQuery({aa: 10});

        coll.remove({nothing: 'here'});
        //there need to be at least one snapshot to be disposed
        query._snapShotCount = 1;

        setTimeout(function() {
          //initiating agaian to allow dispose
          invalidator.initiateQuery({aa: 20});
        }, 150);

        setTimeout(function() {
          emit('return', [invalidator._queryInfoList.length]);
        }, 200);
      });

      assert.deepEqual(results, [1]);
      done();
    });

    // test('disposing for second time', function(done, server) {
    //   var results = server.evalSync(function() {
    //     var coll = new Meteor.SmartCollection('coll-here');
    //     var invalidator = new Meteor.SmartInvalidator(coll, {queryDisposeInterval: 100});
    //     var query = invalidator.initiateQuery({aa: 10});
    //     var queryTwo = invalidator.initiateQuery({aa: 20});
    //     var query2 = invalidator.initiateQuery({aa: 10});

    //     var observer = {added: function() {}};
    //     var results = [];

    //     coll.remove({nothing: 'here'});
    //     query.addObserver(observer);

    //     setTimeout(function() {
    //       //initiating agaian to allow dispose
    //       invalidator.initiateQuery({aa: 10});
    //     }, 150);

    //     setTimeout(function() {
    //       results.push(invalidator._queryInfoList.length);
    //       query.removeObserver(observer);
    //     }, 200);

    //     setTimeout(function() {
    //       //initiating agaian to allow dispose
    //       invalidator.initiateQuery({aa: 10});
    //     }, 300);

    //     setTimeout(function() {
    //       results.push(invalidator._queryInfoList.length);
    //       emit('return', results);
    //     }, 350);
    //   });

    //   assert.deepEqual(results, [1, 0]);
    //   done();
    // });
  });
});