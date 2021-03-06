// Karma configuration
// http://karma-runner.github.io/0.12/config/configuration-file.html
// Generated on 2014-05-31 using
// generator-karma 0.8.1

module.exports = function(config) {
  config.set({
    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: true,

    // base path, that will be used to resolve files and exclude
    basePath: '',

    // testing framework to use (jasmine/mocha/qunit/...)
    frameworks: ['jasmine'],

    // list of files / patterns to load in the browser
    files: [
//      // Add jasmine-matchers
//      '../../node_modules/jasmine-expect/dist/jasmine-matchers.js',
//      // This is obviously the core angular module
//      '../../dev_app/bower_components/angular/angular.js',
//      // This is the angular-mocks module, which adds a couple of utility functions (module, inject, maybe others)
//      '../../dev_app/bower_components/angular-mocks/angular-mocks.js',
//      // Other dependencies
//      '../../dev_app/bower_components/angular-resource/angular-resource.js',
//      // Utilities
//      '../../dev_app/bower_components/lodash/dist/lodash.js',
//      // The source files for the module
//      '../../src/angularParseInterface.js',
//      '../../src/*.js',
//      // These are all the tests.
//      'spec/**/*.js'
    ],

    // list of files / patterns to exclude
    exclude: [],

    // web server port
    port: 8080,

    // Start these browsers, currently available:
    // - Chrome
    // - ChromeCanary
    // - Firefox
    // - Opera
    // - Safari (only Mac)
    // - PhantomJS
    // - IE (only Windows)
    browsers: [
      // For single runs, PhantomJS is fastest.
      'PhantomJS'
    ],

    // Which plugins to enable
    plugins: [
      'karma-phantomjs-launcher',
      'karma-jasmine'
    ],

    // Continuous Integration mode
    // if true, it capture browsers, run tests and exit
    singleRun: false,

    colors: true,

    // level of logging
    // possible values: LOG_DISABLE || LOG_ERROR || LOG_WARN || LOG_INFO || LOG_DEBUG
    logLevel: config.LOG_INFO

    // Uncomment the following lines if you are using grunt's server to run the tests
    // proxies: {
    //   '/': 'http://localhost:9000/'
    // },
    // URL root prevent conflicts with the site root
    // urlSegment1: '_karma_'
  });
};
