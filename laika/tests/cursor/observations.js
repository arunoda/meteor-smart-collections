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
      cursor = coll.find();
      cursor.observeChanges({
        added: function(id, item) {
          emit('added', id, item);
        }
      }, function() {
        emit('done');
      });
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
}); 