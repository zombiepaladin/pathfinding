/**
 * @module A pathfinding module providing
 * a visualizaiton of common tree-search
 * algorithms  used in conjunction with
 * a tilemap.
 */
module.exports = exports = Pathfinder;

/**
 * @constructor Pathfinder
 * Constructs a new Pathfinder for the
 * supplied tilemap.  By default it uses
 * breadth-first.
 * @param {Tilemap} tilemap - the tilemap to
 * use in finding paths.
 */
function Pathfinder(tilemap) {
  this.tilemap = tilemap;
  this.algorithm = 'breadth-first';
}

/**
 * Set a starting node for the pathfinding algorithm
 * @param {Object} node has an x and y property corresponding
 * to a tile in our tilemap.
 * @param {Canvas2DContext} ctx the context to render the start node on
 */
Pathfinder.prototype.setStartNode = function(node, ctx) {
  // Set the starting node
  this.start = {
    x: node.x,
    y: node.y,
    cost: 0
  }
  // Add the start node to the frontier and explored lists
  this.frontier = [[this.start]];
  this.explored = [this.start];
  // Render the start node in our visualization
  var worldCoords = this.tilemap.toWorldCoordinates(node);
  ctx.save();
  ctx.fillStyle = 'blue';
  ctx.beginPath();
  ctx.arc(worldCoords.x, worldCoords.y, 25, 0, 2*Math.PI);
  ctx.fill();
  ctx.restore();
}

/**
 * Set a goal node for the pathfinding algorithm
 * @param {Object} node has an x and y property corresponding
 * to a tile in our tilemap.
 * @param {Canvas2DContext} ctx the context to render the goal node on
 */
Pathfinder.prototype.setGoalNode = function(node, ctx) {
  this.goal = {
    x: node.x,
    y: node.y
  }
  // Render the goal node in our visualization
  var worldCoords = this.tilemap.toWorldCoordinates(node);
  ctx.save();
  ctx.fillStyle = 'green';
  ctx.beginPath();
  ctx.arc(worldCoords.x, worldCoords.y, 30, 0, 2*Math.PI);
  ctx.fill();
  ctx.restore();
}

/**
 * Sets the algorithm to use in finding a path.
 * @param {string} algorithm - the algorithm to use
 * Supported values are:
 * - 'depth-first'
 * - 'best-first'
 * - 'greedy'
 * - 'a-star' (default)
 */
Pathfinder.prototype.setAlgorithm = function(algorithm) {
  this.algorithm = algorithm;
}

/**
 * @function isExplored
 * A helper function to determine if a node has
 * already been explored.
 * @param {Object} node - an object with an x and y
 * property corresponding to a tile position.
 * @returns true if explored, false if not.
 */
Pathfinder.prototype.isExplored = function(node) {
  return this.explored.findIndex(function(n){
    return n.x == node.x && n.y == node.y;
  }) != -1;
}

/**
 * @function isImpassible
 * A helper function to determine if a node is
 * impassible - either becuase it is impossible to
 * move through, or it does not exist.
 * @param {Object} node - an object with an x and y
 * property corresponding to a tile position.
 * @returns true if impassible, false if not.
 */
Pathfinder.prototype.isImpassible = function(node) {
  var tile = this.tilemap.tileAt(node.x, node.y, 0);
  return !(tile && tile.movement != -1);
}

/**
 * @function expand
 * Helper function to identify neighboring unexplored nodes
 * and add them to the explored list.  It also calculates
 * the path cost to reach these nodes and thier distance
 * from the goal.
 * @param {Object} node - an object with an x and y
 * property corresponding to a tile position that
 * we want to find unexplored tiles adjacent to.
 * Expanded nodes are rendered into the provided context.
 * @param {RenderingContext2D} ctx - the rendering
 * context in which to display our visualizaiton of
 * expanded nodes.
 * @returns An array of expaned nodes.
 */
Pathfinder.prototype.expand = function(node, ctx) {
  var actions = [];
  for(var x = -1; x < 2; x++){
    for(var y = -1; y < 2; y++){
      var newNode = {
        x: node.x - x,
        y: node.y - y
      }
      if((x != 0 || y != 0) &&
        !this.isExplored(newNode) &&
        !this.isImpassible(newNode))
      {
        // Add the path distance to reach this node
        var movement = this.tilemap.tileAt(node.x, node.y, 0).movement;
        newNode.cost = movement + node.cost;

        // Add the estimated distance to the goal
        // We'll use straight-line distance
        newNode.distance = Math.sqrt(
          Math.pow(newNode.x - this.goal.x, 2) +
          Math.pow(newNode.y - this.goal.y, 2)
        );

        // render the new node
        ctx.beginPath();
        ctx.fillStyle = 'Yellow';
        ctx.arc(64*newNode.x + 32, 64*newNode.y + 32, 25, 0, 2*Math.PI);
        ctx.fill();
        ctx.fillStyle = 'orange';
        ctx.fillText(newNode.cost, 64*newNode.x+20, 64*newNode.y+20);
        ctx.fillStyle = 'red';
        var distStr = parseInt(newNode.distance * 100)/100;
        ctx.fillText(distStr, 64*newNode.x+20, 64*newNode.y+35);
        var heuristic = parseInt((newNode.cost + newNode.distance)*100)/100;
        ctx.fillStyle = 'black';
        ctx.fillText(heuristic, 64*newNode.x+20, 64*newNode.y+50);

        // push the new node to action and explored lists
        actions.push(newNode);
        this.explored.push(newNode);
      }
    }
  }
  return actions;
}

/**
 * @function step
 * Advances the current pathfinding algorithm by one step,
 * displaying the result on-screen.  Used to animate the
 * process; normally this would happen within a loop
 * (see findPath() below)
 * @param {RenderingContext2D} ctx - the context to render into
 * @returns a path to the goal as an array of nodes, an empty
 * array if no such path exists, or undefined if there are still
 * possible paths to explore.
 */
Pathfinder.prototype.step = function(ctx) {
  // Clear any on-screen messages
  document.getElementById('message').text = "";

  // If there are no paths left in the frontier,
  // we cannot reach our goal
  if(this.frontier.length == 0) {
    document.getElementById('message').text = "No Path Found";
    return [];
  }

  // Select a path from the frontier to explore
  // The method of selection is what defines our
  // algorithm
  var path;
  switch(this.algorithm) {
    case 'breadth-first':
      // In breadth-first, we process the paths
      // in the order they were added to the frontier
      path = this.frontier.shift();
      break;
    case 'best-first':
      // In best-first, we process the paths in order
      // using a heuristic that helps us pick the
      // "best" option.  We often use straight-line
      // distance between the last node in the path
      // and the goal node.
      this.frontier.sort(function(pathA, pathB){
        var a = pathA[pathA.length-1].distance;
        var b = pathB[pathB.length-1].distance;
        return a - b;
      });
      path = this.frontier.shift();
      break;
    case 'greedy':
      // In greedy search, we pick the path that has
      // the lowest cost to reach
      this.frontier.sort(function(pathA, pathB){
        var a = pathA[pathA.length-1].cost;
        var b = pathB[pathB.length-1].cost;
        return a - b;
      });
      path = this.frontier.shift();
      break;
    case 'a-star':
      // In A*, we pick the path with the lowest combined
      // path cost and distance heurisitic
      this.frontier.sort(function(pathA, pathB){
        var a = pathA[pathA.length-1].cost + pathA[pathA.length-1].distance;
        var b = pathB[pathB.length-1].cost + pathB[pathB.length-1].distance;
        return a - b;
      });
      path = this.frontier.shift();
      break;
  }

  // Render the selected path as an orange line
  ctx.beginPath();
  ctx.strokeStyle = 'orange';
  ctx.strokeWidth = 5;
  ctx.moveTo(64*path[0].x+32, 64*path[0].y+32);
  path.forEach(function(node){
    ctx.lineTo(64*node.x+32, 64*node.y+32);
  });
  ctx.stroke();

  // If the path we chose leads to the goal,
  // we found a solution; return it.
  var lastNode = path[path.length-1];
  if(lastNode.x == this.goal.x && lastNode.y == this.goal.y)
    return path;

  // Otherwise, add any new nodes not already explored
  // that we can reach from the last node in the current path
  var frontier = this.frontier;
  this.expand(lastNode, ctx).forEach(function(node){
    var newPath = path.slice()
    newPath.push(node)
    frontier.push(newPath);
  });

  function nodeToString(node) {
    return '(' + node.x + ',' + node.y + ')';
  }

  function pathToString(path) {
    return path.map(nodeToString).join('->');
  }

  // Print the current path, frontier, and explored
  // territory to the DOM
  document.getElementById('path').innerHTML =
    pathToString(path);
  document.getElementById('frontier').innerHTML =
    this.frontier.map(pathToString).join('<br>');
  document.getElementById('explored').innerHTML =
    this.explored.map(nodeToString).join(', ');

  // If we reach this point, we have not yet found a path
  return undefined;
}
