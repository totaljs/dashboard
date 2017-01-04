window.TAU = 2 * Math.PI;
var common = {};

// Current page
common.page = '';

// Current form
common.form = '';

// Current subform
common.subform = '';

common.default = false;

ON('@calendar', function(component) {
	window.MONTHS = component.months;
	window.MONTHS_SHORT = component.months_short;
	window.DAYS = component.days;
	window.DAYS_SHORT = component.days_short;
});

$(document).ready(function() {
	jR.clientside('.jrouting');
	FIND('loading', FN('() => this.hide(500)'));
	$('.mainmenu-logo').on('click', function() {
		jR.redirect('/');
	});
});

function isError(arguments) {
	return false;
}

$(window).on('hashchange', function() {
	var hash = location.hash.substring(1);
	if (hash)
		dashboard_load(hash);
	else
		dashboard_new();
});

jR.route('/', function() {
	SET('common.page', 'dashboard');
	WAIT(function() {
		return window.dashboard_new;
	}, function() {
		var id = location.hash || CACHE('default');
		if (id && !common.default) {
			id = id.replace('#', '');
			location.hash = id;
			dashboard_load(id);
		} else
			dashboard_browse();
		common.default = true;
	});
});

Tangular.register('default', function(value, def) {
	return value == null || value === '' ? def : value;
});

Tangular.register('indexer', function(index) {
	return index + 1;
});

Tangular.register('join', function(value) {
	return value ? value.join(',') : '';
});

function IMPORTSET(check, name, value) {

	if (window[check]) {
		name && SET(name, value, 100);
		return true;
	}

	SETTER('loading', 'show');
	IMPORT('ONCE /templates/' + value + '.html', function() {
		name && SET(name, value);
		SETTER('loading', 'hide', 500);
	});
	return false;
}

Tangular.register('preview', function(value) {
	return value ? value : '/img/empty.png';
});

Number.prototype.filesize = function(decimals, type) {

	if (typeof(decimals) === 'string') {
		var tmp = type;
		type = decimals;
		decimals = tmp;
	}

	var value;

	// this === bytes
	switch (type) {
		case 'bytes':
			value = this;
			break;
		case 'KB':
			value = this / 1024;
			break;
		case 'MB':
			value = filesizehelper(this, 2);
			break;
		case 'GB':
			value = filesizehelper(this, 3);
			break;
		case 'TB':
			value = filesizehelper(this, 4);
			break;
		default:

			type = 'bytes';
			value = this;

			if (value > 1023) {
				value = value / 1024;
				type = 'KB';
			}

			if (value > 1023) {
				value = value / 1024;
				type = 'MB';
			}

			if (value > 1023) {
				value = value / 1024;
				type = 'GB';
			}

			if (value > 1023) {
				value = value / 1024;
				type = 'TB';
			}

			break;
	}

	type = ' ' + type;
	return (decimals === undefined ? value.format(2).replace('.00', '') : value.format(decimals)) + type;
};

function filesizehelper(number, count) {
	while (count--) {
		number = number / 1024;
		if (number.toFixed(3) === '0.000')
			return 0;
	}
	return number;
}