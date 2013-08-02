var assert = require('assert');

suite('Transform - Client', function() {
  suite('Collection Level', function() {
    test('fetch', function(done, server, client) {
      server.evalSync(function() {
        coll = new Meteor.SmartCollection('coll');
        coll.insert({_id: 'pp', aa: 400});
        Meteor.publish('smart-data', function() {
          return coll.find();
        });
        emit('return');
      });

      var docs = client.evalSync(function() {
        coll = new Meteor.SmartCollection('coll', {transform: function(doc) {
          doc.bb = 200;
          return doc;
        }});

        Meteor.subscribe('smart-data', function() {
          emit('return', coll.find().fetch());
        });
      });

      assert.deepEqual(docs, [{_id: 'pp', aa: 400, bb: 200}]);
      done();
    });

    test('findOne', function(done, server, client) {
      server.evalSync(function() {
        coll = new Meteor.SmartCollection('coll');
        coll.insert({_id: 'pp', aa: 400});
        Meteor.publish('smart-data', function() {
          return coll.find();
        });
        emit('return');
      });

      var docs = client.evalSync(function() {
        coll = new Meteor.SmartCollection('coll', {transform: function(doc) {
          doc.bb = 200;
          return doc;
        }});
        
        Meteor.subscribe('smart-data', function() {
          emit('return', coll.findOne());
        });
      });

      assert.deepEqual(docs, {_id: 'pp', aa: 400, bb: 200});
      done();
    });

    test('observe', function(done, server, client) {
      server.evalSync(function() {
        coll = new Meteor.SmartCollection('coll');
        coll.insert({_id: 'pp', aa: 400});
        Meteor.publish('smart-data', function() {
          return coll.find();
        });
        emit('return');
      });

      client.evalSync(function() {
        coll = new Meteor.SmartCollection('coll', {transform: function(doc) {
          doc.bb = 200;
          return doc;
        }});
        
        Meteor.subscribe('smart-data');
        coll.find().observe({
          added: function(doc) {
            emit('added', doc);
          }
        });
        emit('return');
      });

      client.on('added', function(doc) {
        assert.deepEqual(doc, {_id: 'pp', aa: 400, bb: 200});
        done();
      });
    });
  });

  test('.find() level', function(done, server, client) {
    server.evalSync(function() {
      coll = new Meteor.SmartCollection('coll');
      coll.insert({_id: 'pp', aa: 400});
      Meteor.publish('smart-data', function() {
        return coll.find();
      });
      emit('return');
    });

    var docs = client.evalSync(function() {
      coll = new Meteor.SmartCollection('coll', {transform: function(doc) {
        doc.bb = 200;
        return doc;
      }});

      Meteor.subscribe('smart-data', function() {
        emit('return', coll.find({}, {transform: function(doc) {
          doc.mp = 300;
          return doc;
        }}).fetch());
      });
    });

    assert.deepEqual(docs, [{_id: 'pp', aa: 400, mp: 300}]);
    done();
  });

  test('.findOne() level', function(done, server, client) {
    server.evalSync(function() {
      coll = new Meteor.SmartCollection('coll');
      coll.insert({_id: 'pp', aa: 400});
      Meteor.publish('smart-data', function() {
        return coll.find();
      });
      emit('return');
    });

    var docs = client.evalSync(function() {
      coll = new Meteor.SmartCollection('coll', {transform: function(doc) {
        doc.bb = 200;
        return doc;
      }});

      Meteor.subscribe('smart-data', function() {
        var doc = coll.findOne({}, {transform: function(doc) {
          doc.mp = 300;
          return doc;
        }});
        emit('return', doc);
      });
    });

    assert.deepEqual(docs, {_id: 'pp', aa: 400, mp: 300});
    done();
  });
});