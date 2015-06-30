module.exports = function(grunt) {

    grunt.loadNpmTasks('grunt-browser-sync');
    grunt.loadNpmTasks('grunt-contrib-less');
    grunt.loadNpmTasks('grunt-contrib-watch');

    // Project configuration.
    grunt.initConfig({
        // Compile less files
        less: {
            release: {
                options: {
/*                    cleancss: true,
                    compress: true*/
                },
                files: {
                    "src/assets/css/main.css": "src/assets/css/main.less"
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
            files: 'src/assets/css/**/*.less',
            tasks: ['less']
        }
    });

    //task
    grunt.registerTask('serverwatch', ['browserSync', 'watch']);

};