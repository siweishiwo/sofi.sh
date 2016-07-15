import * as Helper from './helper';
import * as Store from './store';

const schema = {
  title: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  author: {
    type: String,
    required: true
  },
  tags: {
    type: Array,
    default: []
  }
};

export function *read(next) {
  var id = this.params.id;
  var collection = Store.collection(this, 'article');

  if(id) {
    var article = yield collection.find({id}).limit(1).next();
    this.assert(article, 404);
    return this.body = Helper.filter(['_id'], article);
  }

  // article list
  var sort = {};
  var skip = +this.query.skip || 0;
  var limit = +this.query.limit || 20;
  sort[this.query.sort || 'createdAt'] = -1;

  var articles = yield collection.find({}, {skip, limit, sort}).toArray();
  this.body = articles.map(article => Helper.filter(['_id'], article));
}

export function *create(next) {
  var article = this.request.body;
  var collection = Store.collection(this, 'article');

  article.author = this.cookies.get('n', {signed: true});
  var ret = Store.composeWithSchema(article, schema);
  ret = yield collection.insert(ret);
  this.body = Helper.filter(['_id'], ret.ops[0]);
}

export function *update(next) {
  var id = this.params.id;
  var patch = this.request.body;

  // delete author
  delete patch.author;

  var collection = Store.collection(this, 'article');
  var change = {};

  for(let key in patch) {
    var ret = Store.validSchema(key, patch, schema);
    if(!ret) continue;
    change[key] =
      key === 'password' ? Store.hash(patch[key]) :
      key === 'role' ? detectRole(patch[key]) : patch[key];
  }

  var ops = yield collection.updateOne({id}, {$set: change});
  this.assert(ops.result.ok);
  this.body = {success: 1};
}

export function *del(next) {
  var id = this.params.id;
  var collection = Store.collection(this, 'article');
  var ops = yield collection.remove({id});
  this.assert(ops.result.ok);
  this.body = {success: 1};
}