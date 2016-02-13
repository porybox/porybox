var ng = require('angular');
require("./home/home.module");

var porybox = ng.module("porybox", [
	"porybox.home"
]);

ng.bootstrap(document, ['porybox']);
