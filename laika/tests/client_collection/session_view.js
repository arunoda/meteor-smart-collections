/*
  We need to make sure when two subscription sending `added` twice.
  Client must not get it twice, rather it should receive changes in the second time
*/

var assert = require('assert');

suite('Session View', function() {
  test('two subscriptions', function(done, server, client) {
    server.evalSync(function() {
      coll = new Meteor.SmartCollection('coll');
      coll.insert({_id: '100', aa: 20});
      Meteor.publish('sub1', function() {
        return coll.find();
      });

      Meteor.publish('sub2', function() {
        return coll.find();
      });      
      emit('return');
    });

    client.evalSync(function() {
      coll = new Meteor.SmartCollection('coll');
      Meteor.subscribe('sub1', function() {
        Meteor.subscribe('sub2', function() {
          emit('return');
        })
      });
    });

    server.evalSync(function() {
      coll.insert({_id: '200', aa: 59});
      setTimeout(function() {
        emit('return');
      }, 50);
    }); 

    var docs = client.evalSync(function() {
      emit('return', coll.find({}).fetch());
    });

    assert.deepEqual(docs, [
      {_id: '100', aa: 20}, 
      {_id: '200', aa: 59}
    ]);
    done();
  });

});