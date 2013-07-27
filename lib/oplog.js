var Mongo = Npm.require('mongodb');
var DATABASE = "cool";
var query = {
  ns: new RegExp(DATABASE + '.*'),
  op: {$in: ['i', 'u', 'r']}
};

Mongo.MongoClient.connect('mongodb://localhost/local', function(err, db) {
  if(err) throw err;
  var coll = db.collection('oplog.rs');
  var cursor = coll.find(query, {
    sort: {$natural: -1},
    limit: 1
  });

  var latestTs;
  cursor.each(function(err, doc) {
    if(err) throw err;
    if(doc) {
      latestTs = doc.ts;
    } else {
      if(latestTs) {
        query['ts'] = {$gt: latestTs};
        coll.find(query, {
          tailable: true,
          awaitdata: true,
          numberOfRetries: -1
        }).each(processOp);
      }
    }
  });
});

function processOp(err, data) {
  console.log(data);
}