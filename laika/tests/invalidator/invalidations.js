var assert = require('assert');

suite('Invalidator - Invalidations', function() {
  suite('insert', function() {
    test('matched', function(done, server) {
      var doc = server.evalSync(function() {
        var cursor = {
          _added: function(doc) {
            emit('return', doc);
          },
          _selectorMatcher: function() {
            return true;
          }
        };

        Meteor.SmartInvalidator.addCursor('col1', cursor);
        Meteor.SmartInvalidator.invalidateInsert('col1', {_id: 1, aa: 10});
      });

      assert.deepEqual(doc, {_id: 1, aa: 10});
      done();
    });

    test('not matched', function(done, server) {
      var doc = server.evalSync(function() {
        var received;
        var cursor = {
          _added: function(doc) {
            received = doc;
          },
          _selectorMatcher: function() {
            return false;
          }
        };

        Meteor.SmartInvalidator.addCursor('col1', cursor);
        Meteor.SmartInvalidator.invalidateInsert('col1', {_id: 1, aa: 10});
        emit('return', received)
      });

      assert.equal(doc, undefined);
      done();
    });

    test('no cursor', function(done, server) {
      var doc = server.evalSync(function() {
        var received;
        var cursor = {
          _added: function(doc) {
            received = doc;
          },
          _selectorMatcher: function() {
            return true;
          }
        };

        Meteor.SmartInvalidator.invalidateInsert('col1', {_id: 1, aa: 10});
        emit('return', received)
      });

      assert.equal(doc, undefined);
      done();
    });
  });

  suite('remove', function() {
    test('matched', function(done, server) {
      var id = server.evalSync(function() {
        var cursor = {
          _removed: function(id) {
            emit('return', id);
          },
          _idExists: function() {
            return true;
          }
        };

        Meteor.SmartInvalidator.addCursor('col1', cursor);
        Meteor.SmartInvalidator.invalidateRemove('col1', 1);
      });

      assert.equal(id, 1);
      done();
    });

    test('not matched', function(done, server) {
      var id = server.evalSync(function() {
        var received;
        var cursor = {
          _removed: function(id) {
            received = id;
          },
          _idExists: function() {
            return false;
          }
        };

        Meteor.SmartInvalidator.addCursor('col1', cursor);
        Meteor.SmartInvalidator.invalidateRemove('col1', 1);
        emit('return', received);
      });

      assert.equal(id, undefined);
      done();
    });

    test('no cursor', function(done, server) {
      var id = server.evalSync(function() {
        var received;
        var cursor = {
          _removed: function(id) {
            received = id;
          },
          _idExists: function() {
            return true;
          }
        };

        Meteor.SmartInvalidator.invalidateRemove('col1', 1);
        emit('return', received);
      });

      assert.equal(id, undefined);
      done();
    });
  });

  suite('update', function() {
    test('trigger changed', function(done, server) {
      var error = server.evalSync(function() {
        coll = new Meteor.SmartCollection('sss');
        if(coll._collection) {
          doInsert();
        } else {
          coll.once('ready', doInsert);
        }

        function doInsert() {
          coll._collection.insert({_id: 123, aa: 10, bb: 20}, function(err) {
            emit('return', err);
          });
        }
      });
      assert.equal(error, undefined);

      var rtn = server.evalSync(function() {
        var added;
        var c1 = {
          _added: function(doc) { added = doc; },
          _selectorMatcher: function() { return false; },
          _idExists: function() { return false }
        };

        var c2 = {
          _changed: function(id, fields) { emit('return', [id, fields, added]); },
          _selectorMatcher: function() { return true; },
          _idExists: function() { return true }
        };

        Meteor.SmartInvalidator.registerCollection('sss', coll);
        Meteor.SmartInvalidator.addCursor('sss', c1);
        Meteor.SmartInvalidator.addCursor('sss', c2);

        Meteor.SmartInvalidator.invalidateUpdate('sss', 123, {$set: {aa: 10}});
      });

      assert.deepEqual(rtn, [123, {aa: 10}, null]);
      done();
    });

    test('trigger changed and added', function(done, server) {
      var error = server.evalSync(function() {
        coll = new Meteor.SmartCollection('sss');
        if(coll._collection) {
          doInsert();
        } else {
          coll.once('ready', doInsert);
        }

        function doInsert() {
          coll._collection.insert({_id: 123, aa: 10, bb: 20}, function(err) {
            emit('return', err);
          });
        }
      });
      assert.equal(error, undefined);

      var rtn = server.evalSync(function() {
        var added;
        var c1 = {
          _added: function(doc) { added = doc; },
          _selectorMatcher: function() { return true; },
          _idExists: function() { return false }
        };

        var c2 = {
          _changed: function(id, fields) { emit('return', [id, fields, added]); },
          _selectorMatcher: function() { return true; },
          _idExists: function() { return true }
        };

        Meteor.SmartInvalidator.registerCollection('sss', coll);
        Meteor.SmartInvalidator.addCursor('sss', c1);
        Meteor.SmartInvalidator.addCursor('sss', c2);

        Meteor.SmartInvalidator.invalidateUpdate('sss', 123, {$set: {aa: 10}});
      });

      assert.deepEqual(rtn, [123, {aa: 10}, {_id: 123, aa: 10, bb: 20}]);
      done();
    });

    test('trigger changed and removed', function(done, server) {
      var error = server.evalSync(function() {
        coll = new Meteor.SmartCollection('sss');
        if(coll._collection) {
          doInsert();
        } else {
          coll.once('ready', doInsert);
        }

        function doInsert() {
          coll._collection.insert({_id: 123, aa: 10, bb: 20}, function(err) {
            emit('return', err);
          });
        }
      });
      assert.equal(error, undefined);

      var rtn = server.evalSync(function() {
        var removed;
        var c1 = {
          _removed: function(id) { removed = id; },
          _selectorMatcher: function() { return false; },
          _idExists: function() { return !removed }
        };

        var c2 = {
          _changed: function(id, fields) { emit('return', [id, fields, removed]); },
          _selectorMatcher: function() { return true; },
          _idExists: function() { return true }
        };

        Meteor.SmartInvalidator.registerCollection('sss', coll);
        Meteor.SmartInvalidator.addCursor('sss', c1);
        Meteor.SmartInvalidator.addCursor('sss', c2);

        Meteor.SmartInvalidator.invalidateUpdate('sss', 123, {$set: {aa: 10}});
      });

      assert.deepEqual(rtn, [123, {aa: 10}, 123]);
      done();
    });
  });

  suite('multiUpdate', function() {
    test('trigger changed', function(done, server) {
      var error = server.evalSync(function() {
        coll = new Meteor.SmartCollection('sss');
        if(coll._collection) {
          doInsert();
        } else {
          coll.once('ready', doInsert);
        }

        function doInsert() {
          coll._collection.insert({_id: 123, aa: 10, bb: 20}, function(err) {
            coll._collection.insert({_id: 124, aa: 10, bb: 30}, function(err) {
              emit('return', err);
            });
          });
        }
      });
      assert.equal(error, undefined);

      var rtn = server.eval(function() {
        var c1 = {
          _added: function(doc) { emit('added', doc) },
          _selectorMatcher: function() { return false; },
          _idExists: function() { return false }
        };

        var c2 = {
          _changed: function(id, fields) { emit('changed', id, fields); },
          _selectorMatcher: function() { return true; },
          _idExists: function() { return true }
        };

        Meteor.SmartInvalidator.registerCollection('sss', coll);
        Meteor.SmartInvalidator.addCursor('sss', c1);
        Meteor.SmartInvalidator.addCursor('sss', c2);

        Meteor.SmartInvalidator.invalidateMultiUpdate('sss', {aa: 10}, {$inc: {bb: 10}});
      });

      server.on('added', function() {
        assert.fail('should not add anything');
      }); 

      var results = {};
      server.on('changed', function(id, fields) {
        results[id] = fields;
      });

      setTimeout(function() {
        assert.deepEqual(results, {
          "123": {bb: 20},
          "124": {bb: 30}
        });
        done();
      }, 50);
    });

    test('trigger changed and added', function(done, server) {
      var error = server.evalSync(function() {
        coll = new Meteor.SmartCollection('sss');
        if(coll._collection) {
          doInsert();
        } else {
          coll.once('ready', doInsert);
        }

        function doInsert() {
          coll._collection.insert({_id: 123, aa: 10, bb: 20}, function(err) {
            coll._collection.insert({_id: 124, aa: 10, bb: 30}, function(err) {
              emit('return', err);
            });
          });
        }
      });
      assert.equal(error, undefined);

      var rtn = server.eval(function() {
        var c1 = {
          _added: function(doc) { emit('added', doc) },
          _selectorMatcher: function() { return true; },
          _idExists: function() { return false }
        };

        var c2 = {
          _changed: function(id, fields) { emit('changed', id, fields); },
          _selectorMatcher: function() { return true; },
          _idExists: function() { return true }
        };

        Meteor.SmartInvalidator.registerCollection('sss', coll);
        Meteor.SmartInvalidator.addCursor('sss', c1);
        Meteor.SmartInvalidator.addCursor('sss', c2);

        Meteor.SmartInvalidator.invalidateMultiUpdate('sss', {aa: 10}, {$inc: {bb: 10}});
      });

      var added = {};
      server.on('added', function(doc) {
        added[doc._id] = doc;
      }); 

      var changed = {};
      server.on('changed', function(id, fields) {
        changed[id] = fields;
      });

      setTimeout(function() {
        assert.deepEqual(added, {
          "123": {_id: 123, aa: 10, bb: 20},
          "124": {_id: 124, aa: 10, bb: 30}
        });
        assert.deepEqual(changed, {
          "123": {bb: 20},
          "124": {bb: 30}
        });
        done();
      }, 50);
    });

    test('trigger changed and removed', function(done, server) {
      var error = server.evalSync(function() {
        coll = new Meteor.SmartCollection('sss');
        if(coll._collection) {
          doInsert();
        } else {
          coll.once('ready', doInsert);
        }

        function doInsert() {
          coll._collection.insert({_id: 123, aa: 10, bb: 20}, function(err) {
            coll._collection.insert({_id: 124, aa: 10, bb: 30}, function(err) {
              emit('return', err);
            });
          });
        }
      });
      assert.equal(error, undefined);

      var rtn = server.eval(function() {
        var removed = {};
        var c1 = {
          _removed: function(id) { emit('removed', id); removed[id] = true; },
          _selectorMatcher: function() { return false; },
          _idExists: function(id) { 
            return !removed[id];
          }
        };

        var c2 = {
          _changed: function(id, fields) { emit('changed', id, fields); },
          _selectorMatcher: function() { return true; },
          _idExists: function() { return true }
        };

        Meteor.SmartInvalidator.registerCollection('sss', coll);
        Meteor.SmartInvalidator.addCursor('sss', c1);
        Meteor.SmartInvalidator.addCursor('sss', c2);

        Meteor.SmartInvalidator.invalidateMultiUpdate('sss', {aa: 10}, {$inc: {bb: 10}});
      });

      var removed = [];
      server.on('removed', function(id) {
        removed.push(id);
      }); 

      var changed = {};
      server.on('changed', function(id, fields) {
        changed[id] = fields;
      });

      setTimeout(function() {
        assert.deepEqual(removed, [123, 124]);
        assert.deepEqual(changed, {
          "123": {bb: 20},
          "124": {bb: 30}
        });
        done();
      }, 50);
    });
  });
}); 