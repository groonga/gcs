var App = Ember.Application.create();

App.Adapter = DS.Adapter.extend({
  findAll: function(store, type) {
    if (type === App.Domain) {
      var self = this;
      $.ajax({
        type: 'GET',
        url:  self.configurationEndpoint,
        data: {
          Version: '2011-02-01',
          Action:  'DescribeDomains'
        },
        dataType: 'xml',
        success: function(data) {
          var domainStatusMembers = $(data).find('DomainStatusList > member');
          domainStatusMembers.each(function(index) {
            var domainElement = $(this);
            var name = domainElement.find('DomainName').text();
            var searchEndpoint = domainElement.find('SearchService > Endpoint').text();
            var docEndpoint = domainElement.find('DocService > Endpoint').text();

            var self = this;
            $.ajax({
              type: 'GET',
              url:  self.configurationEndpoint,
              data: {
                Version:    '2011-02-01',
                Action:     'DescribeIndexFields',
                DomainName: name
              },
              dataType: 'xml',
              success: function(data) {
                var indexFields = [];
                $(data).find('IndexFields > member').each(function(index) {
                  var field = $(this);
                  var name = field.find('IndexFieldName').text();
                  indexFields.push({
                    id: name,
                    name: name
                  });
                });

                var domain = {
                  id: name,
                  name: name,
                  search_endpoint: searchEndpoint,
                  doc_endpoint: docEndpoint,
                  index_fields: indexFields,
                  configuration_endpoint: self.configurationEndpoint
                };
                store.load(type, name, domain);
              }
            });
          });
        }
      });
    } else {
      throw "Unspported model";
    }
  },
  find: function(store, type, id) {
    this.findAll(store, type); // Fetch all for the simplicity
  }
});

App.configurationEndpoint = 'http://' + location.host + '/';

App.store = DS.Store.create({
  revision: 4,
  adapter: App.Adapter.create({
    configurationEndpoint: App.configurationEndpoint
  })
});

App.IndexField = DS.Model.extend({
  name: DS.attr('string')
});

App.Domain = DS.Model.extend({
  name: DS.attr('string'),
  searchEndpoint: DS.attr('string'),
  docEndpoint: DS.attr('string'),
  searchURL: function() {
    return 'http://' + this.get('searchEndpoint') + '/2011-02-01/search';
  }.property('endpoint'),
  indexFields: DS.hasMany('App.IndexField', {embedded: true}),
  configurationEndpoint: DS.attr('string')
});

App.ApplicationController = Ember.Controller.extend();

App.ApplicationView = Ember.View.extend({
  templateName: 'application'
});

App.IndexView = Ember.View.extend({
  templateName: 'index'
});

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

App.DomainSearchView = Ember.View.extend({
  templateName: 'domain-search'
});

App.SearchFormView = Ember.View.extend({
  tagName: 'form',
  classNames: ['form-search'],

  submit: function(event) {
    var query = this.get('controller.query');
    var controller = this.get('controller');
    controller.reset();
    controller.executeSearch();

    event.preventDefault();
  }
});

App.domains = App.store.findAll(App.Domain);

App.IndexController = Ember.ArrayController.extend({
  contentBinding: 'App.domains'
});

App.IndexView = Ember.View.extend({
  templateName: 'index'
});

App.DomainController = Ember.ObjectController.extend({
});

App.DomainView = Ember.View.extend({
  templateName: 'domain'
});

App.DomainShowController = Ember.ObjectController.extend({
});

App.DomainShowView = Ember.View.extend({
  templateName: 'domain-show'
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
          domainController.connectOutlet('domainShow', domain);
        }
      }),
      search: Ember.Route.extend({
        route: '/search',
        connectOutlets: function(router) {
          var domainController = router.get('domainController');
          var domain = domainController.get('content');
          var domainSearchController = router.get('domainSearchController');
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
