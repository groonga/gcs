App.ApplicationController = Ember.Controller.extend();

App.DomainSearchController = Ember.ArrayController.extend({
  query: null,
  perPage: 5,
  start: 0,
  data: null,
  numStart: function() {
    return this.get('start') + 1;
  }.property('start'),
  numEnd: function() {
    return this.get('start') + this.get('numReceived');
  }.property('numReceived', 'start'),
  searched: function() {
    return !!this.data;
  }.property('data'),
  resultsAvailable: function() {
    return this.data && this.data.hits.found > 0;
  }.property('data'),
  numHits: function() {
    return this.data ? this.data.hits.found : 0;
  }.property('data'),
  numReceived: function() {
    return this.data ? this.data.hits.hit.length : 0;
  }.property('data'),
  content: function() {
    var data = this.get('data');
    if (!data) {
      return [];
    }
    var numStart = this.get('numStart');
    var content = data.hits.hit.map(function(hit, index) {
      var pairs = [];
      jQuery.each(hit.data, function(columnName, value) {
        pairs.push({columnName: columnName, value: value});
      });
      return {
        index: numStart + index,
        id: hit.id,
        data: pairs
      };
    });
    return content;
  }.property('data'),
  urlForRawRequest: function() {
    var domain = this.get('domain');
    if (!domain) {
      return '';
    }
    var searchURL = domain.get('searchURL');
    var params = this.get('paramsForRequest');
    var urlForRawRequest = searchURL + '?' + jQuery.param(params);
    return urlForRawRequest;
  }.property('paramsForRequest', 'domain'),
  paramsForRequest: function() {
    var domain = this.get('domain');
    if (!domain) {
      return {};
    }
    var returnFields = domain.get('indexFields').map(function(field) {
      return field.get('name');
    }).join(',');
    var params = {
      q:     this.get('query'),
      size:  this.get('perPage'),
      start: this.get('start'),
      'return-fields': returnFields
    };
    return params;
  }.property('query', 'perPage', 'start', 'domain', 'domain.indexFields'),
  reset: function() {
    this.set('data', null);
    this.set('start', 0);
  },
  executeSearch: function() {
    var self = this;
    var domain = this.get('domain');
    $.ajax({
      type: 'GET',
      url: domain.get('searchURL'),
      data: self.get('paramsForRequest'),
      dataType: 'jsonp',
      success: function(data) {
        self.set('data', data);
      }
    });
  },
  nextPageAvailable: function() {
    return this.get('start') + this.get('perPage') < this.get('numHits');
  }.property('start', 'perPage', 'numHits'),
  nextPage: function() {
    var newStart = this.get('start') + this.get('perPage');
    if (newStart < this.get('numHits')) {
      this.set('start', newStart);
      this.executeSearch();
    }
  },
  previousPageAvailable: function() {
    return this.get('start') > 0;
  }.property('start'),
  previousPage: function() {
    var newStart = this.get('start') - this.get('perPage');
    if (newStart < 0) {
      newStart = 0;
    }
    this.set('start', newStart);
    this.executeSearch();
  }
});

App.IndexController = Ember.ArrayController.extend({
  contentBinding: 'App.domains'
});

App.DomainController = Ember.ObjectController.extend({
  selectedAction: null
});

App.DomainShowController = Ember.ObjectController.extend({
});

App.Router = Ember.Router.extend({
  root: Ember.Route.extend({
    showIndex: Ember.State.transitionTo('root.index'),
    showSearch: Ember.State.transitionTo('domains.search'),
    showDomain: Ember.State.transitionTo('domains.show'),
    index: Ember.Route.extend({
      route: '/',
      connectOutlets: function(router, context) {
        router.get('applicationController').connectOutlet('index');
      }
    }),
    domains: Ember.Route.extend({
      route: 'domains/:domainName',
      connectOutlets: function(router, context) {
        router.get('applicationController').connectOutlet('domain', context);
      },
      serialize: function(router, context) {
        return {
          domainName: context.get('name')
        };
      },
      deserialize: function(router, params) {
        var domain = App.store.find(App.Domain, params.domainName);
        var deferred = Ember.$.Deferred();
        domain.addObserver('isLoaded', function() {
          deferred.resolve(domain);
        });
        return deferred.promise(domain);
      },
      show: Ember.Route.extend({
        route: '/',
        connectOutlets: function(router) {
          var domainController = router.get('domainController');
          var domain = domainController.get('content');
          domainController.set('selectedAction', 'About');
          domainController.connectOutlet('domainShow', domain);
        }
      }),
      search: Ember.Route.extend({
        route: '/search',
        connectOutlets: function(router) {
          var domainController = router.get('domainController');
          var domain = domainController.get('content');
          var domainSearchController = router.get('domainSearchController');
          domainController.set('selectedAction', 'Search');
          domainSearchController.set('domain', domain);
          domainSearchController.set('query', null);
          domainSearchController.reset();
          domainController.connectOutlet('domainSearch');
        },
        nextPage: function(router) {
          router.get('domainSearchController').nextPage();
        },
        previousPage: function(router) {
          router.get('domainSearchController').previousPage();
        }
      })
    }),
    loading: Em.State.extend({})
  })
});
