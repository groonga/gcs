App.WithDomain = Ember.Mixin.create({
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
  connectDomainOutlet: function(router, domain) {
    var applicationController = router.get('applicationController');
    applicationController.set('selected', ['Domain', domain.get('name')]);
    applicationController.connectOutlet('domain', domain);
  }
});

App.Router = Ember.Router.extend({
  root: Ember.Route.extend({
    gotoIndex: Ember.State.transitionTo('root.index'),
    gotoDomainSearch: Ember.State.transitionTo('domains.search'),
    gotoDomainShow: Ember.State.transitionTo('domains.show'),
    index: Ember.Route.extend({
      route: '/',
      connectOutlets: function(router) {
        var applicationController = router.get('applicationController');
        applicationController.set('selected', ['Home']);
        applicationController.connectOutlet('index');
      }
    }),
    domains: Ember.Route.extend({
      route: 'domains',
      show: Ember.Route.extend(App.WithDomain, {
        route: ':domainName',
        connectOutlets: function(router, domain) {
          this.connectDomainOutlet(router, domain);
          var domainController = router.get('domainController');
          domainController.set('selectedAction', 'About');
          domainController.connectOutlet('domainShow', domain);
        }
      }),
      search: Ember.Route.extend(App.WithDomain, {
        route: ':domainName/search',
        connectOutlets: function(router, domain) {
          this.connectDomainOutlet(router, domain);
          var domainController = router.get('domainController');
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
