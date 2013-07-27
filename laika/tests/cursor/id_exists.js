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

suite('Cursor - ._idExists', function() {
  test('after added', function(done, server) {
    var data = [{_id: 1, a: 10}, {_id: 2, b: 30}];
    server.evalSync(createCollWithData, data);
    
    var exists = server.evalSync(function() {
      var Fibers = Npm.require('fibers');
      Fibers(function() {
        cursor = coll.find();
        cursor.observeChanges({});
        emit('return', cursor._idExists(1));
      }).run();
    });

    assert.equal(exists, true);
    done();
  });

  test('no such id', function(done, server) {
    var data = [{_id: 1, a: 10}, {_id: 2, b: 30}];
    server.evalSync(createCollWithData, data);
    
    var exists = server.evalSync(function() {
      var Fibers = Npm.require('fibers');
      Fibers(function() {
        cursor = coll.find();
        cursor.observeChanges({});
        emit('return', cursor._idExists(4));
      }).run();
    });

    assert.equal(exists, false);
    done();
  });
});