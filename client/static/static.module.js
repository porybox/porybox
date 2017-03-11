const ng = require('angular');
ng.module('porybox.static', ['ngRoute']).config(['$routeProvider', $routeProvider => {
  [
    'about',
    'donate',
    'extracting-pokemon-files',
    'faq',
    'how-to-pk6-1-bvs',
    'how-to-pk6-2-homebrew',
    'how-to-pk6-3-4-save-files',
    'how-to-pk6-6-decrypted-powersaves',
    'how-to-pk7-1-bvs',
    'how-to-pk7-2-homebrew',
    'how-to-pk7-3-digital-save-files',
    'how-to-pk7-4-tea',
    'markdown',
    'privacy-policy',
    'tos'
  ].forEach(pageName => {
    $routeProvider.when(`/${pageName}`, {templateUrl: `/static/${pageName}.html`});
  });

  $routeProvider.when('/extracting-pk6-files', {redirectTo: '/extracting-pokemon-files'});
}]);
