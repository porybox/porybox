// Karma configuration
// Generated on Sat Feb 13 2016 15:22:35 GMT+0000 (GMT)

module.exports = function(config) {
  config.set({

    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: '',
    frameworks: ['browserify', 'mocha', 'chai', 'dirty-chai'],
    files: [
      'node_modules/babel-polyfill/dist/polyfill.js',
      'node_modules/angular/angular.js',
      'node_modules/angular-mocks/angular-mocks.js',
      'client/**/*.spec.js'
    ],
    exclude: [
    ],
    preprocessors: {
      'client/**/*.spec.js': ['browserify']
    },

    browserify: {
      debug: true,
      transform: [
        ['babelify']
      ]
    },
    reporters: ['progress'],
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: true,
    browsers: ['PhantomJS'],
    singleRun: false,
    concurrency: Infinity
  });
};
