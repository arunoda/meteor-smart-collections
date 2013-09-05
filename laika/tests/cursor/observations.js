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
    var data = [{_id: "1", a: 10}, {_id: "2", b: 30}];
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
    var data = [{_id: "1", a: 10}, {_id: "2", b: 30}];
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
    var data = [{_id: "1", a: 10}, {_id: "2", b: 30}];
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

  test('stop observing', function(done, server) {
    var docs = server.evalSync(function() {
      coll = new Meteor.SmartCollection('coll');

      var addedDocs = [];
      var handler = coll.find({}).observeChanges({
        added: function(id, doc) {
          addedDocs.push(doc);
        }
      });

      coll.insert({_id: 'aa', aa: '20'});

      //wait to be initialization and added first document
      Meteor.setTimeout(function() {
        handler.stop();
        coll.insert({_id: 'bb', bb: '40'});
      }, 50);

      setTimeout(function() {
        emit('return', addedDocs);
      }, 100);
    });

    assert.deepEqual(docs, [{_id: 'aa', aa: '20'}]);
    done();
  });
}); 