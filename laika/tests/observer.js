var assert = require('assert');

suite('Observer', function() {
  suite('changes', function() {
    test('added', function(done, server) {
      var added = server.evalSync(function() {
        var added = [];
        var callbacks = {
          added: function(id, doc) {
            added.push([id, doc]);
          }
        };
        observer = new Meteor.SmartObserver(callbacks);
        observer.added({_id: 'aa', aa: 10});

        setTimeout(function() {
          emit('return', added);
        }, 10);
      });

      assert.deepEqual(added, [['aa', {_id: 'aa', aa: 10}]]);
      done();
    });

    test('changed', function(done, server) {
      var changed = server.evalSync(function() {
        var changed = [];
        var callbacks = {
          changed: function(id, fields) {
            changed.push([id, fields]);
          }
        };
        observer = new Meteor.SmartObserver(callbacks);
        observer.changed('aa', {aa: 10});

        setTimeout(function() {
          emit('return', changed);
        }, 10);
      });

      assert.deepEqual(changed, [['aa', {aa: 10}]]);
      done();
    });

    test('removed', function(done, server) {
      var removed = server.evalSync(function() {
        var removed = [];
        var callbacks = {
          removed: function(id) {
            removed.push(id);
          }
        };
        observer = new Meteor.SmartObserver(callbacks);
        observer.removed('aa');

        setTimeout(function() {
          emit('return', removed);
        }, 10);
      });

      assert.deepEqual(removed, ['aa']);
      done();
    });
  });

  suite('field filtering', function() {
    test('added', function(done, server) {
      var added = server.evalSync(function() {
        var added = [];
        var callbacks = {
          added: function(id, doc) {
            added.push([id, doc]);
          }
        };
        var fields = Meteor.SmartCursor.prototype._compileFields({aa: 1});
        observer = new Meteor.SmartObserver(callbacks, fields);
        observer.added({_id: 'aa', aa: 10, bb: 20});

        setTimeout(function() {
          emit('return', added);
        }, 10);
      });

      assert.deepEqual(added, [['aa', {_id: 'aa', aa: 10}]]);
      done();
    });

    test('changed', function(done, server) {
      var changed = server.evalSync(function() {
        var changed = [];
        var callbacks = {
          changed: function(id, fields) {
            changed.push([id, fields]);
          }
        };

        var fields = Meteor.SmartCursor.prototype._compileFields({dd: 1});
        observer = new Meteor.SmartObserver(callbacks, fields);
        observer.changed('aa', {aa: 10, dd: 30});

        setTimeout(function() {
          emit('return', changed);
        }, 10);
      });

      assert.deepEqual(changed, [['aa', {dd: 30}]]);
      done();
    });    
  });
});