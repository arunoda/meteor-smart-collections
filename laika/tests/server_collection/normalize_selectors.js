var assert = require('assert');

suite('Normalize Selectors', function() {
  test('null', function(done, server) {
    var result = server.evalSync(function() {
      coll = new Meteor.SmartCollection('coll');
      var rtn = coll._normalizeSelector(null);
      emit('return', rtn);
    });

    assert.deepEqual(result, {});
    done();
  });

  test('string', function(done, server) {
    var result = server.evalSync(function() {
      coll = new Meteor.SmartCollection('coll');
      var rtn = coll._normalizeSelector('ddd');
      emit('return', rtn);
    });

    assert.deepEqual(result, {_id: 'ddd'});
    done();
  });

  test('object', function(done, server) {
    var result = server.evalSync(function() {
      coll = new Meteor.SmartCollection('coll');
      var rtn = coll._normalizeSelector({aa: 20});
      emit('return', rtn);
    });

    assert.deepEqual(result, {aa: 20});
    done();
  });

  test('number', function(done, server) {
    server.evalSyncExpectError(function() {
      coll = new Meteor.SmartCollection('coll');
      var rtn = coll._normalizeSelector(10);
      emit('return', rtn);
    });

    done();
  });

  test('function', function(done, server) {
    var result = server.evalSync(function() {
      coll = new Meteor.SmartCollection('coll');
      var rtn = coll._normalizeSelector(function() {});
      emit('return', typeof(rtn));
    });

    assert.equal(result, 'function');
    done();
  });
});