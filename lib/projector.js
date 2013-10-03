function Projector(query, projection) {
  this._query = query;
  this._projection = projection;

  if(projection) {
    this._fields = this._compileFields(projection);
  }
}

Projector.prototype.filter = function(doc) {  
  if(typeof(this._fields) == 'object') {
    if(this._fields.include.length > 0) {
      var filteredDoc = this._pick(doc, this._fields.include);
      //always send _id if not asked to exclude
      if(this._fields.exclude[0] != '_id' && doc._id) {
        filteredDoc['_id'] = doc._id;
      }
      return filteredDoc;
    } else if(this._fields.exclude.length >0)  {
      return this._omit(doc, this._fields.exclude);
    }
  } else {
    return doc;
  }
};

/*
  Pick a set of fileds(with nested) from an object
*/
Projector.prototype._pick = function(doc, fileds) {
  var self = this;
  doc = _.clone(doc);
  var obj = {};

  fileds.forEach(function(field) {
    var parts = field.split('.');
    var snapshotedObj = _.clone(obj);
    var currObj = obj;
    var currDoc = doc;

    for(var lc=0; lc<parts.length; lc++) {
      var part = parts[lc];
      var partValue = currDoc[part];
      if(partValue === undefined) {
        if(self._keyExists(currDoc, part)) {
          //if undefined is manually setted. We need allow that
          currObj[part] = undefined;
        } else {
          obj = snapshotedObj;
        }
        break;
      } else if(lc == (parts.length -1)) {
        //at the last part
        currObj[part] = partValue;
      } else {

        currDoc = partValue;
        if(!currObj[part]) {
          currObj[part] = {};
        }
        currObj = currObj[part];
      }
    }
  });

  return obj;
};

Projector.prototype._keyExists = function(doc, key) {
  return Object.keys(doc).indexOf(key) >= 0;
};

/*
  Omit a set of fileds(with nested) from an object
*/
Projector.prototype._omit = function(doc, fileds) {
  var obj = _.clone(doc);

  fileds.forEach(function(field) {
    var parts = field.split('.');
    var currObj = obj;

    for(var lc=0; lc<parts.length; lc++) {
      var part = parts[lc];
      var partValue = currObj[part];
      if(partValue === undefined) {
        break;
      } else if(lc == (parts.length -1)) {
        //at the last part
        delete currObj[part];
      } else {
        currObj = currObj[part];
      }
    }
  });

  return obj;
};

Projector.prototype._compileFields = function(fields) {
  var include = [];
  var exclude = [];
  for(var field in fields) {
    checkForUnsupported(field, fields[field]);

    if(fields[field] == 0) {
      exclude.push(field);
    } else if(fields[field] == 1) {
      include.push(field);
    }
  }

  include = _.uniq(include);
  exclude = _.uniq(exclude);

  //both types (not allowed except for _id);
  if(include.length > 0 && exclude.length > 0) {
    //allow to exclude _id with inclusion
    if(!(exclude.length == 1 && exclude[0] == '_id')) {
      throw new Error("It is not possible to mix inclusion and exclusion styles in field filtering");
    }
  }

  return {
    include: include,
    exclude: exclude
  };

  function checkForUnsupported(field, fieldValue) {
    if(field.match(/[\$]/) || typeof(fieldValue) != 'number') {
      throw new Error('Unsupported field filtering(projection) operation. See more: http://goo.gl/8SL7CZ')
    }
  }
};

Meteor.SmartProjector = Projector;