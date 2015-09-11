module.exports = function(grunt) {

    grunt.loadNpmTasks('grunt-browser-sync');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-less');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-html2js');

    // Project configuration.
    grunt.initConfig({
        // Copy the needed file for release
        copy: {
            release: {
                files: [
                    {
                        dot: true, //copy hidden files
                        expand: true,
                        cwd: 'src/',
                        src: ['index.html', 'partials/**/*.html', 'js/**/*.js', 'assets/css/main.css', 'assets/images/**', 'assets/vendors/**', 'api/**'],
                        dest: 'bin'
                    }
                ]
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
            files: 'src/assets/css/**/*.less',
            tasks: ['less']
        }
    });

    // tasks
    grunt.registerTask('serverwatch', ['browserSync', 'watch']);
    grunt.registerTask('release', ['less:release', 'html2js:release', 'copy:release']);

};