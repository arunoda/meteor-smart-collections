var assert = require('assert');

createCollWithData = function(data) {
  var Fibers = Npm.require('fibers');
  Fibers(function() {
    coll = new Meteor.SmartCollection('abc');
    for(var lc =0; lc<data.length; lc++) {
      coll.insert(data[lc]);
    }
    emit('return');
  }).run();
}

suite('Cursor - .observeChanges()', function() {
  test('listen for added event - just cursor results', function(done, server) {
    var data = [{_id: 1, a: 10}, {_id: 2, b: 30}];
    server.evalSync(createCollWithData, data);
    
    server.eval(function() {
      Fibers(function() {
        cursor = coll.find();
        cursor.observeChanges({
          added: function(id, item) {
            emit('added', id, item);
          }
        });
        emit('done');
      }).run();
    });

    var received = [];
    server.on('added', function(id, item) {
      item._id = id;
      received.push(item);
    });

    server.on('done', function() {
      assert.deepEqual(received, data);
      done();
    });
  });

  test('just cursor results - with fibers', function(done, server) {
    var data = [{_id: 1, a: 10}, {_id: 2, b: 30}];
    server.evalSync(createCollWithData, data);
    
    var received = server.evalSync(function() {
      var Fibers = Npm.require('fibers');
      Fibers(function() {
        cursor = coll.find();
        var received = [];
        cursor.observeChanges({
          added: function(id, item) {
            item._id = id;
            received.push(item);
          }
        });
        emit('return', received);
      }).run();
    });

    assert.deepEqual(received, data);
    done();
  });

  test('just cursor results - with a used cursor', function(done, server) {
    var data = [{_id: 1, a: 10}, {_id: 2, b: 30}];
    server.evalSync(createCollWithData, data);
    
    server.evalSync(function() {
      cursor = coll.find();
      cursor.fetch(function() {
        emit('return');
      })
    });
    
    var received = server.evalSync(function() {
      var Fibers = Npm.require('fibers');
      Fibers(function() {
        var received = [];
        cursor.observeChanges({
          added: function(id, item) {
            item._id = id;
            received.push(item);
          }
        });
        emit('return', received);
      }).run();
    });

    assert.deepEqual(received, data);
    done();
  });

  test('adding cursor to Invalidator', function(done, server) {
    var data = [{_id: 1, a: 10}, {_id: 2, b: 30}];
    server.evalSync(createCollWithData, data);
    
    var same = server.evalSync(function() {
      var Fibers = Npm.require('fibers');
      Fibers(function() {
        cursor = coll.find();
        cursor.observeChanges({});
        
        var same = Meteor.SmartInvalidator._cursors[coll.name][0] == cursor;
        emit('return', same);
      }).run();
    });

    assert.ok(same);
    done();
  });

  test('stop obeserving', function(done, server) {
    var data = [{_id: 1, a: 10}, {_id: 2, b: 30}];
    server.evalSync(createCollWithData, data);
    
    var status = server.evalSync(function() {
      var Fibers = Npm.require('fibers');
      Fibers(function() {
        cursor = coll.find();
        var status = [];
        var handler = cursor.observeChanges({});
        status.push(Meteor.SmartInvalidator._cursors[coll.name][0] == cursor);

        handler.stop();
        status.push(Meteor.SmartInvalidator._cursors[coll.name][0] == cursor);
        emit('return', status);
      }).run();
    });

    assert.deepEqual(status, [true, false]);
    done();
  });

  test('observeChanges callbacks on a fiber - updated', function(done, server) {
    var data = [{_id: 1, a: 10}, {_id: 2, b: 30}];
    server.evalSync(createCollWithData, data);
    
    server.eval(function() {
      Fibers(function() {
        cursor = coll.find();
        cursor.observeChanges({
          changed: function(id, item) {
            var count = coll.find().count();
            emit('count', count);
          }
        });
      }).run();
    });

    server.on('count', function(count) {
      assert.equal(count, 2);
      done();
    })

    server.evalSync(function() {
      coll.update({_id: 1}, {$set: {a: 30}});
      emit('return');
    });

  });

  test('observeChanges callbacks on a fiber - removed', function(done, server) {
    var data = [{_id: 1, a: 10}, {_id: 2, b: 30}];
    server.evalSync(createCollWithData, data);
    
    server.eval(function() {
      Fibers(function() {
        cursor = coll.find();
        cursor.observeChanges({
          removed: function(id, item) {
            var count = coll.find().count();
            emit('count', count);
          }
        });
      }).run();
    });

    server.on('count', function(count) {
      assert.equal(count, 1);
      done();
    })

    server.evalSync(function() {
      coll.remove({_id: 1});
      emit('return');
    });

  });

  test('observeChanges callbacks on a fiber - added', function(done, server) {
    var data = [{_id: 1, a: 10}, {_id: 2, b: 30}];
    server.evalSync(createCollWithData, data);
    
    server.eval(function() {
      Fibers(function() {
        cursor = coll.find();
        cursor.observeChanges({
          added: function(id, item) {
            var count = coll.find().count();
            emit('count', count);
          }
        });
      }).run();
    });

    var results = [];
    server.on('count', function(count) {
      results.push(count);
    })

    server.evalSync(function() {
      coll.insert({_id: 10});
      emit('return');
    });

    setTimeout(function() {
      assert.deepEqual(results, [3, 3, 3]);
      done();
    }, 50);

  });

  suite('Helpers', function() {
    test('_added', function(done, server) {
      var result = server.evalSync(function() {
        var Fibers = Npm.require('fibers');
        Fibers(function() {
          coll = new Meteor.SmartCollection('ssd');
          var cursor = coll.find();
          cursor.observeChanges({
            added: function(id, doc) {
              doc._id = id;
              emit('return', [doc, cursor._idMap]);
            }
          });

          cursor._added({_id: 20, aa: 10});
        }).run();
      });
      
      assert.deepEqual(result, [{_id: 20, aa: 10}, {"20": true}]);
      done();
    });

    test('_removed', function(done, server) {
      var result = server.evalSync(function() {
        coll = new Meteor.SmartCollection('ssd');
        Fibers(function() {
          var cursor = coll.find();
          cursor.observeChanges({
            removed: function(id) {
              emit('return', [id, cursor._idMap]);
            }
          });

          cursor._idMap['20'] = true;
          cursor._removed(20);
        }).run();
      });
      
      assert.deepEqual(result, [20, {"20": null}]);
      done();
    });

    test('_changed', function(done, server) {
      var result = server.evalSync(function() {
        coll = new Meteor.SmartCollection('ssd');
        Fibers(function() {
          var cursor = coll.find();
          cursor.observeChanges({
            changed: function(id, fields) {
              emit('return', [id, fields, cursor._idMap]);
            }
          });

          cursor._idMap['20'] = true;
          cursor._changed(20, {kk: 20});
        }).run();
      });
      
      assert.deepEqual(result, [20, {kk: 20}, {"20": true}]);
      done();
    });

    test('_computeAndNotifyRemoved', function(done, server) {
      var result = server.evalSync(function() {
        coll = new Meteor.SmartCollection('ssd');
        Fibers(function() {
          var removed = [];
          var cursor = coll.find();
          cursor.observeChanges({
            removed: function(id) {
              removed.push(id);
            }
          });

          cursor._idMap = {
            "20": true, 
            "10": true, 
            "5": true
          };
          cursor._computeAndNotifyRemoved(['10', '5']);
          emit('return', [removed, cursor._idMap]);
        }).run();
      });
      
      assert.deepEqual(result, [[20], {"10": true, "5": true, "20": null}]);
      done();
    });

    test('_added - stop obeserving', function(done, server) {
      var result = server.evalSync(function() {
        coll = new Meteor.SmartCollection('ssd');
        Fibers(function() {
          var cursor = coll.find();
          var received;
          cursor.observeChanges({
            added: function(id, doc) {
              received = doc;
            }
          }, function(err, handler) {
            handler.stop();
            cursor._added({_id: 20, aa: 10});
            emit('return', [received, cursor._idMap]);
          });
        }).run();
      });
      
      assert.deepEqual(result, [null, {}]);
      done();
    });

    test('_removed - stop obeserving', function(done, server) {
      var result = server.evalSync(function() {
        coll = new Meteor.SmartCollection('ssd');
        Fibers(function() {
          var cursor = coll.find();
          var result;
          cursor.observeChanges({
            removed: function(id) {
              result = id;
            }
          }, function(err, handler) {
            handler.stop();
            cursor._idMap['20'] = true;
            cursor._removed(20);
            emit('return', [result, cursor._idMap]);
          });
        }).run();
      });
      
      assert.deepEqual(result, [null, {"20": true}]);
      done();
    });

    test('_changed - stop obeserving', function(done, server) {
      var result = server.evalSync(function() {
        coll = new Meteor.SmartCollection('ssd');
        Fibers(function() {
          var cursor = coll.find();
          var changed;
          cursor.observeChanges({
            changed: function(id, fields) {
              changed = id;
            }
          }, function(err, handler) {
            handler.stop();
            cursor._idMap['20'] = true;
            cursor._changed(20, {kk: 20});
            emit('return', [changed, cursor._idMap]);
          });
        }).run();
      });
      
      assert.deepEqual(result, [null, {"20": true}]);
      done();
    });

    test('_computeAndNotifyRemoved - stop obeserving', function(done, server) {
      var result = server.evalSync(function() {
        coll = new Meteor.SmartCollection('ssd');
        Fibers(function() {
          var removed = [];
          var cursor = coll.find();
          cursor.observeChanges({
            removed: function(id) {
              removed.push(id);
            }
          }, function(err, handler) {
            handler.stop();
            cursor._idMap = {
              "20": true, 
              "10": true, 
              "5": true
            };
            cursor._computeAndNotifyRemoved(['10', '5']);
            emit('return', [removed, cursor._idMap]);
          });
        }).run();
      });
      
      assert.deepEqual(result, [[], {"10": true, "5": true, "20": true}]);
      done();
    });
  });
}); 