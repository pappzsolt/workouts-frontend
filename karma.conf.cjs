module.exports = function (config) {
  config.set({
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-firefox-launcher'),
      require('karma-jasmine-html-reporter'),
      require('karma-coverage'),
      require('@angular-devkit/build-angular/plugins/karma'),
    ],
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    browsers: ['FirefoxHeadless'],
    singleRun: true,
  });
};
