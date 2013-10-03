var assert = require('assert');
require('../../common');

suite('Projecor._compileFields', function() {
  test('with inclusion', function(done, server) {
    var info = server.evalSync(function() {
      var info = Meteor.SmartProjector.prototype._compileFields({aa: 1, bb: 1});
      emit('return', info);
    });

    assert.deepEqual(info, {
      include: ['aa', 'bb'],
      exclude: []
    });
    done();
  });

  test('with inclusion - wihtout _id', function(done, server) {
    var info = server.evalSync(function() {
      var info = Meteor.SmartProjector.prototype._compileFields({_id: 0, aa: 1, bb: 1});
      emit('return', info);
    });

    assert.deepEqual(info, {
      include: ['aa', 'bb'],
      exclude: ['_id']
    });
    done();
  });

  test('with exclusion', function(done, server) {
    var info = server.evalSync(function() {
      var info = Meteor.SmartProjector.prototype._compileFields({aa: 0, bb: 0});
      emit('return', info);
    });

    assert.deepEqual(info, {
      include: [],
      exclude: ['aa', 'bb']
    });
    done();
  });

  test('with both types', function(done, server) {
    var exception = server.evalSync(function() {
      try {
        var info = Meteor.SmartProjector.prototype._compileFields({aa: 0, bb: 0, cc: 1});
      } catch(ex) {
        emit('return', ex);
      }
      emit('return', null);
    });

    assert.ok(exception);
    done();
  });
});