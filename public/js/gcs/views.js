App.ApplicationView = Ember.View.extend({
  templateName: 'application',
  selectedBinding: 'controller.selected',

  NavItemView: Ember.View.extend({
    tagName: 'li',
    classNameBindings: 'isActive:active'.w(),
    isActive: function() {
      var thisKey = [this.get('section'), this.get('item')||null].compact();
      var selectedKey = this.get('parentView.selected');
      return JSON.stringify(thisKey) === JSON.stringify(selectedKey);
    }.property('section', 'item', 'parentView.selected')
  })
});

App.IndexView = Ember.View.extend({
  templateName: 'index'
});

App.DomainSearchView = Ember.View.extend({
  templateName: 'domain-search',

  SearchFormView: Ember.View.extend({
    tagName: 'form',
    classNames: ['form-search'],

    submit: function(event) {
      var query = this.get('controller.query');
      var controller = this.get('controller');
      controller.reset();
      controller.executeSearch();

      event.preventDefault();
    }
  })
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

App.DomainCreateView = Ember.View.extend({
  templateName: 'domain-create',

  DomainCreateFormView: Ember.View.extend({
    tagName: 'form',
    classNames: 'form-horizontal',

    submit: function(event) {
    }
  })
});
