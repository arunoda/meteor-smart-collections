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
  // test('listen for added event - just cursor results', function(done, server) {
  //   var data = [{_id: 1, a: 10}, {_id: 2, b: 30}];
  //   server.evalSync(createCollWithData, data);
    
  //   server.eval(function() {
  //     cursor = coll.find();
  //     cursor.observeChanges({
  //       added: function(id, item) {
  //         emit('added', id, item);
  //       }
  //     }, function() {
  //       emit('done');
  //     });
  //   });

  //   var received = [];
  //   server.on('added', function(id, item) {
  //     item._id = id;
  //     received.push(item);
  //   });

  //   server.on('done', function() {
  //     assert.deepEqual(received, data);
  //     done();
  //   });
  // });

  // test('just cursor results - with fibers', function(done, server) {
  //   var data = [{_id: 1, a: 10}, {_id: 2, b: 30}];
  //   server.evalSync(createCollWithData, data);
    
  //   var received = server.evalSync(function() {
  //     var Fibers = Npm.require('fibers');
  //     Fibers(function() {
  //       cursor = coll.find();
  //       var received = [];
  //       cursor.observeChanges({
  //         added: function(id, item) {
  //           item._id = id;
  //           received.push(item);
  //         }
  //       });
  //       emit('return', received);
  //     }).run();
  //   });

  //   assert.deepEqual(received, data);
  //   done();
  // });

  // test('just cursor results - with a used cursor', function(done, server) {
  //   var data = [{_id: 1, a: 10}, {_id: 2, b: 30}];
  //   server.evalSync(createCollWithData, data);
    
  //   server.evalSync(function() {
  //     cursor = coll.find();
  //     cursor.fetch(function() {
  //       emit('return');
  //     })
  //   });
    
  //   var received = server.evalSync(function() {
  //     var Fibers = Npm.require('fibers');
  //     Fibers(function() {
  //       var received = [];
  //       cursor.observeChanges({
  //         added: function(id, item) {
  //           item._id = id;
  //           received.push(item);
  //         }
  //       });
  //       emit('return', received);
  //     }).run();
  //   });

  //   assert.deepEqual(received, data);
  //   done();
  // });

  // test('adding cursor to Invalidator', function(done, server) {
  //   var data = [{_id: 1, a: 10}, {_id: 2, b: 30}];
  //   server.evalSync(createCollWithData, data);
    
  //   var same = server.evalSync(function() {
  //     var Fibers = Npm.require('fibers');
  //     Fibers(function() {
  //       cursor = coll.find();
  //       cursor.observeChanges({});
        
  //       var same = Meteor.SmartInvalidator._cursors[coll.name][0] == cursor;
  //       emit('return', same);
  //     }).run();
  //   });

  //   assert.ok(same);
  //   done();
  // });

  // test('stop obeserving', function(done, server) {
  //   var data = [{_id: 1, a: 10}, {_id: 2, b: 30}];
  //   server.evalSync(createCollWithData, data);
    
  //   var status = server.evalSync(function() {
  //     var Fibers = Npm.require('fibers');
  //     Fibers(function() {
  //       cursor = coll.find();
  //       var status = [];
  //       var handler = cursor.observeChanges({});
  //       status.push(Meteor.SmartInvalidator._cursors[coll.name][0] == cursor);

  //       handler.stop();
  //       status.push(Meteor.SmartInvalidator._cursors[coll.name][0] == cursor);
  //       emit('return', status);
  //     }).run();
  //   });

  //   assert.deepEqual(status, [true, false]);
  //   done();
  // });

  suite('Helpers', function() {
    test('_added', function(done, server) {
      var result = server.evalSync(function() {
        coll = new Meteor.SmartCollection('ssd');
        setTimeout(function() {
          var cursor = coll.find();
          cursor.observeChanges({
            added: function(id, doc) {
              doc._id = id;
              emit('return', [doc, cursor._idMap]);
            }
          });

          cursor._added({_id: 20, aa: 10});
        }, 50);
      });
      
      assert.deepEqual(result, [{_id: 20, aa: 10}, {"20": true}]);
      done();
    });

    test('_removed', function(done, server) {
      var result = server.evalSync(function() {
        coll = new Meteor.SmartCollection('ssd');
        setTimeout(function() {
          var cursor = coll.find();
          cursor.observeChanges({
            removed: function(id) {
              emit('return', [id, cursor._idMap]);
            }
          });

          cursor._idMap['20'] = true;
          cursor._removed(20);
        }, 50);
      });
      
      assert.deepEqual(result, [20, {"20": null}]);
      done();
    });

    test('_changed', function(done, server) {
      var result = server.evalSync(function() {
        coll = new Meteor.SmartCollection('ssd');
        setTimeout(function() {
          var cursor = coll.find();
          cursor.observeChanges({
            changed: function(id, fields) {
              emit('return', [id, fields, cursor._idMap]);
            }
          });

          cursor._idMap['20'] = true;
          cursor._changed(20, {kk: 20});
        }, 50);
      });
      
      assert.deepEqual(result, [20, {kk: 20}, {"20": true}]);
      done();
    });

    test('_computeAndNotifyRemoved', function(done, server) {
      var result = server.evalSync(function() {
        coll = new Meteor.SmartCollection('ssd');
        setTimeout(function() {
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
        }, 50);
      });
      
      assert.deepEqual(result, [[20], {"10": true, "5": true, "20": null}]);
      done();
    });

    test('_added - stop obeserving', function(done, server) {
      var result = server.evalSync(function() {
        coll = new Meteor.SmartCollection('ssd');
        setTimeout(function() {
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

        }, 50);
      });
      
      assert.deepEqual(result, [null, {}]);
      done();
    });

    test('_removed - stop obeserving', function(done, server) {
      var result = server.evalSync(function() {
        coll = new Meteor.SmartCollection('ssd');
        setTimeout(function() {
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

        }, 50);
      });
      
      assert.deepEqual(result, [null, {"20": true}]);
      done();
    });

    test('_changed - stop obeserving', function(done, server) {
      var result = server.evalSync(function() {
        coll = new Meteor.SmartCollection('ssd');
        setTimeout(function() {
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

        }, 50);
      });
      
      assert.deepEqual(result, [null, {"20": true}]);
      done();
    });

    test('_computeAndNotifyRemoved - stop obeserving', function(done, server) {
      var result = server.evalSync(function() {
        coll = new Meteor.SmartCollection('ssd');
        setTimeout(function() {
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

        }, 50);
      });
      
      assert.deepEqual(result, [[], {"10": true, "5": true, "20": true}]);
      done();
    });
  });
}); 