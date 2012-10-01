var App = Ember.Application.create();

App.ApplicationController = Ember.Controller.extend();

App.ApplicationView = Ember.View.extend({
  templateName: 'application'
});

App.IndexView = Ember.View.extend({
  templateName: 'index'
});

App.Domain = Ember.Object.extend({
  name: null,
  endpoint: null,
  configurationEndpoint: null,
  fieldNames: [],
  didLoad: false,

  searchEndpoint: function() {
    return 'http://' + this.get('endpoint') + '/2011-02-01/search';
  }.property('endpoint'),
  fetchFields: function() {
    var self = this;
    $.ajax({
      type: 'GET',
      url:  this.get('configurationEndpoint'),
      data: {
        Version:    '2011-02-01',
        Action:     'DescribeIndexFields',
        DomainName: this.get('name')
      },
      dataType: 'xml',
      success: function(data) {
        var fieldNames = [];
        $(data).find('IndexFields > member')
        .each(function(index) {
          var field = $(this);
          fieldNames.push(field.find('IndexFieldName').text());
        });
        self.set('fieldNames', fieldNames);
        self.set('didLoad', true);
      }
    });
  }
});

App.Domain.reopenClass({
  host: location.host,
  get configurationEndpoint() {
    return 'http://' + this.host + '/';
  },
  all: null,
  findAll: function() {
    var domains = Ember.ArrayProxy.create({
      content: Ember.A(),
      didLoad: false
    });
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
          var endpoint = domainElement.find('SearchService > Endpoint').text();
          var domain = App.Domain.create({
            name: name,
            endpoint: endpoint,
            configurationEndpoint: self.configurationEndpoint
          });
          domain.fetchFields();
          domains.pushObject(domain);
        });
        domains.set('didLoad', true);
      }
    });
    return domains;
  },
  find: function(name) {
    var deferred = $.Deferred();
    var domains = this.findAll();
    domains.addObserver('didLoad', function() {
      var domain = domains.findProperty('name', name);
      domain.addObserver('didLoad', function() {
        deferred.resolve(domain);
      });
    });
    return deferred.promise();
  }
});

App.SearchController = Ember.ArrayController.extend({
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
    var searchEndpoint = domain.get('searchEndpoint');
    var params = this.get('paramsForRequest');
    var urlForRawRequest = searchEndpoint + '?' + jQuery.param(params);
    return urlForRawRequest;
  }.property('paramsForRequest', 'domain'),
  paramsForRequest: function() {
    var domain = this.get('domain');
    if (!domain) {
      return {};
    }
    var returnFields = domain.fieldNames ? domain.fieldNames.join(',') : [];
    var params = {
      q:     this.get('query'),
      size:  this.get('perPage'),
      start: this.get('start'),
      'return-fields': returnFields
    };
    return params;
  }.property('query', 'perPage', 'start', 'domain'),
  reset: function() {
    this.set('data', null);
    this.set('start', 0);
  },
  executeSearch: function() {
    var self = this;
    var domain = this.get('domain');
    $.ajax({
      type: 'GET',
      url: domain.get('searchEndpoint'),
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

App.SearchView = Ember.View.extend({
  templateName: 'search'
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

App.domains = App.Domain.findAll();

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

App.DomainsRoute = Ember.Route.extend({
  serialize: function(router, context) {
    return {
      domainName: context.name
    };
  },
  deserialize: function(router, params) {
    return App.Domain.find(params.domainName);
  }
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
      route: 'domains',
      show: App.DomainsRoute.extend({
        route: ':domainName',
        connectOutlets: function(router, context) {
          router.get('applicationController').connectOutlet('domain', context);
        }
      }),
      search: App.DomainsRoute.extend({
        route: ':domainName/search',
        connectOutlets: function(router, context) {
          var controller = router.get('searchController');
          controller.set('domain', context);
          controller.set('query', null);
          controller.reset();
          router.get('domainController').connectOutlet('search');
        },
        nextPage: function(router) {
          router.get('searchController').nextPage();
        },
        previousPage: function(router) {
          router.get('searchController').previousPage();
        }
      })
    }),
    loading: Em.State.extend({})
  })
});
