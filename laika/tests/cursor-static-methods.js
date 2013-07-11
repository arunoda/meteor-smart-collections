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

suite('Cursor - Static Methods', function() {
  test('foreach', function(done, server) {
    var data = [{_id: 1, a: 10}, {_id: 2, b: 30}];
    server.evalSync(createCollWithData, data);
    
    var forEachedData = server.evalSync(function() {
      var Fibers = Npm.require('fibers');
      Fibers(function() {
        var data = [];
        coll.find({}).forEach(function(item) {
          data.push(item);
        });
        emit('return', data);
      }).run();
    });

    assert.deepEqual(forEachedData, data);
    done();
  });

  test('map', function(done, server) {
    var data = [{_id: 1, a: 10}, {_id: 2, a: 30}];
    server.evalSync(createCollWithData, data);
    
    var mappedData = server.evalSync(function() {
      var Fibers = Npm.require('fibers');
      Fibers(function() {
        var data = coll.find().map(function(item) {
          return item.a;
        });
        emit('return', data);
      }).run();
    });

    assert.deepEqual(mappedData, [10, 30]);
    done();
  });

  test('fetch', function(done, server) {
    var data = [{_id: 1, a: 10}, {_id: 2, a: 30}];
    server.evalSync(createCollWithData, data);
    
    var fetchedData = server.evalSync(function() {
      var Fibers = Npm.require('fibers');
      Fibers(function() {
        var data = coll.find().fetch();
        emit('return', data);
      }).run();
    });

    assert.deepEqual(fetchedData, data);
    done();
  });

  test('count', function(done, server) {
    var data = [{_id: 1, a: 10}, {_id: 2, a: 30}];
    server.evalSync(createCollWithData, data);
    
    var fetchedCount = server.evalSync(function() {
      var Fibers = Npm.require('fibers');
      Fibers(function() {
        var data = coll.find().count();
        emit('return', data);
      }).run();
    });

    assert.deepEqual(fetchedCount, data.length);
    done();
  });

  test('rewind', function(done, server) {
    var data = [{_id: 1, a: 10}, {_id: 2, a: 30}];
    server.evalSync(createCollWithData, data);
    
    var fetchedData = server.evalSync(function() {
      var Fibers = Npm.require('fibers');
      Fibers(function() {
        var data = [];
        var cursor = coll.find();
        data.push(cursor.fetch());
        cursor.rewind();
        data.push(cursor.fetch());
        emit('return', data);
      }).run();
    });

    assert.deepEqual(fetchedData, [data, data]);
    done();
  });

  test('using options - sort', function(done, server) {
    var data = [{_id: 1, a: 10}, {_id: 2, a: 30}];
    server.evalSync(createCollWithData, data);
    
    var mappedData = server.evalSync(function() {
      var Fibers = Npm.require('fibers');
      Fibers(function() {
        var data = coll.find({}, {sort: {a: -1}}).map(function(item) {
          return item.a;
        });
        emit('return', data);
      }).run();
    });

    assert.deepEqual(mappedData, [30, 10]);
    done();
  });

  test('without fibers', function(done, server) {
    var data = [{_id: 1, a: 10}, {_id: 2, a: 30}];
    server.evalSync(createCollWithData, data);
    
    var result = server.evalSync(function() {
      var Fibers = Npm.require('fibers');
      coll.find({}).fetch(function(err, data) {
        emit('return', data);
      });
    });

    assert.deepEqual(result, data);
    done();
  });
}); 