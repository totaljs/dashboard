WIDGET('Top', function() {

	var body;
	var self = this;

	self.make = function(size) {
		self.toggle('top');
		self.center(false);
		self.append('<div class="header"><i class="fa fa-fa-angle-double-up"></i>Top processes</div><div class="processes"></div>');
		body = self.find('.processes');
		self.element.on('mouseenter', '.process', function() {
			var el = $(this);
			!el.attr('title') && el.attr('title', el.find('.name').html());
		});
	};

	self.render = function(value, size, counter) {
		if (NOTMODIFIED(self.id, value))
			return;
		var builder = [];
		value.forEach(function(item) {
			builder.push('<div class="process"><div class="cpu">{0}%<i class="fa fa-microchip"></i></div><div class="memory">{1}</div><div class="name">{2}</div></div>'.format(item.cpu.format(1), item.memory.filesize(), item.name));
		});
		body.html(builder.join(''));
	};

	self.resize = function(size) {
		self.refresh();
	};

	self.state = function(type, changes) {
		self.refresh();
	};

}, function(config, inject) {
	this.example = [{ user: 'root', pid: 13473, cpu: 1.4, memory: 65187840, name: 'total: warstore' }, { user: 'root', pid: 13231, cpu: 1.1, memory: 54710272, name: 'total: total.js' }, { user: 'root', pid: 2756, cpu: 0.9, memory: 48832512, name: 'total: dashboar' }];
	this.preview = '/widgets/top.png';
	this.author = 'Peter Širka';
	this.title = 'Top Processes';
	this.category = 'Monitoring';
	this.url = 'https://www.totaljs.com/dashboard/';
	this.type = ['top'];
	this.sizes = ['2x2', '3x3', '2x3', '2x4', '3x4'];
	this.group = 'Monitoring';
	config('background', 'Background Color', 'red', 'Color');
	config('color', 'Font Color', 'white', 'Color');
});