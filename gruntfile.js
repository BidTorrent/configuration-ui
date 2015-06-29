module.exports = function(grunt) {

  // Load the plugin that provides the "uglify" task.
  grunt.loadNpmTasks('grunt-contrib-connect');

  // Project configuration.
  grunt.initConfig({
    connect: {
      server: {
        options: {
          port: 9000,
          base: 'src',
          keepalive: true
        }
      }
    }
  });

  // Default task(s).
  grunt.registerTask('server', ['connect:server']);

};