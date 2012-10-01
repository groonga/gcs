App.Router = Ember.Router.extend({
  root: Ember.Route.extend({
    showIndex: Ember.State.transitionTo('root.index'),
    showSearch: Ember.State.transitionTo('domains.search'),
    showDomain: Ember.State.transitionTo('domains.show'),
    index: Ember.Route.extend({
      route: '/',
      connectOutlets: function(router, context) {
        var applicationController = router.get('applicationController');
        applicationController.set('selected', null);
        applicationController.connectOutlet('index');
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
        // FIXME never called... why?
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
          var applicationController = router.get('applicationController');
          var domainController = router.get('domainController');
          var domain = domainController.get('content');
          domainController.set('selectedAction', 'About');
          applicationController.set('selected', domain.get('name'));
          domainController.connectOutlet('domainShow', domain);
        }
      }),
      search: Ember.Route.extend({
        route: '/search',
        connectOutlets: function(router) {
          var applicationController = router.get('applicationController');
          var domainController = router.get('domainController');
          var domain = domainController.get('content');
          var domainSearchController = router.get('domainSearchController');
          domainController.set('selectedAction', 'Search');
          domainSearchController.set('domain', domain);
          applicationController.set('selected', domain.get('name'));
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
