// Generated on 2014-06-22 using generator-angular-module 0.0.5
// jshint node: true
'use strict';

// # Globbing
// for performance reasons we're only matching one level down:
// 'test/spec/{,*/}*.js'
// use this if you want to recursively match all subfolders:
// 'test/spec/**/*.js'

module.exports = function (grunt) {

  // Load grunt tasks automatically
  require('load-grunt-tasks')(grunt);

  // Time how long tasks take. Can help when optimizing build times
  require('time-grunt')(grunt);

  // Define the configuration for all the tasks
  grunt.initConfig({

    // Project settings
    yeoman: {
      // configurable paths
      devApp: 'dev_app',
      src: 'src',
      builtModule: 'angular-parse-interface.js',
      minifiedModule: 'angular-parse-interface.min.js'
    },

    bump: {
      options: {
        files: ['bower.json', 'package.json'],
        updateConfigs: [],
        commit: true,
        commitMessage: 'Release v%VERSION%',
        commitFiles: ['bower.json', 'package.json'],
        createTag: true,
        tagName: 'v%VERSION%',
        tagMessage: 'Version %VERSION%',
        // NEVER change this.
        push: false,
        pushTo: 'upstream',
        gitDescribeOptions: '--tags --always --abbrev=1 --dirty=-d'
      }
    },

    // Empties folders to start fresh
    clean: {
      dist: {
        files: [{
          dot: true,
          src: [
            '.tmp',
            '<%= yeoman.builtModule %>',
            '<%= yeoman.minifiedModule %>'
          ]
        }]
      },
      server: '.tmp'
    },

    concat: {
      dist: {
        files: [
          {
            dest: '<%= yeoman.builtModule %>',
            src: [
              'src/module.js',
              'src/**/*.js'
            ]
          }
        ]
      }
    },

    // The actual grunt server settings
    connect: {
      options: {
        port: 9000,
        // Change this to '0.0.0.0' to access the server from outside.
        hostname: 'localhost',
        livereload: 35729
      },
      livereload: {
        options: {
          open: true,
          base: [
            '.tmp',
            'test',
            '<%= yeoman.devApp %>',
            '<%= yeoman.src %>'
          ]
        }
      },
      test: {
        options: {
          port: 9001,
          base: [
            '.tmp',
            'test',
            '<%= yeoman.devApp %>',
            '<%= yeoman.src %>'
          ]
        }
      },
      dist: {
        options: {
          base: '<%= yeoman.dist %>'
        }
      }
    },

    env: {
      test: {
        src: '.test_env'
      }
    },

    // Make sure code styles are up to par and there are no obvious mistakes
    jshint: {
      options: {
        jshintrc: '.jshintrc',
        reporter: require('jshint-stylish')
      },
      gruntfile: {
        src: ['Gruntfile.js']
      },
      scripts: {
        src: [
          '<%= yeoman.devApp %>/scripts/{,*/}*.js',
          'src/**/*.js'
        ]
      },
      e2eTests: {
        options: {
          jshintrc: 'test/e2e/.jshintrc'
        },
        src: ['test/e2e/spec/{,*/}*.js']
      },
      integrationTests: {
        options: {
          jshintrc: 'test/integration/.jshintrc'
        },
        src: ['test/integration/spec/{,*/}*.js']
      },
      unitTests: {
        options: {
          jshintrc: 'test/unit/.jshintrc'
        },
        src: ['test/unit/spec/{,*/}*.js']
      }
    },

    // Test settings
    karma: {
      options: {
        files: [
          // Add jasmine-matchers
          '../../node_modules/jasmine-expect/dist/jasmine-matchers.js',
          // This is obviously the core angular module
          '../../dev_app/bower_components/angular/angular.js',
          // This is the angular-mocks module, which adds a couple of utility functions (module, inject, maybe others)
          '../../dev_app/bower_components/angular-mocks/angular-mocks.js',
          // Other dependencies
          '../../dev_app/bower_components/angular-resource/angular-resource.js',
          // Utilities
          '../../dev_app/bower_components/lodash/dist/lodash.js',
          // The source files for the modules
          // eventBus module
          '../../src/modules/eventBus/ParseAppEventBus.js',
          // resource module
          '../../src/modules/resource/resourceModule.js',
          '../../src/modules/resource/*.js',
          // objectFactory module
          '../../src/modules/objectFactory/parseObjectFactory.js',
          // user module
          '../../src/modules/user/parseUser.js',
          // queryBuilder module
          '../../src/modules/queryBuilder/parseQueryBuilder.js',
          // main module
          '../../src/angularParseInterface.js',
          '../../src/*.js',
          // These are all the tests.
          'spec/**/*.js'
        ]
      },
      unitCI: {
        configFile: 'test/unit/karma.unit.ci.conf.js',
        singleRun: true
      },
      unitBuild: {
        configFile: 'test/unit/karma.unit.build.conf.js',
        singleRun: true
      },
      integrationCI: {
        configFile: 'test/integration/karma.integration.ci.conf.js',
        singleRun: true
      },
      integrationBuild: {
        configFile: 'test/integration/karma.integration.build.conf.js',
        singleRun: true
      }
    },

    // ngmin tries to make the code safe for minification automatically by
    // using the Angular long form for dependency injection. It doesn't work on
    // things like resolve or inject so those have to be done manually.
    ngmin: {
      dist: {
        files: [{
          src: '<%= yeoman.builtModule %>',
          dest: '<%= yeoman.minifiedModule %>'
        }]
      }
    },

    protractor: {
      options: {
        configFile: 'node_modules/protractor/referenceConf.js', // Default config file
        keepAlive: true, // If false, the grunt process stops when the test fails.
        noColor: false, // If true, protractor will not use colors in its output.
        args: {
          // Arguments passed to the command
        }
      },
      build: {
        options: {
          configFile: 'test/e2e/protractor.build.conf.js', // Target-specific config file
          args: {} // Target-specific arguments
        }
      },
      CI: {
        options: {
          configFile: 'test/e2e/protractor.ci.conf.js', // Target-specific config file
          args: {} // Target-specific arguments
        }
      }
    },

    uglify: {
      dist: {
        files: [{
          src: '<%= yeoman.minifiedModule %>',
          dest: '<%= yeoman.minifiedModule %>'
        }]
      }
    },

    // Watches files for changes and runs tasks based on the changed files
    watch: {
      bower: {
        files: ['bower.json'],
        tasks: ['wiredep']
      },
      gruntfile: {
        files: ['Gruntfile.js'],
        tasks: ['jshint:gruntfile']
      },
      scripts: {
        files: [
          '<%= yeoman.devApp %>/scripts/{,*/}*.js',
          'src/**/*.js'
        ],
        tasks: ['jshint:scripts', 'karma:unitCI'],
        options: {
          livereload: true
        }
      },
//      e2eTests: {
//        files: ['test/e2e/spec/{,*/}*.js'],
//        tasks: ['jshint:e2eTests', 'protractor:CI']
//      },
      integrationTests: {
        files: ['test/integration/spec/**/*.js'],
        tasks: ['jshint:integrationTests', 'karma:integrationCI']
      },
      unitTests: {
        files: ['test/unit/spec/**/*.js'],
        tasks: ['jshint:unitTests', 'karma:unitCI']
      },
      livereload: {
        options: {
          livereload: '<%= connect.options.livereload %>'
        },
        files: [
          '<%= yeoman.devApp %>/{,*/}*.html',
          '<%= yeoman.devApp %>/styles/{,*/}*.css',
          '<%= yeoman.devApp %>/images/{,*/}*.{png,jpg,jpeg,gif,webp,svg}'
        ]
      }
    },

    // Automatically inject Bower components into the app
    wiredep: {
      app: {
        src: ['<%= yeoman.devApp %>/index.html'],
        ignorePath: '<%= yeoman.devApp %>/'
//        , devDependencies: true
      }
    }
  });

  grunt.registerTask('serve', [
    'clean:server',
    'wiredep',
    'connect:livereload',
    'watch'
  ]);

  grunt.registerTask('server', function () {
    grunt.log.warn('The `server` task has been deprecated. Use `grunt serve` to start a server.');
    grunt.task.run(['serve']);
  });

  grunt.registerTask('test', function (target) {
    var setUpTasks = [
        'clean:server',
        'connect:test'
      ],
      unitTasks = [
        'karma:unitBuild'
      ],
      integrationTasks = [
        'karma:integrationBuild'
      ],
//      e2eTasks = [
//        'protractor:build'
//      ],
      tasks;
    if (target === 'unit') {
      tasks = setUpTasks.concat(unitTasks);
    } else if (target === 'integration') {
      tasks = setUpTasks.concat(integrationTasks);
//    } else if (target === 'e2e') {
//      tasks = setUpTasks.concat(e2eTasks);
    } else {
//      tasks = setUpTasks.concat(unitTasks).concat(integrationTasks).concat(e2eTasks);
      tasks = setUpTasks.concat(unitTasks).concat(integrationTasks);
    }

    grunt.task.run(tasks);
  });

  grunt.registerTask('build', function (target) {
    var testTasks = [
        'jshint:gruntfile',
        'jshint:scripts',
        'jshint:unitTests',
        'jshint:integrationTests',
//        'jshint:e2eTests',
        'test'
      ],
      buildTasks = [
        // Remove .tmp, built module file, minified module file
        'clean:dist',
        // Concatenates scripts from src into the built module file.
        'concat',
        // Adds explicit declaration of dependencies. Updated content is saved as minified module file.
        'ngmin:dist',
        // Uglifies minified module file.
        'uglify:dist'
      ];

    if (target === 'notest') {
      grunt.task.run(buildTasks);
    } else {
      grunt.task.run(testTasks.concat(buildTasks));
    }
  });

  grunt.registerTask('default', ['build']);
};