// Matter.js modules
let Engine = Matter.Engine,
  World = Matter.World,
  Bodies = Matter.Bodies,
  Body = Matter.Body;

let engine, world;

// Variables for table
let tableWidth = 800;
let tableHeight = tableWidth / 2;
let ballDiameter = tableWidth / 36;
let pocketDiameter = ballDiameter * 1.5;

// Game elements
let balls = [];
let pockets = [];
let cueBall;
let cue;

// Flags
let gameMode = 1; // Ball positions: 1=start, 2=random reds, 3=random all
let mouseMode = true; // Toggle between mouse and keyboard-based shooting

function setup() {
  createCanvas(tableWidth, tableHeight);
  engine = Engine.create();
  world = engine.world;

  // Disable gravity
  engine.world.gravity.y = 0;

  // Initialize table, pockets, balls, and cue
  createPockets();
  createCushions();
  setupBalls();
  createCueBall();
  cue = new Cue();

  // Create toggle button
  let toggleButton = createButton("Toggle Mode: Mouse");
  toggleButton.position(10, 10);
  toggleButton.mousePressed(() => {
    mouseMode = !mouseMode;
    toggleButton.html(
      mouseMode ? "Toggle Mode: Mouse" : "Toggle Mode: Keyboard"
    );
  });
}

function draw() {
  background(25, 110, 50);
  drawTable();

  // Draw pockets
  fill(0);
  noStroke();
  for (let pocket of pockets) {
    ellipse(pocket.x, pocket.y, pocketDiameter);
  }

  // Display balls
  for (let i = balls.length - 1; i >= 0; i--) {
    balls[i].show();
    if (isInPocket(balls[i])) {
      if (balls[i] === cueBall) {
        resetCueBall(); // Reinsert the cue ball in the "D" zone
      } else {
        World.remove(world, balls[i].body);
        balls.splice(i, 1);
      }
    }
  }

  // Display cue
  cue.update();
  cue.display();

  // Run Matter.js engine
  Engine.update(engine);
}

// -------------------- Table & Pockets --------------------

function drawTable() {
  stroke(255);
  strokeWeight(2);
  noFill();
  rect(0, 0, tableWidth, tableHeight);

  // Draw "D" zone
  let dRadius = tableWidth * 0.2;
  arc(tableWidth * 0.2, tableHeight / 2, dRadius, dRadius, -HALF_PI, HALF_PI);
}

function createPockets() {
  let positions = [
    { x: 0, y: 0 },
    { x: tableWidth / 2, y: 0 },
    { x: tableWidth, y: 0 },
    { x: 0, y: tableHeight },
    { x: tableWidth / 2, y: tableHeight },
    { x: tableWidth, y: tableHeight },
  ];
  pockets = positions;
}

function createCushions() {
  let options = { isStatic: true, restitution: 0.9 };
  let thickness = 10;

  World.add(world, [
    Bodies.rectangle(tableWidth / 2, 0, tableWidth, thickness, options),
    Bodies.rectangle(
      tableWidth / 2,
      tableHeight,
      tableWidth,
      thickness,
      options
    ),
    Bodies.rectangle(0, tableHeight / 2, thickness, tableHeight, options),
    Bodies.rectangle(
      tableWidth,
      tableHeight / 2,
      thickness,
      tableHeight,
      options
    ),
  ]);
}

// -------------------- Balls Setup --------------------

function setupBalls() {
  // Remove all existing balls from the Matter.js world
  for (let ball of balls) {
    World.remove(world, ball.body);
  }
  balls = []; // Clear the balls array

  // Starting positions for red balls in a triangle formation
  let startX = tableWidth * 0.7; // Base of the triangle
  let startY = tableHeight / 2; // Center of the table height
  let rows = 5; // Number of rows in the triangle

  for (let row = 0; row < rows; row++) {
    for (let i = 0; i <= row; i++) {
      // Calculate position of each ball in the triangle
      let x = startX + row * ballDiameter * 0.8; // Shift each row to the right
      let y = startY + i * ballDiameter - (row * ballDiameter) / 2; // Center each row
      balls.push(new Ball(x, y, "red")); // Add red ball
    }
  }

  // Add the colored balls at their designated positions
  balls.push(new Ball(tableWidth * 0.5, tableHeight * 0.5, "blue")); // Blue ball at center
  balls.push(new Ball(tableWidth * 0.8, tableHeight * 0.5, "black")); // Black ball at far right
}

function createCueBall() {
  cueBall = new Ball(tableWidth * 0.2, tableHeight / 2, "white");
  balls.push(cueBall);
}

// -------------------- Ball Class --------------------

class Ball {
  constructor(x, y, color) {
    this.body = Bodies.circle(x, y, ballDiameter / 2, {
      restitution: 0.8,
      friction: 0.01,
    });
    this.color = color;
    World.add(world, this.body);
  }

  show() {
    fill(this.color);
    stroke(0);
    let pos = this.body.position;
    ellipse(pos.x, pos.y, ballDiameter);
  }
}

// -------------------- Cue Class --------------------

class Cue {
  constructor() {
    this.isAiming = true; // Always display the aiming direction in keyboard mode
    this.power = 50; // Default power for shooting
    this.angle = 0; // Angle towards mouse pointer
  }

  update() {
    // Update the angle dynamically to point towards the mouse
    let dx = mouseX - cueBall.body.position.x;
    let dy = mouseY - cueBall.body.position.y;
    this.angle = atan2(dy, dx);
  }

  display() {
    if (mouseMode && this.isAiming) {
      // In mouse mode, show direction line only when aiming
      this.drawLine();
    } else if (!mouseMode) {
      // In keyboard mode, always show the direction line
      this.drawLine();
    }
  }

  drawLine() {
    // Draw the direction line from the cue ball
    push();
    stroke(255, 0, 0); // Red aiming line
    strokeWeight(4);
    let x = cueBall.body.position.x;
    let y = cueBall.body.position.y;
    line(
      x,
      y,
      x + cos(this.angle) * 100, // Extend the line 100px in the aiming direction
      y + sin(this.angle) * 100
    );
    pop();
  }

  shoot() {
    // Apply force to the cue ball in the direction of the angle
    let forceX = cos(this.angle) * this.power * 0.00035;
    let forceY = sin(this.angle) * this.power * 0.00035;

    Body.applyForce(cueBall.body, cueBall.body.position, {
      x: forceX,
      y: forceY,
    });

    if (mouseMode) {
      // In mouse mode, reset aiming state after shooting
      this.isAiming = false;
    }
  }
}

// -------------------- Game Logic --------------------

function isInPocket(ball) {
  for (let pocket of pockets) {
    let ballX = ball.body.position.x;
    let ballY = ball.body.position.y;
    let pocketX = pocket.x;
    let pocketY = pocket.y;
    if (
      dist(ballX, ballY, pocketX, pocketY) <
      ballDiameter / 2 + pocketDiameter / 2
    ) {
      return true;
    }
  }
  return false;
}

function resetCueBall() {
  Body.setPosition(cueBall.body, { x: tableWidth * 0.2, y: tableHeight / 2 });
  Body.setVelocity(cueBall.body, { x: 0, y: 0 });
}

// -------------------- Input Events --------------------

function randomizeBalls(mode) {
  // Remove all existing balls from Matter.js world
  for (let ball of balls) {
    World.remove(world, ball.body);
  }
  balls = []; // Clear the balls array

  // Function to generate random positions within the table bounds
  function getRandomPosition() {
    let x = random(ballDiameter, tableWidth - ballDiameter);
    let y = random(ballDiameter, tableHeight - ballDiameter);
    return { x, y };
  }

  // Add red balls in random positions
  let redBallCount = 15;
  for (let i = 0; i < redBallCount; i++) {
    let pos = getRandomPosition();
    balls.push(new Ball(pos.x, pos.y, "red"));
  }

  if (mode === "all") {
    // Add colored balls in random positions
    let colors = ["blue", "black"];
    for (let color of colors) {
      let pos = getRandomPosition();
      balls.push(new Ball(pos.x, pos.y, color));
    }
  }
}

function keyPressed() {
  if (key === "1" || key === "2" || key === "3") {
    if (key === "1") setupBalls();
    if (key === "2") randomizeBalls("red");
    if (key === "3") randomizeBalls("all");
    // Recreate the cue ball
    createCueBall();
  } else if (!mouseMode && keyCode === 32) {
    cue.shoot(); // Spacebar to shoot when in keyboard mode
  }
}

function mousePressed() {
  if (mouseMode) {
    let d = dist(
      mouseX,
      mouseY,
      cueBall.body.position.x,
      cueBall.body.position.y
    );
    if (d < ballDiameter) cue.isAiming = true;
  }
}

function mouseReleased() {
  if (mouseMode && cue.isAiming) {
    cue.shoot(); // Shoot the ball with the mouse
  }
}
