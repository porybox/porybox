const ng = require('angular');
ng.module('porybox.static', ['ngRoute']).config(['$routeProvider', $routeProvider => {
  [
    'about',
    'donate',
    'extracting-pk6-files',
    'faq',
    'how-to-pk6-1-bvs',
    'how-to-pk6-2-homebrew',
    'how-to-pk6-3-4-save-files',
    'how-to-pk6-6-decrypted-powersaves',
    'markdown',
    'privacy-policy',
    'tos'
  ].forEach(pageName => {
    $routeProvider.when(`/${pageName}`, {templateUrl: `/static/${pageName}.html`});
  });
}]);
