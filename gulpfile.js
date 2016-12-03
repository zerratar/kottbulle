var gulp = require('gulp')
var spawn = require('child_process').spawn

gulp.task('watch', () => {
  gulp.watch([
    './scripts/*.ks',
    './project_templates/**/templates/*.js',
    './project_templates/**/templates/*.vue',
    './project_templates/**/templates/*.html'
  ], () => {
    spawn('node', ['build/app.js'], { stdio: 'inherit' })
  })
})

gulp.task('default', ['watch'], () => {
  //
});