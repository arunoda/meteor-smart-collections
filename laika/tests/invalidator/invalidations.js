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

        var invalidator = new Meteor.SmartInvalidator();
        invalidator.addCursor(cursor);
        invalidator.insert({_id: 1, aa: 10});
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

        var invalidator = new Meteor.SmartInvalidator();
        invalidator.addCursor(cursor);
        invalidator.insert({_id: 1, aa: 10});
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

        var invalidator = new Meteor.SmartInvalidator();
        invalidator.insert({_id: 1, aa: 10});
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

        var invalidator = new Meteor.SmartInvalidator();
        invalidator.addCursor(cursor);
        invalidator.remove(1);
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

        var invalidator = new Meteor.SmartInvalidator();
        invalidator.addCursor(cursor);
        invalidator.remove(1);
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

        var invalidator = new Meteor.SmartInvalidator();
        invalidator.remove(1);
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
        var id;
        var fields;

        var c1 = {
          _added: function(doc) { added = doc; },
          _selectorMatcher: function() { return false; },
          _idExists: function() { return false }
        };

        var c2 = {
          _changed: function(_id, _fields) { id = _id; fields = _fields; },
          _selectorMatcher: function() { return true; },
          _idExists: function() { return true }
        };

        var invalidator = new Meteor.SmartInvalidator(coll);
        invalidator.addCursor(c1);
        invalidator.addCursor(c2);

        invalidator.update(123, {$set: {aa: 10}}, function() {
          emit('return', [id, fields, added]);
        });
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
        var id;
        var fields;

        var c1 = {
          _added: function(doc) { added = doc; },
          _selectorMatcher: function() { return true; },
          _idExists: function() { return false }
        };

        var c2 = {
          _changed: function(_id, _fields) { id = _id; fields = _fields; },
          _selectorMatcher: function() { return true; },
          _idExists: function() { return true }
        };

        var invalidator = new Meteor.SmartInvalidator(coll);
        invalidator.addCursor(c1);
        invalidator.addCursor(c2);

        invalidator.update(123, {$set: {aa: 10}}, function() {
          emit('return', [id, fields, added]);
        });
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
        var id;
        var fields;
        var c1 = {
          _removed: function(id) { removed = id; },
          _selectorMatcher: function() { return false; },
          _idExists: function() { return !removed }
        };

        var c2 = {
          _changed: function(_id, _fields) { id = _id; fields = _fields; },
          _selectorMatcher: function() { return true; },
          _idExists: function() { return true }
        };

        var invalidator = new Meteor.SmartInvalidator(coll);
        invalidator.addCursor(c1);
        invalidator.addCursor(c2);

        invalidator.update(123, {$set: {aa: 10}}, function() {
          emit('return', [id, fields, removed]);
        });
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

        var invalidator = new Meteor.SmartInvalidator(coll);
        
        invalidator.addCursor(c1);
        invalidator.addCursor(c2);

        invalidator.multiUpdate({aa: 10}, {$inc: {bb: 10}}, function() {
          emit('done');
        });
      });

      server.on('added', function() {
        assert.fail('should not add anything');
      }); 

      var results = {};
      server.on('changed', function(id, fields) {
        results[id] = fields;
      });

      server.on('done', function() {
        assert.deepEqual(results, {
          "123": {bb: 20},
          "124": {bb: 30}
        });
        done();
      });
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

        var invalidator = new Meteor.SmartInvalidator(coll);
        
        invalidator.addCursor(c1);
        invalidator.addCursor(c2);

        invalidator.multiUpdate({aa: 10}, {$inc: {bb: 10}}, function() {
          emit('done');
        });
      });

      var added = {};
      server.on('added', function(doc) {
        added[doc._id] = doc;
      }); 

      var changed = {};
      server.on('changed', function(id, fields) {
        changed[id] = fields;
      });

      server.on('done', function() {
        assert.deepEqual(added, {
          "123": {_id: 123, aa: 10, bb: 20},
          "124": {_id: 124, aa: 10, bb: 30}
        });
        assert.deepEqual(changed, {
          "123": {bb: 20},
          "124": {bb: 30}
        });
        done();
      });
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

        var invalidator = new Meteor.SmartInvalidator(coll);
        
        invalidator.addCursor(c1);
        invalidator.addCursor(c2);

        invalidator.multiUpdate({aa: 10}, {$inc: {bb: 10}}, function() {
          emit('done');
        });
      });

      var removed = [];
      server.on('removed', function(id) {
        removed.push(id);
      }); 

      var changed = {};
      server.on('changed', function(id, fields) {
        changed[id] = fields;
      });

      server.on('done', function() {
        assert.deepEqual(removed, [123, 124]);
        assert.deepEqual(changed, {
          "123": {bb: 20},
          "124": {bb: 30}
        });
        done();
      });
    });
  });

  suite('multiRemove', function() {
    test('trigger cursor', function(done, server) {
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
              coll._collection.insert({_id: 125, aa: 1, bb: 30},function(err) {
                emit('return', err);
              });
            });
          });
        }
      });
      assert.equal(error, undefined);

      var ids = server.evalSync(function() {
        var ids;
        var c1 = {
          _selector: {aa: 10},
          _computeAndNotifyRemoved: function(_ids) {
            ids = _ids;
          }
        };

        var invalidator = new Meteor.SmartInvalidator(coll);
        invalidator.addCursor(c1);
        invalidator.multiRemove({aa: 10}, function() {
          emit('return', ids);
        });
      });

      assert.deepEqual(ids, [123, 124]);
      done();
    });
  });
}); 