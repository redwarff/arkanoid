var Ball = function (x, y, r, vx, vy) {
  this.x = x;
  this.y = y;
  this.r = r;
  this.vx = vx;
  this.vy = vy;
}
var Block = function (x, y, width, height, thick) {
  this.x = x;
  this.y = y;
  this.width = width;
  this.height = height;
  this.thick = thick;
}

var Game = function (canvas, width, height) {
  this.width = width;
  this.height = height;
  this.balls = [];
  this.blocks = [];
  this.discardBuffer = [];
  this.lastTime = null;
  this.cx = canvas.getContext("2d");
  this.bar = {};
  this.arrowKeyDown = null;
  this.state = null;
}

Game.prototype.init = function () {
  this.populate();
  self = this;
  document.addEventListener("keydown", function (e) {
    if (e.key == "ArrowLeft") self.arrowKeyDown = "left";
    if (e.key == "ArrowRight") self.arrowKeyDown = "right";
  });
  document.addEventListener("keyup", function (e) {
    if (e.key == "ArrowLeft" && self.arrowKeyDown == "left") self.arrowKeyDown = null;
    if (e.key == "ArrowRight" && self.arrowKeyDown == "right") self.arrowKeyDown = null;
  });
  var restartBtn = document.querySelector("#restart");
  restartBtn.addEventListener("click", function () {
    self.restart();
  });
  this.animate();
}
Game.prototype.populate = function () {
  this.add(new Ball(220, 350, 4, Math.random() * 120 - 60, Math.random() * 100 + 140));
  for (var i = 0; i < 4; i++) {
    this.add(new Block(100 + i * 44, 140, 50, 25, 5));
  }
  for (var i = 0; i < 3; i++) {
    this.add(new Block(120 + i * 44, 164, 50, 20, 5));
  }
  this.bar = {
    x: 180,
    y: 380,
    length: 60,
    speed: 240
  }
}
Game.prototype.add = function (element) {
  if (element instanceof Ball) this.balls.push(element);
  else if (element instanceof Block) this.blocks.push(element);
}
Game.prototype.animate = function () {
  var self = this;
  function frame(time) {
    if (self.state) return;
    if (self.lastTime != null)
      updateAnimation(Math.min(100, time - self.lastTime) / 1000);
    self.lastTime = time;
    self.animationInstance = requestAnimationFrame(frame);
  }
  function updateAnimation(step) {
    self.moveAll(step);
    self.drawAll();
  }
  requestAnimationFrame(frame);
}
Game.prototype.moveAll = function (step) {
  var self = this;
  var hitsWallWhere = function (x, y, r) {
    if (x - r < 2 || x + r > self.width - 2) return 'side';
    if (y - r < 2) return 'top';
    if (y + r > self.height - 2) return 'bottom';
  }
  var hitsBar = function (x, y, r, prevy) {
    var bar = self.bar;
    if (x > bar.x && x < bar.x + bar.length && y + r > bar.y - 2 && prevy + r < bar.y - 2) return true;
    return false;
  }
  var isOutOfBounds = function (x, y, r) {
    if (y - r > self.height) return true;
  }
  var moveBall = function (ball) {
    var newx = ball.x + ball.vx * step;
    var newy = ball.y + ball.vy * step;
    switch (hitsWallWhere(newx, newy, ball.r)) {
      case 'side':
        ball.vx = -ball.vx;
        break;
      case 'top':
        ball.vy = -ball.vy;
        break;
      case 'bottom':
        if (isOutOfBounds(newx, newy, ball.r)) {
          self.queDestroy(ball);
        }
        break;
    }
    var hitsBlock = self.hitsBlockWhichWhere(newx, newy, ball.r, ball.x, ball.y);
    if (hitsBlock) {
      self.hitBlock(hitsBlock.block);
      if (hitsBlock.where == 'side') ball.vx = -ball.vx;
      else if (hitsBlock.where == 'top/bot') ball.vy = -ball.vy;
    }
    if (hitsBar(newx, newy, ball.r, ball.y)) {
      ball.vy = -ball.vy;
      self.alterBallDirection(ball);
    }
    ball.x += ball.vx * step;
    ball.y += ball.vy * step;
  }
  var moveBar = function () {
    var bar = self.bar;
    if (self.arrowKeyDown == 'left' && bar.x > 3) bar.x -= bar.speed * step;
    else if (self.arrowKeyDown == 'right' && bar.x + bar.length < self.width - 3) bar.x += bar.speed * step;
  }
  moveBar();
  this.balls.forEach(moveBall);
  this.destroyQued();
}
Game.prototype.hitsBlockWhichWhere = function (x, y, r, prevx, prevy) {
  var toReturn = null;
  this.blocks.forEach(function (block) {
    if ((x + r > block.x - block.thick / 2 && prevx + r < block.x - block.thick / 2) || (x - r < block.x + block.width + block.thick / 2 && prevx - r > block.x + block.width + block.thick / 2)) {
      if (y < block.y + block.height && y > block.y) {
        toReturn = {
          block: block,
          where: 'side'
        };
        return;
      }
    }
    if ((y + r > block.y - block.thick / 2 && prevy + r < block.y - block.thick / 2) || (y - r < block.y + block.height + block.thick / 2 && prevy - r > block.y + block.height + block.thick / 2)) {
      if (x < block.x + block.width && x > block.x) {
        toReturn = {
          block: block,
          where: 'top/bot'
        };
        return;
      }
    }
  });
  return toReturn;
}
Game.prototype.queDestroy = function (element) {
  this.discardBuffer.push(element);
}
Game.prototype.destroyQued = function () {
  var self = this;
  this.discardBuffer.forEach(function (element) {
    if (element instanceof Ball) self.balls.splice(self.balls.indexOf(element), 1);
    else if (element instanceof Block) self.blocks.splice(self.blocks.indexOf(element), 1);
  });
  this.discardBuffer = [];
}
Game.prototype.hitBlock = function (block) {
  if (block.thick > 1) block.thick--;
  else {
    this.queDestroy(block);
  }
  this.maybeAddBall(block);
}
Game.prototype.maybeAddBall = function (block) {
  var rand = Math.random() * 10;
  if (rand < 1) this.add(new Ball(block.x + block.width, block.y + 44, 4, Math.random() * 50, Math.random() * 100 + 140));
}
Game.prototype.alterBallDirection = function (ball) {
  if (this.arrowKeyDown == 'left') {
    ball.vx -= Math.random() * 12 + 38;
  } else if (this.arrowKeyDown == 'right') {
    ball.vx += Math.random() * 12 + 38;
  }
}
Game.prototype.updateGameState = function () {
  if (this.balls.length == 0) this.state = 'lost';
  if (this.blocks.length == 0) this.state = 'win';
  if (this.state) {
    this.drawEnd();
  }
}
Game.prototype.drawAll = function () {
  if (this.state) return;
  var cx = this.cx;
  var drawBox = function () {
    cx.strokeStyle = "black";
    cx.clearRect(0, 0, 400, 400);
    cx.lineWidth = 5;
    cx.strokeRect(0, 0, 400, 400);
  }
  var drawBall = function (ball) {
    cx.fillStyle = "black";
    cx.strokeStyle = "black";
    cx.beginPath();
    cx.moveTo(ball.x + ball.r, ball.y);
    cx.arc(ball.x, ball.y, ball.r, 0, 7);
    cx.closePath();
    cx.fill();
  }
  var drawBar = function (bar) {
    cx.lineWidth = 5;
    cx.strokeRect(bar.x, bar.y + 2, bar.length, 1);
  }
  var drawBlock = function (block) {
    cx.strokeStyle = "black";
    cx.lineWidth = block.thick;
    cx.strokeRect(block.x, block.y, block.width, block.height);
  }
  drawBox();
  this.balls.forEach(drawBall);
  this.blocks.forEach(drawBlock);
  drawBar(this.bar);
  this.updateGameState();
}
Game.prototype.drawEnd = function () {
  var cx = this.cx;
  cx.font = "50px 'Courier New'";
  if (this.state == 'lost') {
    cx.fillStyle = "red";
    cx.fillText("You lost!", this.width / 2 - 140, 100);
  } else if (this.state == 'win') {
    cx.fillStyle = "green";
    cx.fillText("You win!", this.width / 2 - 140, 100);
  }
  cx.fill();
}
Game.prototype.restart = function () {
  this.balls = [];
  this.blocks = [];
  this.discardBuffer = [];
  this.lastTime = null;
  this.arrowKeyDown = null;
  this.state = null;
  this.populate();
  this.animate();
}
var game = new Game(document.querySelector("canvas"), 400, 400);
game.init();