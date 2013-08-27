var assert = require('assert');

suite('Invalidator - Invalidations', function() {
  suite('insert', function() {
    test('matched', function(done, server) {
      var doc = server.evalSync(function() {
        var coll = new Meteor.SmartCollection('coll');
        var invalidator = new Meteor.SmartInvalidator(coll);
        var query = invalidator.initiateQuery({aa: 10});

        coll.remove({noDoc: true});

        var observer = new Meteor.SmartObserver({
          added: function(id, doc) {
            doc._id = id;
            emit("return", doc);
          }
        });
        query.addObserver(observer);

        //wait a few secs while completing the first snapshot for the observe
        setTimeout(function() {
          invalidator.insert({_id: 1, aa: 10});
        }, 100);
      });

      assert.deepEqual(doc, {_id: 1, aa: 10});
      done();
    });

    test('not matched', function(done, server) {
      var doc = server.evalSync(function() {
        var coll = new Meteor.SmartCollection('coll');
        var invalidator = new Meteor.SmartInvalidator(coll);
        var query = invalidator.initiateQuery({aa: 10});

        coll.remove({noDoc: true});

        var doc;
        var observer = new Meteor.SmartObserver({
          added: function(id, _doc) {
            doc = _doc;
            doc._id = id;
          }
        });
        query.addObserver(observer);

        //wait a few secs while completing the first snapshot for the observe
        setTimeout(function() {
          invalidator.insert({_id: 1, aa: 20});
        }, 100);

        //wait a few secs while completing the first snapshot for the observe
        setTimeout(function() {
          emit('return', doc);
        }, 200);
      });

      assert.equal(doc, undefined);
      done();
    });

    test('no observer', function(done, server) {
      var doc = server.evalSync(function() {
        var coll = new Meteor.SmartCollection('coll');
        var invalidator = new Meteor.SmartInvalidator(coll);
        var query = invalidator.initiateQuery({aa: 10});

        coll.remove({noDoc: true});

        var doc;
        var observer = new Meteor.SmartObserver({
          added: function(id, _doc) {
            doc = _doc;
            doc._id = id;
          }
        });

        //wait a few secs while completing the first snapshot for the observe
        setTimeout(function() {
          invalidator.insert({_id: 1, aa: 20});
        }, 100);

        //wait a few secs while completing the first snapshot for the observe
        setTimeout(function() {
          emit('return', doc);
        }, 200);
      });

      assert.equal(doc, undefined);
      done();
    });
  });

  suite('remove', function() {
    test('matched', function(done, server) {
      var results = server.evalSync(function() {
        var coll = new Meteor.SmartCollection('coll');
        var invalidator = new Meteor.SmartInvalidator(coll);
        var query = invalidator.initiateQuery({aa: 10});

        coll.remove({noDoc: true});

        var doc;
        var removed;
        var observer = new Meteor.SmartObserver({
          added: function(id, _doc) {
            doc = _doc;
            doc._id = id;
          },
          removed: function(id) {
            removed = id;
          }
        });
        query.addObserver(observer);

        //wait a few secs while completing the first snapshot for the observe
        setTimeout(function() {
          invalidator.insert({_id: 'one', aa: 10});
          invalidator.remove('one');
        }, 100);

        //wait a few secs while completing the first snapshot for the observe
        setTimeout(function() {
          emit('return', [doc, removed]);
        }, 200);
      });

      assert.deepEqual(results, [{_id: 'one', aa: 10}, 'one']);
      done();
    });

    test('not matched', function(done, server) {
      var results = server.evalSync(function() {
        var coll = new Meteor.SmartCollection('coll');
        var invalidator = new Meteor.SmartInvalidator(coll);
        var query = invalidator.initiateQuery({aa: 10});

        coll.remove({noDoc: true});

        var doc;
        var removed;
        var observer = new Meteor.SmartObserver({
          added: function(id, _doc) {
            doc = _doc;
            doc._id = id;
          },
          removed: function(id) {
            removed = id;
          }
        });
        query.addObserver(observer);

        //wait a few secs while completing the first snapshot for the observe
        setTimeout(function() {
          invalidator.insert({_id: 'one', aa: 20});
          invalidator.remove('one');
        }, 100);

        //wait a few secs while completing the first snapshot for the observe
        setTimeout(function() {
          emit('return', [doc, removed]);
        }, 200);
      });

      assert.deepEqual(results, [null, null]);
      done();
    });

    test('no observe', function(done, server) {
      var results = server.evalSync(function() {
        var coll = new Meteor.SmartCollection('coll');
        var invalidator = new Meteor.SmartInvalidator(coll);
        var query = invalidator.initiateQuery({aa: 10});

        coll.remove({noDoc: true});

        var doc;
        var removed;
        var observer = new Meteor.SmartObserver({
          added: function(id, _doc) {
            doc = _doc;
            doc._id = id;
          },
          removed: function(id) {
            removed = id;
          }
        });

        //wait a few secs while completing the first snapshot for the observe
        setTimeout(function() {
          invalidator.insert({_id: 'one', aa: 10});
          invalidator.remove('one');
        }, 100);

        //wait a few secs while completing the first snapshot for the observe
        setTimeout(function() {
          emit('return', [doc, removed]);
        }, 200);
      });

      assert.deepEqual(results, [null, null]);
      done();
    });
  });

  suite('update', function() {
    test('matched', function(done, server) {
      var results = server.evalSync(function() {
        var coll = new Meteor.SmartCollection('coll');
        var invalidator = coll.invalidator;
        var query = invalidator.initiateQuery({aa: 10});

        //wait till collection to be loaded
        coll.remove({noDoc: true});

        var doc;
        var changes = [];
        var observer = new Meteor.SmartObserver({
          added: function(id, _doc) {
            doc = _doc;
            doc._id = id;
          },
          changed: function(id, fields) {
            changes.push([id, fields]);
          }
        });
        query.addObserver(observer);

        //wait a few secs while completing the first snapshot for the observe
        setTimeout(function() {
          coll.insert({_id: 'one', aa: 10, bb: 10});
          coll.update('one', {$set: {bb: 20}});
        }, 100);

        //wait a few secs while completing the first snapshot for the observe
        setTimeout(function() {
          emit('return', [doc, changes]);
        }, 200);
      });

      assert.deepEqual(results, [
        {_id: 'one', aa: 10, bb: 10},
        [['one', {bb: 20}]]
      ]);
      done();
    });

    test('not matched', function(done, server) {
      var results = server.evalSync(function() {
        var coll = new Meteor.SmartCollection('coll');
        var invalidator = coll.invalidator;
        var query = invalidator.initiateQuery({aa: 20});

        //wait till collection to be loaded
        coll.remove({noDoc: true});

        var doc;
        var changes = [];
        var observer = new Meteor.SmartObserver({
          added: function(id, _doc) {
            doc = _doc;
            doc._id = id;
          },
          changed: function(id, fields) {
            changes.push([id, fields]);
          }
        });
        query.addObserver(observer);

        //wait a few secs while completing the first snapshot for the observe
        setTimeout(function() {
          coll.insert({_id: 'one', aa: 10, bb: 10});
          coll.update('one', {$set: {bb: 20}});
        }, 100);

        //wait a few secs while completing the first snapshot for the observe
        setTimeout(function() {
          emit('return', [doc, changes]);
        }, 200);
      });

      assert.deepEqual(results, [null, []]);
      done();
    });

    test('no observer', function(done, server) {
      var results = server.evalSync(function() {
        var coll = new Meteor.SmartCollection('coll');
        var invalidator = coll.invalidator;
        var query = invalidator.initiateQuery({aa: 10});

        //wait till collection to be loaded
        coll.remove({noDoc: true});

        var doc;
        var changes = [];
        var observer = new Meteor.SmartObserver({
          added: function(id, _doc) {
            doc = _doc;
            doc._id = id;
          },
          changed: function(id, fields) {
            changes.push([id, fields]);
          }
        });
        // query.addObserver(observer);

        //wait a few secs while completing the first snapshot for the observe
        setTimeout(function() {
          coll.insert({_id: 'one', aa: 10, bb: 10});
          coll.update('one', {$set: {bb: 20}});
        }, 100);

        //wait a few secs while completing the first snapshot for the observe
        setTimeout(function() {
          emit('return', [doc, changes]);
        }, 200);
      });

      assert.deepEqual(results, [null, []]);
      done();
    });
  });

  suite('multiUpdate', function() {
    test('trigger changed', function(done, server) {
      server.evalSync(function() {
        coll = new Meteor.SmartCollection('sss');
        coll.insert({_id: '123', aa: 10, bb: 20});
        coll.insert({_id: '124', aa: 10, bb: 30});
        emit('return');
      });

      var rtn = server.eval(function() {
        var observer = new Meteor.SmartObserver({
          changed: function(id, fields) {
            emit('changed', id, fields);
          }
        });
        var query = coll.invalidator.initiateQuery({aa: 10});
        query.addObserver(observer);

        Meteor.setTimeout(function() {
          coll.update({aa: 10}, {$inc: {bb: 10}}, {multi: true});
        }, 50);
      });

      var results = {};
      server.on('changed', function(id, fields) {
        results[id] = fields;
      });

      setTimeout(function() {
        assert.deepEqual(results, {
          "123": {aa: 10, bb: 30},
          "124": {aa: 10, bb: 40}
        });
        done();
      }, 100);
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
          coll._collection.insert({_id: '123', aa: 10, bb: 20}, function(err) {
            coll._collection.insert({_id: '124', aa: 10, bb: 30}, function(err) {
              emit('return', err);
            });
          });
        }
      });
      assert.equal(error, undefined);

      var rtn = server.eval(function() {
        
        var observer = new Meteor.SmartObserver({
          added: function(id, doc) {
            emit('added', doc);
          },
          changed: function(id, fields) {
            emit('changed', id, fields);
          }
        });
        var query = coll.invalidator.initiateQuery({bb: {$gt: 25}});
        query.addObserver(observer);

        coll.update({}, {$inc: {bb: 10}}, {multi: true});
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
          "124": {_id: '124', aa: 10, bb: 30},
          "123": {_id: '123', aa: 10, bb: 30}
        });
        assert.deepEqual(changed, {
          "124": {aa: 10, bb: 40}
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
          coll._collection.insert({_id: '123', aa: 10, bb: 20}, function(err) {
            coll._collection.insert({_id: '124', aa: 10, bb: 30}, function(err) {
              emit('return', err);
            });
          });
        }
      });
      assert.equal(error, undefined);

      var rtn = server.eval(function() {
        
        var observer = new Meteor.SmartObserver({
          added: function(id, doc) {
            emit('added', doc);
          },
          changed: function(id, fields) {
            emit('changed', id, fields);
          },
          removed: function(id) {
            emit('removed', id);
          }
        });
        var query = coll.invalidator.initiateQuery({bb: {$gt: 25, $lt: 35}});
        query.addObserver(observer);

        coll.update({}, {$inc: {bb: 10}}, {multi: true});
      });

      var added = {};
      server.on('added', function(doc) {
        added[doc._id] = doc;
      }); 

      var changed = {};
      server.on('changed', function(id, fields) {
        changed[id] = fields;
      });

      var removed = {};
      server.on('removed', function(id) {
        removed[id] = true;
      });

      setTimeout(function() {
        assert.deepEqual(added, {
          "124": {_id: '124', aa: 10, bb: 30},
          "123": {_id: '123', aa: 10, bb: 30}
        });

        assert.deepEqual(changed, {});

        assert.deepEqual(removed, {
          "124": true
        });
        done();
      }, 50);
    });

    test('side effects', function(done, server) {
      var error = server.evalSync(function() {
        coll = new Meteor.SmartCollection('sss');
        if(coll._collection) {
          doInsert();
        } else {
          coll.once('ready', doInsert);
        }

        function doInsert() {
          coll._collection.insert({_id: "123", aa: 10, bb: 20}, function(err) {
            coll._collection.insert({_id: "124", aa: 10, bb: 30}, function(err) {
              emit('return', err);
            });
          });
        }
      });
      assert.equal(error, undefined);

      var rtn = server.eval(function() {
        
        var observer = new Meteor.SmartObserver({
          added: function(id, doc) {
            emit('added', doc);
          },
          changed: function(id, fields) {
            emit('changed', id, fields);
          }
        });
        var query = coll.invalidator.initiateQuery({_id: "123"});
        query.addObserver(observer);

        coll.update({aa: 10}, {$inc: {aa: 10}}, {multi: true});
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
          "123": {_id: 123, aa: 10, bb: 20}
        });
        assert.deepEqual(changed, {
          "123": {aa: 20, bb: 20}
        });
        done();
      }, 50);
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
          coll._collection.insert({_id: '123', aa: 10, bb: 20}, function(err) {
            coll._collection.insert({_id: '124', aa: 10, bb: 30}, function(err) {
              coll._collection.insert({_id: '125', aa: 1, bb: 30},function(err) {
                emit('return', err);
              });
            });
          });
        }
      });
      assert.equal(error, undefined);

      server.eval(function() {
        var observer = new Meteor.SmartObserver({
          removed: function(id) {
            emit('removed', id);
          }
        });
        var query = coll.invalidator.initiateQuery({aa: 10});
        query.addObserver(observer);  

        coll.remove({aa: 10});
      });

      var removed = [];
      server.on('removed', function(id) {
        removed.push(id);
      });

      setTimeout(function() {
        assert.deepEqual(removed, [123, 124]);
        done();
      }, 50);
    });
  });
}); 