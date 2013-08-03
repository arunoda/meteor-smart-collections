var assert = require('assert');

getDoc = function (query) {
  coll._collection.findOne(query, function(err, data) {
    emit('return', data);
  });
}

suite('Server Write Operations', function() {
  test('insert', function(done, server) {
    var error = server.evalSync(function() {
      coll = new Meteor.SmartCollection('coll');
      coll.insert({aa: 200}, function(err) {
        emit('return', err);
      });
    });
    assert.equal(error, null);

    var doc = server.evalSync(getDoc, {aa: 200});
    assert.equal(typeof(doc._id), 'string');

    done();
  });

  test('insert twice the same obj without _id', function(done, server) {
    var results = server.evalSync(function() {
      var results = [];
      coll = new Meteor.SmartCollection('coll');
      var doc = {aa: 200};
      results.push(coll.insert(doc));
      results.push(coll.insert(doc));
      emit('return', results);
    });
    
    assert.ok(results[0] != results[1]);
    done();
  });

  test('update', function(done, server, client) {
    var error = server.evalSync(function() {
      coll = new Meteor.SmartCollection('coll');
      coll.insert({aa: 200}, function(err) {
        emit('return', err);
      });
    });
    assert.equal(error, null);

    error = server.evalSync(function() {
      coll.update({aa: 200}, {$set: {bb: 300}}, function(err) {
        emit('return', err);
      });
    });
    assert.equal(error, null);

    var doc = server.evalSync(getDoc, {aa: 200});
    assert.equal(doc.bb, 300);
    assert.equal(doc.aa, 200);

    done();
  });

  test('remove', function(done, server, client) {
    var error = server.evalSync(function() {
      coll = new Meteor.SmartCollection('coll');
      coll.insert({aa: 200}, function(err) {
        emit('return', err);
      });
    });
    assert.equal(error, null);

    error = server.evalSync(function() {
      coll.remove({aa: 200}, function(err) {
        emit('return', err);
      });
    });
    assert.equal(error, null);

    var doc = server.evalSync(getDoc, {aa: 200});
    assert.equal(doc, null);

    done();
  });

  test('with fibers', function(done, server, client) {
    var id = server.evalSync(function() {
      var Fibers = Npm.require('fibers');
      Fibers(function() {
        coll = new Meteor.SmartCollection('coll2');
        var id = coll.insert({aa: 200});

        coll.update({_id: id}, {$set: {bb: 300}});
        emit('return', id);
      }).run();
    });

    var doc = server.evalSync(getDoc, {_id: id});
    assert.equal(doc.bb, 300);
    assert.equal(doc.aa, 200);
    done();
  });

  test('with fibers - callback', function(done, server, client) {
    var result = server.evalSync(function() {
      var Fibers = Npm.require('fibers');
      Fibers(function() {
        coll = new Meteor.SmartCollection('coll2');
        var result = [];
        var id = coll.insert({aa: 200}, function(err, id) {
          result = result.concat([err, id]);
        });
        result.push(id);
        emit('return', result);
      }).run();
    });

    assert.equal(result[0], null);
    assert.ok(result[2] === null)
    var doc = server.evalSync(getDoc, {_id: result[1]});
    assert.equal(doc.aa, 200);
    done();
  });

  test('without fibers', function(done, server, client) {
    var id = server.evalSync(function() {
      coll = new Meteor.SmartCollection('coll');
      var obj = {aa: 200};
      coll.insert(obj, function(err, id) {
        if(err) throw err;
        coll.update({_id: id}, {$set: {bb: 300}}, function(err) {
          if(err) throw err;
          emit('return', id);
        });
      });
    });

    var doc = server.evalSync(getDoc, {_id: id});
    assert.equal(doc.bb, 300);
    assert.equal(doc.aa, 200);
    done();
  });

  test('findOne', function(done, server, client) {
    var error = server.evalSync(function() {
      coll = new Meteor.SmartCollection('coll');
      coll.insert({aa: 200}, function(err) {
        emit('return', err);
      });
    });
    assert.equal(error, null);

    var doc = server.evalSync(function(query) {
      var Fibers = Npm.require('fibers');
      Fibers(function() {
        var data = coll.findOne(query);
        emit('return', data);
      }).run();
    }, {aa: 200});
    assert.equal(typeof(doc._id), 'string');

    done();
  });

  suite('indexes', function() {
    test("_ensureIndex", function(done, server, client) {
      server.evalSync(function() {
        var coll = new Meteor.SmartCollection('sss');
        coll._ensureIndex({aa: true});
        emit('return');
      });
      done();
    });

    test("_ensureIndex with options", function(done, server, client) {
      server.evalSync(function() {
        var coll = new Meteor.SmartCollection('sss');
        coll._ensureIndex({aa: true}, {});
        emit('return');
      });
      done();
    });

    test('_dropIndex', function(done, server) {
      server.evalSync(function() {
        var coll = new Meteor.SmartCollection('aaa');
        coll._dropIndex({aa: true});
        emit('return');
      }); 
      done();
    });
  });
});