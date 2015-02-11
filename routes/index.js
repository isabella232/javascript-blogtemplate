var helpers = require('../prismic-helpers'),
  Prismic = require('prismic.io').Prismic,
  Q = require('q'),
  _ = require('lodash'),
  moment = require('moment');

// Submit a Prismic form and get a Q promise

function Q_submit(form) {
  return Q.nbind(form.submit, form)();
}

// Pages helpers

function Q_pages(ctx) {
  return helpers.Q_getDocument(ctx, ctx.api.bookmarks['home']).then(function (home) {
    var pages = home.getGroup('page.children').toArray();
    return Q.all(_.map(pages, function(page) {
      var link = page.getLink('link');
      var childrenP = Q([]);
      if (link instanceof Prismic.Fragments.DocumentLink) {
        childrenP = helpers.Q_getDocument(ctx, link.id).then(function (linkDoc) {
          return linkDoc.getGroup('page.children') ? linkDoc.getGroup('page.children').toArray() : [];
        });
      }
      return childrenP.then(function(children){
        return {
          doc: page,
          children: children
        }
      });
    }));
  })
}

// -- Display all documents

exports.index = helpers.route(function(req, res, ctx) {
  var docs = Q_submit(helpers.form(ctx)
    .page(req.param('page') || '1')
    .query(Prismic.Predicates.at('document.type', 'post'))
    .fetchLinks([
      'post.date',
      'category.name',
      'author.full_name',
      'author.first_name',
      'author.surname',
      'author.company'
    ])
    .orderings("[my.post.date desc]"));
  var home = helpers.Q_getDocument(ctx, ctx.api.bookmarks['home']);
  var pages = Q_pages(ctx);

  Q.all([home, pages, docs]).then(function (result) {
    res.render('index', {
      home: result[0],
      pages: result[1],
      docs: result[2]
    });
  }).fail(function (err) {
    helpers.onPrismicError(err, req, res);
  });
});

exports.author = helpers.route(function(req, res, ctx) {
  var authorId = req.params['id'];
  var author = Q_submit(helpers.form(ctx)
    .query(Prismic.Predicates.at('document.id', authorId)));
  var docs = Q_submit(helpers.form(ctx)
    .page(req.param('page') || '1')
    .query(Prismic.Predicates.at('document.type', 'post'), Prismic.Predicates.at('my.post.author', authorId))
    .fetchLinks([
      'post.date',
      'category.name',
      'author.full_name',
      'author.first_name',
      'author.surname',
      'author.company'
    ])
    .orderings("[my.post.date desc]"));
  var home = helpers.Q_getDocument(ctx, ctx.api.bookmarks['home']);
  var pages = Q_pages(ctx);

  Q.all([home, author, pages, docs]).then(function (result) {
    if (result[1].results_size > 0) {
      res.render('author', {
        home: result[0],
        author: result[1].results[0],
        pages: result[2],
        docs: result[3]
      });
    } else {
      res.status(404).send('Not found');
    }
  }).fail(function (err) {
    helpers.onPrismicError(err, req, res);
  });
});

exports.archive = helpers.route(function(req, res, ctx) {
  try {
    var year = parseInt(req.params['year'], 10);
    var month = parseInt(req.params['month'], 10);
    var day = parseInt(req.params['day'], 10);
  } catch (ex) {
    res.status(404).send('Not found');
  }
  var lowerBound, upperBound;
  if (!month) {
    lowerBound = moment(year + "-01-01", "YYYY-MM-DD");
    upperBound = moment((year + 1) + "-01-01", "YYYY-MM-DD");
  } else if (!day) {
    lowerBound = moment(year + '-' + month + '-01');
    upperBound = lowerBound.clone()
    lowerBound.subtract(1, 'day');
    upperBound.endOf('month')
  } else {
    lowerBound = moment(year + '-' + month + '-' + day);
    upperBound = lowerBound.clone()
    upperBound.add(1, 'day');
  }
  var docs = Q_submit(helpers.form(ctx)
    .page(req.param('page') || '1')
    .query(
      Prismic.Predicates.at('document.type', 'post'),
      Prismic.Predicates.dateBetween('my.post.date', lowerBound.toDate(), upperBound.toDate()))
    .fetchLinks([
      'post.date',
      'category.name',
      'author.full_name',
      'author.first_name',
      'author.surname',
      'author.company'
    ])
    .orderings("[my.post.date desc]"));
  var home = helpers.Q_getDocument(ctx, ctx.api.bookmarks['home']);
  var pages = Q_pages(ctx);

  Q.all([home, pages, docs]).then(function (result) {
    res.render('index', {
      home: result[0],
      pages: result[1],
      docs: result[2]
    });
  }).fail(function (err) {
    helpers.onPrismicError(err, req, res);
  });
});

// -- Display a page

exports.page = helpers.route(function(req, res, ctx) {
  var uid = req.params['uid'];

  var doc = Q_submit(helpers.form(ctx)
    .query(Prismic.Predicates.at('my.page.uid', uid))
    .fetchLinks([
      'post.date',
      'category.name',
      'author.full_name',
      'author.first_name',
      'author.surname',
      'author.company'
    ])).then(function(res) {
      return (res && res.results && res.results.length) ? res.results[0] : undefined;
  });
  var home = helpers.Q_getDocument(ctx, ctx.api.bookmarks['home']);
  var pages = Q_pages(ctx);

  Q.all([home, pages, doc]).then(function (result) {
    if (!result[2]) {
      res.send(404, 'Sorry, we cannot find that!');
      return;
    }
    res.render('page', {
      home: result[0],
      pages: result[1],
      post: result[2]
    });
  }).fail(function (err) {
    helpers.onPrismicError(err, req, res);
  });
});

// -- Display a given document

exports.post = helpers.route(function(req, res, ctx) {
  var uid = req.params['uid'];

  var doc = Q_submit(helpers.form(ctx)
    .query(Prismic.Predicates.at('my.post.uid', uid))
    .fetchLinks([
      'post.date',
      'category.name',
      'author.full_name',
      'author.first_name',
      'author.surname',
      'author.company'
    ])).then(function(res) {
      return (res && res.results && res.results.length) ? res.results[0] : undefined;
  });
  var home = helpers.Q_getDocument(ctx, ctx.api.bookmarks['home']);
  var pages = Q_pages(ctx);

  Q.all([home, pages, doc]).then(function (result) {
    if (!result[2]) {
      res.send(404, 'Sorry, we cannot find that!');
      return;
    }
    res.render('detail', {
      home: result[0],
      pages: result[1],
      post: result[2]
    });
  }).fail(function (err) {
    helpers.onPrismicError(err, req, res);
  });
});

// -- Search in documents

exports.search = helpers.route(function(req, res, ctx) {
  var q = req.query['q'];

  var docs = Q_submit(helpers.form(ctx)
    .page(req.param('page') || '1')
    .query(Prismic.Predicates.fulltext('document', q))
    .fetchLinks([
      'post.date',
      'category.name',
      'author.full_name',
      'author.first_name',
      'author.surname',
      'author.company'
    ])
    .orderings("[my.post.date desc]"));
  var home = helpers.Q_getDocument(ctx, ctx.api.bookmarks['home']);
  var pages = Q_pages(ctx);

  Q.all([home, pages, docs]).then(function (result) {
    res.render('search', {
      q: q,
      home: result[0],
      pages: result[1],
      docs: result[2]
    });
  }).fail(function (err) {
    helpers.onPrismicError(err, req, res);
  });

});

// -- Preview documents from the Writing Room

exports.preview = helpers.route(function(req, res, ctx) {
  var token = req.query['token'];

  if (token) {
    ctx.api.previewSession(token, ctx.linkResolver, '/', function(err, url) {
      res.cookie(helpers.previewCookie, token, { maxAge: 30 * 60 * 1000, path: '/', httpOnly: false });
      res.redirect(301, url);
    });
  } else {
    res.send(400, "Missing token from querystring");
  }
});
