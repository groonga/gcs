App.ApplicationView = Ember.View.extend({
  templateName: 'application'
});

App.IndexView = Ember.View.extend({
  templateName: 'index'
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

App.IndexView = Ember.View.extend({
  templateName: 'index'
});

App.DomainView = Ember.View.extend({
  templateName: 'domain',
  selectedActionBinding: 'controller.selectedAction',

  NavItemView: Ember.View.extend({
    tagName: 'li',
    classNameBindings: 'isActive:active'.w(),
    isActive: function() {
      return this.get('item') === this.get('parentView.selectedAction');
    }.property('item', 'parentView.selectedAction')
  })
});

App.DomainShowView = Ember.View.extend({
  templateName: 'domain-show'
});
