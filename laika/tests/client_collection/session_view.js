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

  test('two collection', function(done, server, client) {
    server.evalSync(function() {
      coll = new Meteor.SmartCollection('coll');
      coll2 = new Meteor.SmartCollection('coll2');

      coll.insert({_id: '100', aa: 20});
      coll2.insert({_id: '104', aa: 40});

      Meteor.publish('sub1', function() {
        return coll.find();
      });

      Meteor.publish('sub2', function() {
        return coll2.find();
      });      
      emit('return');
    });

    client.evalSync(function() {
      coll = new Meteor.SmartCollection('coll');
      coll2 = new Meteor.SmartCollection('coll2');
      Meteor.subscribe('sub1', function() {
        Meteor.subscribe('sub2', function() {
          emit('return');
        })
      });
    });

    var docs = client.evalSync(function() {
      var result = [
        coll.find({}).fetch(),
        coll2.find({}).fetch()
      ];
      emit('return', result);
    });

    assert.deepEqual(docs, [
      [{_id: '100', aa: 20}],
      [{_id: '104', aa: 40}]
    ]);
    done();
  });

});