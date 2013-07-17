var assert = require('assert');

suite('Client Collection - Permissions(no insecure)', function() {
  suite('insert', function() {
    test('access granted', function(done, server, client) {
      server.evalSync(function() {
        coll = new Meteor.SmartCollection('coll');
        coll.allow({
          insert: function() { return true }
        });
        emit('return');
      });

      var err = client.evalSync(function() {
        coll = new Meteor.SmartCollection('coll');
        coll.insert({_id: 'aa', bb: 20}, function(err) {
          emit('return', err);
        });
      }); 

      assert.equal(err, null);
      done();
    });

    test('access denied', function(done, server, client) {
      server.evalSync(function() {
        coll = new Meteor.SmartCollection('coll');
        coll.deny({
          insert: function() { return true }
        });
        emit('return');
      });

      var err = client.evalSync(function() {
        coll = new Meteor.SmartCollection('coll');
        coll.insert({_id: 'aa', bb: 20}, function(err) {
          emit('return', err);
        });
      }); 

      assert.equal(err.error, 403);
      done();
    });

    test('arguments received', function(done, server, client) {
      server.evalSync(function() {
        coll = new Meteor.SmartCollection('coll');
        coll.allow({
          insert: function(userId, doc) {
            emit('args', userId, doc);
            return true;
          }
        });
        emit('return');
      });

      server.on('args', function(userId, doc) {
        assert.equal(userId, null);
        assert.deepEqual(doc, {_id: 'aa', bb: 20});
        done();
      });

      var err = client.evalSync(function() {
        coll = new Meteor.SmartCollection('coll');
        coll.insert({_id: 'aa', bb: 20}, function(err) {
          emit('return', err);
        });
      }); 
    });

    test('arguments received - loggedIn user', function(done, server, client) {
      var userErr = client.evalSync(laika.actions.createUser, {username: 'arunoda', password: '123456'});
      assert.equal(userErr, null);
      var user = client.evalSync(laika.actions.loggedInUser);

      server.evalSync(function() {
        coll = new Meteor.SmartCollection('coll');
        coll.allow({
          insert: function(userId, doc) {
            emit('args', userId, doc);
            return true;
          }
        });
        emit('return');
      });

      server.on('args', function(userId, doc) {
        assert.equal(userId, user._id);
        assert.deepEqual(doc, {_id: 'aa', bb: 20});
        done();
      });

      var err = client.evalSync(function() {
        coll = new Meteor.SmartCollection('coll');
        coll.insert({_id: 'aa', bb: 20}, function(err) {
          emit('return', err);
        });
      }); 
    });
  });

  suite('update', function() {
    test('access granted', function(done, server, client) {
      var err = server.evalSync(function() {
        coll = new Meteor.SmartCollection('coll');
        coll.allow({
          update: function() { return true }
        });
        coll.insert({_id: 'aa', bb: 20}, function(err) {
          emit('return', err);
        });
      });
      assert.equal(err, null);

      var err = client.evalSync(function() {
        coll = new Meteor.SmartCollection('coll');
        coll.update({_id: 'aa'}, {$set: {bb: 21}}, function(err) {
          emit('return', err);
        });
      });
      assert.equal(err, null);
      done();
    });

    test('access denied', function(done, server, client) {
      var err = server.evalSync(function() {
        coll = new Meteor.SmartCollection('coll');
        coll.allow({
          update: function() { return false }
        });
        coll.insert({_id: 'aa', bb: 20}, function(err) {
          emit('return', err);
        });
      });
      assert.equal(err, null);

      var err = client.evalSync(function() {
        coll = new Meteor.SmartCollection('coll');
        coll.update({_id: 'aa'}, {$set: {bb: 21}}, function(err) {
          emit('return', err);
        });
      });
      assert.equal(err.error, 403);
      done();
    });

    test('arguments received', function(done, server, client) {
      var err = server.evalSync(function() {
        coll = new Meteor.SmartCollection('coll');
        coll.allow({
          update: function(userId, doc, fields, modifier) {
            emit('args', userId, doc, fields, modifier);
            return true;
          }
        });
        coll.insert({_id: 'aa', bb: 20}, function(err) {
          emit('return', err);
        });
      });
      assert.equal(err, null);

      server.on('args', function(userId, doc, fields, modifier) {
        assert.equal(userId, null);
        assert.deepEqual(doc, {_id: 'aa', bb: 20});
        assert.deepEqual(fields, ['cc', 'bb']);
        assert.deepEqual(modifier, {$set: {cc: 30}, $inc: {bb: 10}});
        done();
      });

      var err = client.evalSync(function() {
        coll = new Meteor.SmartCollection('coll');
        coll.update({_id: 'aa'}, {$set: {cc: 30}, $inc: {bb: 10}}, function(err) {
          emit('return', err);
        });
      }); 
    });

    test('arguments received - loggedIn user', function(done, server, client) {
      var userErr = client.evalSync(laika.actions.createUser, {username: 'arunoda', password: '123456'});
      assert.equal(userErr, null);
      var user = client.evalSync(laika.actions.loggedInUser);

      var err = server.evalSync(function() {
        coll = new Meteor.SmartCollection('coll');
        coll.allow({
          update: function(userId, doc, fields, modifier) {
            emit('args', userId, doc, fields, modifier);
            return true;
          }
        });
        coll.insert({_id: 'aa', bb: 20}, function(err) {
          emit('return', err);
        });
      });
      assert.equal(err, null);

      server.on('args', function(userId, doc, fields, modifier) {
        assert.equal(userId, user._id);
        assert.deepEqual(doc, {_id: 'aa', bb: 20});
        assert.deepEqual(fields, ['cc', 'bb']);
        assert.deepEqual(modifier, {$set: {cc: 30}, $inc: {bb: 10}});
        done();
      });

      var err = client.evalSync(function() {
        coll = new Meteor.SmartCollection('coll');
        coll.update({_id: 'aa'}, {$set: {cc: 30}, $inc: {bb: 10}}, function(err) {
          emit('return', err);
        });
      }); 
    });
  });
});