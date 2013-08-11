//handles server methods for client side insert, update, delete

Meteor._setSmartCollectionMethods = function(collection) {
  var methods = {};
  methods['/' + collection.name + '/insert'] = function(doc) {
    var tranformedDoc = tranformDoc(collection, doc);
    var accessGranted = collection.validators.insert.evaluate([this.userId, tranformedDoc.allow], [this.userId, tranformedDoc.deny]);
    if(!accessGranted) {
      throw new Meteor.Error(403, 'Acceed Denied');
    }

    try{
      return collection.insert(doc);
    } catch(err) {
      throw new Meteor.Error(500, err.message);
    }
  }

  methods['/' + collection.name + '/update'] = function(doc, modifier) {
    var id = doc._id;
    if(typeof(id) != 'string') {
      throw new Meteor.Error(403, 'Not permitted. Untrusted code may only update documents by ID');
    }

    var selector = {_id: id};
    var doc = collection.findOne(selector);
    var tranformedDoc = tranformDoc(collection, doc);

    var fieldsMap = Meteor.SmartInvalidator.updateModifierToFields(modifier);
    var fieldNames = _.keys(_.extend(fieldsMap.update, fieldsMap.remove));
    var accessGranted = collection.validators.update.evaluate([this.userId, tranformedDoc.allow, fieldNames, modifier], [this.userId, tranformedDoc.deny, fieldNames, modifier]);

    if(!accessGranted) {
      throw new Meteor.Error(403, 'Acceed Denied');
    }

    try{
      collection.update(selector, modifier, {});
    } catch(err) {
      throw new Meteor.Error(500, err.message);
    }
  }

  methods['/' + collection.name + '/remove'] = function(doc) {
    var id = doc._id;
    if(typeof(id) != 'string') {
      throw new Meteor.Error(403, 'Not permitted. Untrusted code may only update documents by ID');
    }

    var selector = {_id: id};
    var doc = collection.findOne(selector);
    var tranformedDoc = tranformDoc(collection, doc);
    var accessGranted = collection.validators.remove.evaluate([this.userId, tranformedDoc.allow], [this.userId, tranformedDoc.deny]);

    if(!accessGranted) {
      throw new Meteor.Error(403, 'Acceed Denied');
    }

    try{
      collection.remove(selector);
    } catch(err) {
      throw new Meteor.Error(500, err.message);
    }
  }

  Meteor.methods(methods);
}

function tranformDoc(collection, doc) {
  var rtn = { allow: doc, deny: doc };

  if(collection._transform) {
    rtn.allow = rtn.deny = collection._transform(_.clone(doc));
  }

  if(collection._allowTransform === null) {
    rtn.allow = doc;
  } else if(collection._allowTransform) {
    rtn.allow = collection._allowTransform(_.clone(doc));
  }

  if(collection._denyTransform === null) {
    rtn.deny = doc;
  } else if(collection._denyTransform) {
    rtn.deny = collection._denyTransform(_.clone(doc));
  }

  return rtn;
}
