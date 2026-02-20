const canvas = document.getElementById("gameCanvas");

if (canvas) {
  const ctx = canvas.getContext("2d");
  const leftScoreEl = document.getElementById("leftScore");
  const rightScoreEl = document.getElementById("rightScore");
  const toggleGameBtn = document.getElementById("toggleGameBtn");
  const resetGameBtn = document.getElementById("resetGameBtn");

  const winningScore = 7;
  const aspectRatio = 9 / 5;

  let isRunning = false;
  let gameOver = false;
  let leftScore = 0;
  let rightScore = 0;
  let touchActive = false;

  const keys = {
    up: false,
    down: false,
  };

  const paddle = {
    width: 14,
    height: 100,
    speed: 7,
  };

  const leftPaddle = {
    x: 22,
    y: canvas.height / 2 - paddle.height / 2,
  };

  const rightPaddle = {
    x: canvas.width - 22 - paddle.width,
    y: canvas.height / 2 - paddle.height / 2,
  };

  const ball = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: 10,
    speed: 6,
    vx: 6,
    vy: 3,
  };

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function updateToggleLabel() {
    if (!toggleGameBtn) return;
    if (gameOver) {
      toggleGameBtn.textContent = "Start";
      return;
    }
    toggleGameBtn.textContent = isRunning ? "Pause" : "Start";
  }

  function resizeCanvas() {
    const prevWidth = canvas.width || 900;
    const prevHeight = canvas.height || 500;

    const targetWidth = clamp(Math.round(canvas.clientWidth), 320, 900);
    const targetHeight = Math.round(targetWidth / aspectRatio);

    if (targetWidth === prevWidth && targetHeight === prevHeight) return;

    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const xScale = canvas.width / prevWidth;
    const yScale = canvas.height / prevHeight;

    paddle.width = Math.round(clamp(canvas.width * 0.015, 8, 14));
    paddle.height = Math.round(clamp(canvas.height * 0.2, 56, 100));
    paddle.speed = Math.round(clamp(canvas.height * 0.015, 4, 7));

    const paddleOffset = Math.round(clamp(canvas.width * 0.025, 10, 22));
    leftPaddle.x = paddleOffset;
    rightPaddle.x = canvas.width - paddleOffset - paddle.width;

    leftPaddle.y = clamp(leftPaddle.y * yScale, 0, canvas.height - paddle.height);
    rightPaddle.y = clamp(rightPaddle.y * yScale, 0, canvas.height - paddle.height);

    ball.radius = Math.round(clamp(canvas.width * 0.011, 6, 10));
    ball.speed = clamp(canvas.width * 0.007, 3.5, 6);
    ball.x = clamp(ball.x * xScale, ball.radius, canvas.width - ball.radius);
    ball.y = clamp(ball.y * yScale, ball.radius, canvas.height - ball.radius);
    ball.vx = ball.vx < 0 ? -Math.max(Math.abs(ball.vx), ball.speed) : Math.max(Math.abs(ball.vx), ball.speed);
  }

  function updatePlayerFromClientY(clientY) {
    const rect = canvas.getBoundingClientRect();
    const scaledY = ((clientY - rect.top) * canvas.height) / rect.height;
    leftPaddle.y = clamp(scaledY - paddle.height / 2, 0, canvas.height - paddle.height);
  }

  function resetBall(direction = 1) {
    ball.x = canvas.width / 2;
    ball.y = canvas.height / 2;
    ball.vx = direction * ball.speed;
    ball.vy = (Math.random() * 4 - 2) || 1.5;
  }

  function resetGame() {
    leftScore = 0;
    rightScore = 0;
    leftScoreEl.textContent = "0";
    rightScoreEl.textContent = "0";
    gameOver = false;
    isRunning = false;
    leftPaddle.y = canvas.height / 2 - paddle.height / 2;
    rightPaddle.y = canvas.height / 2 - paddle.height / 2;
    resetBall(Math.random() > 0.5 ? 1 : -1);
    updateToggleLabel();
  }

  function drawCenterLine() {
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    for (let y = 10; y < canvas.height; y += 28) {
      ctx.fillRect(canvas.width / 2 - 2, y, 4, 16);
    }
  }

  function drawPaddle(x, y) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x, y, paddle.width, paddle.height);
  }

  function drawBall() {
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = "#9cf4ff";
    ctx.fill();
  }

  function drawOverlay(text, subtext) {
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.font = "700 42px Segoe UI";
    ctx.fillText(text, canvas.width / 2, canvas.height / 2 - 10);
    ctx.font = "500 22px Segoe UI";
    ctx.fillText(subtext, canvas.width / 2, canvas.height / 2 + 28);
  }

  function movePlayer() {
    if (touchActive) return;
    if (keys.up) leftPaddle.y -= paddle.speed;
    if (keys.down) leftPaddle.y += paddle.speed;
    leftPaddle.y = clamp(leftPaddle.y, 0, canvas.height - paddle.height);
  }

  function moveCpu() {
    const target = ball.y - paddle.height / 2;
    const reaction = 0.1;
    const delta = target - rightPaddle.y;
    rightPaddle.y += delta * reaction;
    rightPaddle.y = clamp(rightPaddle.y, 0, canvas.height - paddle.height);
  }

  function ballHitsPaddle(p) {
    return (
      ball.x - ball.radius < p.x + paddle.width &&
      ball.x + ball.radius > p.x &&
      ball.y + ball.radius > p.y &&
      ball.y - ball.radius < p.y + paddle.height
    );
  }

  function updateBall() {
    ball.x += ball.vx;
    ball.y += ball.vy;

    if (ball.y - ball.radius <= 0 || ball.y + ball.radius >= canvas.height) {
      ball.vy *= -1;
    }

    if (ballHitsPaddle(leftPaddle) && ball.vx < 0) {
      const relative = (ball.y - (leftPaddle.y + paddle.height / 2)) / (paddle.height / 2);
      ball.vx = Math.abs(ball.vx) * 1.03;
      ball.vy += relative * 2.1;
    }

    if (ballHitsPaddle(rightPaddle) && ball.vx > 0) {
      const relative = (ball.y - (rightPaddle.y + paddle.height / 2)) / (paddle.height / 2);
      ball.vx = -Math.abs(ball.vx) * 1.03;
      ball.vy += relative * 2.1;
    }

    if (ball.x < -ball.radius) {
      rightScore += 1;
      rightScoreEl.textContent = String(rightScore);
      if (rightScore >= winningScore) {
        gameOver = true;
        isRunning = false;
        updateToggleLabel();
      }
      resetBall(1);
    }

    if (ball.x > canvas.width + ball.radius) {
      leftScore += 1;
      leftScoreEl.textContent = String(leftScore);
      if (leftScore >= winningScore) {
        gameOver = true;
        isRunning = false;
        updateToggleLabel();
      }
      resetBall(-1);
    }

    ball.vy = clamp(ball.vy, -8, 8);
  }

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawCenterLine();
    drawPaddle(leftPaddle.x, leftPaddle.y);
    drawPaddle(rightPaddle.x, rightPaddle.y);
    drawBall();

    if (!isRunning && !gameOver) {
      drawOverlay("Ping Pong", "Press Space or Tap Start");
    }

    if (gameOver) {
      const winner = leftScore > rightScore ? "You Win!" : "CPU Wins!";
      drawOverlay(winner, "Press R or Tap Reset");
    }
  }

  function gameLoop() {
    if (isRunning && !gameOver) {
      movePlayer();
      moveCpu();
      updateBall();
    }
    render();
    requestAnimationFrame(gameLoop);
  }

  window.addEventListener("keydown", (e) => {
    const key = e.key.toLowerCase();

    if (key === "arrowup" || key === "w") keys.up = true;
    if (key === "arrowdown" || key === "s") keys.down = true;

    if (key === " ") {
      e.preventDefault();
      if (!gameOver) {
        isRunning = !isRunning;
        updateToggleLabel();
      }
    }

    if (key === "r") resetGame();
  });

  window.addEventListener("keyup", (e) => {
    const key = e.key.toLowerCase();
    if (key === "arrowup" || key === "w") keys.up = false;
    if (key === "arrowdown" || key === "s") keys.down = false;
  });

  if (toggleGameBtn) {
    toggleGameBtn.addEventListener("click", () => {
      if (gameOver) return;
      isRunning = !isRunning;
      updateToggleLabel();
    });
  }

  if (resetGameBtn) {
    resetGameBtn.addEventListener("click", resetGame);
  }

  window.addEventListener("resize", resizeCanvas);

  canvas.style.touchAction = "none";

  canvas.addEventListener("touchstart", (e) => {
    if (e.touches.length === 0) return;
    e.preventDefault();
    touchActive = true;
    updatePlayerFromClientY(e.touches[0].clientY);
  });

  canvas.addEventListener("touchmove", (e) => {
    if (!touchActive || e.touches.length === 0) return;
    e.preventDefault();
    updatePlayerFromClientY(e.touches[0].clientY);
  });

  canvas.addEventListener("touchend", () => {
    touchActive = false;
  });

  canvas.addEventListener("touchcancel", () => {
    touchActive = false;
  });

  resizeCanvas();
  resetGame();
  gameLoop();
}
