//handles server methods for client side insert, update, delete

Meteor.methods({
  //_si_ == smart insert :P
  _si_: function(collectionName, doc) {
    var collection = getCollection(collectionName);
    if(!collection) {
      throw new Meteor.Error(404, 'invalid collection: ' + collectionName);
    }

    try{
      return collection.insert(doc);
    } catch(err) {
      throw new Meteor.Error(500, err.message);
    }
  }
});

function getCollection(collectionName) {
  return Meteor.SmartInvalidator._collections[collectionName];
}
