F.onAuthorize = function(req, res, flags, next) {
	var user = {};
	user.id = 'a071a8db7f8bb9ed8bc5';
	user.name = 'Peter Širka';
	user.photo = '/img/petersirka.jpg';
	next(true, user);
};