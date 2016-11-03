# Pathfinding

An HTML5 visualization of tree-search algorithms using a  tilemap.

## Tiled Map Editor

The [Tiled Map Editor](http://www.mapeditor.org/) is one of the most popular open-source tile map editors available today.  It was used to create the tilemap used in this example, which is saved in the tilemaps directory as _example_tilemap.tmx_.  Tiled's native file format, TMX, is a custom XML extension, and as such is both human-readable and easily parsed.

Tiled also supports exporting tilemaps as a [JSON](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON"), which is a very popular serilization format and is almost identical to native JavaScript object declarations.  You can see the exported JSON file in _example_tilemap.json_.  Compare it with the TMX version.

## Browserify

[Browserify](http://browserify.org) is a tool for using Node's package manager to bundle JavaScript files into a single bundle to be included in a website. In this example, that bundle is _bundle.js_ and is build from several individual files:

* _src/game.js_ is the primary JavaScript file for the game
* _src/tilemap.js_ is the tilemap engine module
* _tilemaps/example_tilemap.js_ contains a single tilemap's data

Note that both tilemap.js and example_tilemap.js use the module pattern, setting `module.exports` to a value.  In the case of tilemap.js, it is the Tilemap library module.  For example_tilemap.js, it is the JavaScript object representing our tilemap data.  We require both of these files in game.js, with the lines:

```
var tilemap = require('./tilemap.js');<br>
var tilemapData = require('../tilemaps/example_tilemap.js');<br>
```

The require function lets Browserify know that we want the contents of these files to be pulled into this file, and stored as the variables `tilemap` and `tilemapData`.

We can ask Browserify to build a single JavaScript file from our source code with the command:

```
> browserify src/game.js > bundle.js
```

This tells browserify to process game.js.  When it encounters the require functions, it opens and processes those files, injecting their contents into the JavaScript file it is building, <a href="bundle.js">bundle.js</a>, which we can then include as the only JavaScript file in our _index.html_ file. By packaging our code into a single file, we ensure that everything is loaded in the correct order and in a single file, while still keeping our development code in multiple files.

Additionally, Browserify lets us utilize Node packages in our browser JavaScript code (provided we don't use any server-only functions, like file I/O).  You can also use
[Watchify](https://www.npmjs.com/package/watchify) to automatically bundle your changes as you make them.
