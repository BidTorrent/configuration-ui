# configuration-ui
UI for the configuration website of bidTorrent: http://www.bidtorrent.io

## Building the project

* [install npm](https://www.npmjs.com/#getting-started)
* install grunt cli with `npm install grunt-cli -g` to have grunt in your path
* install all the node modules by running `npm install`
* install bower by running `npm install bower -g`
* install all the bower component by running `bower install`

## Run the website locally for dev

* run `grunt serverwatch` and connect to `localhost:3000` for dev

## Package the app for release

* run `grunt release` to package the app in the bin/ folder.
* run `grunt connect` to test it locally