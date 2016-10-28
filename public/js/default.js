window.TAU = 2 * Math.PI;
var common = {};

// Current page
common.page = '';

// Current form
common.form = '';

// Current subform
common.subform = '';

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

jR.route('/', function() {
	SET('common.page', 'dashboard');
	WAIT(function() {
		return window.dashboard_new;
	}, function() {
		dashboard_new();
	});
});

jR.route('/{id}/', function(id) {
	SET('common.page', 'dashboard');
	WAIT(function() {
		return window.dashboard_load;
	}, function() {
		dashboard_load(id);
	});
});

jR.on('location', function(url) {
	var nav = $('header nav');
	nav.find('.selected').removeClass('selected');
	nav.find('a[href="' + url + '"]').addClass('selected');
	$('header nav').removeClass('mainmenu-visible');
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

function mainmenu() {
	$('header nav').toggleClass('mainmenu-visible');
}

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