exports.install = function() {
	F.route('/*', view_dashboard);
	F.localize('/templates/*.html', ['compress']);
};

function view_dashboard() {
	var self = this;
	GETSCHEMA('Repository').get(self, self.callback('index'));
}