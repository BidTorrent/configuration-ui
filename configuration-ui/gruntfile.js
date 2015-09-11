module.exports = function(grunt) {

    grunt.loadNpmTasks('grunt-browser-sync');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-less');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-html2js');

    var pkg = grunt.file.readJSON("package.json");

    // Project configuration.
    grunt.initConfig({

        // package.json
        pkg: pkg,

        // Copy the needed file for release
        copy: {
            release: {
                files: [
                    {
                        dot: true, //copy hidden files
                        expand: true,
                        cwd: 'src/',
                        src: ['assets/css/main.css', 'assets/images/**', 'assets/vendors/**', 'api/**'],
                        dest: 'bin'
                    }
                ]
            },
            indexrelease: {
                //index.php
                options: {
                    processContent: function (content, srcpath) {
                        var template = { version: pkg.version, today: grunt.template.today("dd-mm-yyyy"), build: "release", bust: Date.now() };
                        return grunt.template.process(content, {data: template});
                    }
                },
                src: 'src/index.tpl.html',
                dest: 'bin/index.html'
            },
            indexdebug: {
                //index.php
                options: {
                    processContent: function (content, srcpath) {
                        var template = { version: pkg.version, today: grunt.template.today("dd-mm-yyyy"), build: "debug" };
                        return grunt.template.process(content, {data: template});
                    }
                },
                src: 'src/index.tpl.html',
                dest: 'src/index.html'
            }
        },
        // Compile less files
        less: {
            debug: {
                options: {
                },
                files: {
                    "src/assets/css/main.css": "src/assets/css/main.less"
                }
            },
            release: {
                options: {
                    cleancss: true,
                    compress: true
                },
                files: {
                    "src/assets/css/main.css": "src/assets/css/main.less"
                }
            }
        },

        // compile the html views into js
        html2js: {
            release: {
                src: ['src/partials/*.html'],
                dest: 'src/partials/templates.js'
            },
        },

        uglify: {
            options: {
                mangle: true
            },
            release: {
                files: {
                    'bin/js/bidtorrent.min.js': [
                        'src/partials/templates.js',
                        'src/js/app.js',
                        'src/js/controllers/*.js',
                        'src/js/services/*.js'
                    ]
                }
            }
        },
        // Sync browser in development
        browserSync: {
            dev: {
                bsFiles: {
                    src : [
                        'src/**/*.js',
                        'src/**/*.css',
                        'src/**/*.html'
                    ]
                },
                options: {
                    watchTask: true,
                    server: './src'
                }
            }
        },
        // watch task
        watch: {
            less: {
                files: 'src/assets/css/**/*.less',
                tasks: ['less']
            },
            index: {
                files: 'src/index.tpl.html',
                tasks: ['copy:indexdebug']
            },
            templates: {
                files: 'src/partials/*.html',
                tasks: ['html2js:release']
            },
        }
    });

    // tasks
    grunt.registerTask('serverwatch', ['browserSync', 'watch']);
    grunt.registerTask('watchdev', ['html2js:release', 'copy:indexdebug', 'less', 'watch']);
    grunt.registerTask('release', ['less:release', 'html2js:release', 'copy:release', 'copy:indexrelease', 'uglify:release']);

};