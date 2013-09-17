var assert = require('assert');
require('../common.js');

suite('Latency - Error', function() {
  test('insert', function(done, server, client) {
    server.evalSync(doAutoPublish);
    server.evalSync(function() {
      coll = new Meteor.SmartCollection('coll');
      coll.allow({
        insert: function() {return true}
      })
      emit('return');
    });

    var received = [];
    var error;
    client.on('added', function(doc) {
      received.push(['a', doc])
    });

    client.on('removed', function(doc) {
      received.push(['r', doc]);
    });

    client.on('error', function(err) {
      error = err;
    });

    var err = client.eval(function() {
      coll = new Meteor.SmartCollection('coll');
      coll.find().observe({ 
        added: function(doc) {
          emit('added', doc);
        },
        removed: function(doc) {
          emit('removed', doc);
        }
      });

      //we use $aa to make an error from node mogno driver
      coll.insert({_id: 'aa', $aa: 10}, function(err) {
        emit('error', err);
      });
    });

    assert.ok(err);

    setTimeout(function() {
      assert.ok(error);
      assert.deepEqual(received, [
        ['a', {_id: 'aa', $aa: 10}],
        ['r', {_id: 'aa', $aa: 10}]
      ]);
      done();
    }, 300);
  });

  //I couldn't able to find a reliable to make some error on update, so this test left blank
  // test('update', function(done, server, client) {
  //   server.evalSync(doAutoPublish);
  //   server.evalSync(function() {
  //     coll = new Meteor.SmartCollection('coll');
  //     coll.insert({_id: 'aa', aa: "coola"});
  //     coll._ensureIndex({aa: true});

  //     coll.allow({
  //       update: function() {return true}
  //     })

  //     //let indexes to happened properly
  //     setTimeout(function() {
  //       emit('return');
  //     }, 200);
  //   });

  //   var received = [];
  //   var error;
  //   client.on('added', function(doc) {
  //     received.push(['a', doc])
  //   });

  //   client.on('removed', function(doc) {
  //     received.push(['r', doc]);
  //   });

  //   client.on('changed', function(doc) {
  //     received.push(['c', doc]);
  //   });

  //   client.on('error', function(err) {
  //     error = err;
  //   });

  //   client.eval(function() {
  //     coll = new Meteor.SmartCollection('coll');
  //     coll.find().observe({ 
  //       added: function(doc) {
  //         emit('added', doc);
  //       },
  //       removed: function(doc) {
  //         emit('removed', doc);
  //       },
  //       changed: function(doc) {
  //         emit('changed', doc);
  //       }
  //     });

  //     coll.update({_id: 'aa'}, {$inc: {aa: 10}}, function(err) {
  //       emit('error', err);
  //     });
  //   });

  //   setTimeout(function() {
  //     assert.ok(error);
  //     assert.deepEqual(received, [
  //       ['a', {_id: 'aa', aa: "coola"}]
  //     ]);
  //     done();
  //   }, 300);
  // });

  //I couldn't able to find a way to make some error on remove, so this test left blank
  // test('remove', function(done, server, client) {
  //   server.evalSync(doAutoPublish);
  //   server.evalSync(function() {
  //     coll = new Meteor.SmartCollection('coll');
  //     coll.insert({_id: 'aa', aa: 10});

  //     coll.allow({
  //       remove: function() {return true}
  //     })
  //     emit('return');
  //   });

  //   var received = [];
  //   client.on('added', function(doc) {
  //     received.push(['a', doc])
  //   });

  //   client.on('removed', function(doc) {
  //     received.push(['r', doc]);
  //   });

  //   client.on('changed', function(doc) {
  //     received.push(['c', doc]);
  //   });

  //   var err = client.evalSync(function() {
  //     coll = new Meteor.SmartCollection('coll');
  //     coll.find().observe({ 
  //       added: function(doc) {
  //         emit('added', doc);
  //       },
  //       removed: function(doc) {
  //         emit('removed', doc);
  //       },
  //       changed: function(doc) {
  //         emit('changed', doc);
  //       }
  //     });

  //     coll.remove({_id: 'aa'}, function(err) {
  //       emit('return', err);
  //     });
  //   });

  //   assert.equal(err, null);

  //   setTimeout(function() {
  //     assert.deepEqual(received, [
  //       ['a', {_id: 'aa', aa: 10}],
  //       ['r', {_id: 'aa', aa: 10}]
  //     ]);
  //     done();
  //   }, 300);
  // });
});