//handles server methods for client side insert, update, delete

Meteor.methods({
  //_si_ == smart insert :P
  _si_: function(collectionName, doc) {
    var collection = getCollection(collectionName);
    var accessGranted = collection.validators.insert.evaluate(this.userId, doc);
    if(!accessGranted) {
      throw new Meteor.Error(403, 'Acceed Denied');
    }

    try{
      return collection.insert(doc);
    } catch(err) {
      throw new Meteor.Error(500, err.message);
    }
  },

  _su_: function(collectionName, id, modifier) {
    var collection = getCollection(collectionName);

    if(typeof(id) != 'string') {
      throw new Meteor.Error(403, 'Not permitted. Untrusted code may only update documents by ID');
    }

    var selector = {_id: id};

    try{
      collection.update(selector, modifier, {});
    } catch(err) {
      throw new Meteor.Error(500, err.message);
    }
  },

  _sr_: function(collectionName, id) {
    var collection = getCollection(collectionName);

    if(typeof(id) != 'string') {
      throw new Meteor.Error(403, 'Not permitted. Untrusted code may only update documents by ID');
    }

    var selector = {_id: id};

    try{
      collection.remove(selector);
    } catch(err) {
      throw new Meteor.Error(500, err.message);
    }
  }
});

function getCollection(collectionName) {
  var collection =  Meteor.SmartInvalidator._collections[collectionName];
  if(collection) {
    return collection;
  } else {
    throw new Meteor.Error(404, 'invalid collection: ' + collectionName);
  }
}
