var assert = require('assert');

suite('Server Collection - AutoPublish', function() {
  test('without autopublish', function(done, server, client) {
    client.evalSync(function() {
      coll = new Meteor.SmartCollection('coll');
      emit('return');
    });

    server.evalSync(function() {
      coll = new Meteor.SmartCollection('coll');
      coll.insert({_id: '1', aa: 10});
      setTimeout(function() {
        emit('return');
      }, 50);
    });   

    var rtn = client.evalSync(function() {
      emit('return', coll.find().fetch());
    });

    assert.deepEqual(rtn, []);
    done();
  });

  test('with autopublish', function(done, server, client) {
    client.evalSync(function() {
      coll = new Meteor.SmartCollection('coll');
      emit('return');
    });

    server.evalSync(function() {
      //autopublish package
      Meteor.default_server.autopublish();
      
      coll = new Meteor.SmartCollection('coll');
      coll.insert({_id: '1', aa: 10});
      setTimeout(function() {
        emit('return');
      }, 50);
    });   

    var rtn = client.evalSync(function() {
      emit('return', coll.find().fetch());
    });

    assert.deepEqual(rtn, [{_id: 1, aa: 10}]);
    done();
  });
});