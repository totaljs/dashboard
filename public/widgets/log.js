WIDGET('Log', function() {
	var self = this;
	var Emessages, Etitle;

	self.make = function(size) {
		self.toggle('log');
		self.center(false);
		self.html('<div class="header"><i class="fa fa-search"></i><span></span></div><ul class="messages"></ul>');
		Emessages = self.find('.messages');
		Etitle = self.find('.header').find('span');
		self.element.on('mouseenter', 'li', function() {
			var el = $(this);
			el.attr('title', el.text());
		});
	};

	self.render = function(value, size, counter) {

		if (value.path !== self.options.path)
			return;

		Etitle.html(value.path);

		if (NOTMODIFIED(self.id, value.value))
			return;

		var builder = [];
		value.value.forEach(function(message) {
			builder.push('<li>{0}</li>'.format(Tangular.helpers.encode(message)));
		});
		builder.reverse();
		Emessages.html(builder.join(''));
	};

	self.resize = function(size) {
		self.refresh();
	};

}, function(config) {
	this.example = { type: '/var/log/nginx/error.log.1', value: ['Lorem ipsum', 'Lorem ipsum'] };
	this.preview = '/widgets/log.png';
	this.author = 'Peter Širka';
	this.title = 'Log';
	this.group = 'Monitoring';
	this.url = 'https://www.totaljs.com/dashboard/';
	this.type = ['logs'];
	this.sizes = ['2x2', '3x3', '4x4', '5x5', '6x6', '2x3', '2x4', '2x5', '2x6', '3x3', '3x4', '3x5', '3x6', '6x2', '6x3', '6x4', '5x2', '5x3', '5x4', '4x2', '4x3'];
	config('path', 'Path', '/var/log/nginx/error.log', '/modules/monitoring/codelist/logs/');
});