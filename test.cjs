const { chromium } = require('playwright');
const { spawn } = require('child_process');

const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const srv = spawn('python3', ['-m', 'http.server', '8099'], { stdio: 'ignore' });
  await sleep(1200);

  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
           '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
  });
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });

  const errors = [], logs = [];
  page.on('console', m => logs.push(`[${m.type()}] ${m.text()}`));
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  page.on('requestfailed', r => errors.push('REQFAIL: ' + r.url() + ' ' + (r.failure()?.errorText)));

  await page.goto('http://localhost:8099/index.html', { waitUntil: "load" });
  await sleep(1500); // allow three.js (CDN) + scene build

  // Did the module load and expose the game?
  const ready = await page.evaluate(() => !!window.__game && !!window.__game.renderer);
  console.log('GAME READY:', ready);
  if (ready) {
    const info = await page.evaluate(() => ({
      colliders: window.__game.world.colliders.length,
      roomLights: window.__game.world.roomLights.length,
      npcs: window.__game.npcs.length,
      glLost: window.__game.renderer.getContext().isContextLost(),
      drawCalls: window.__game.renderer.info.render.calls,
      triangles: window.__game.renderer.info.render.triangles,
    }));
    console.log('SCENE INFO:', JSON.stringify(info));
  }

  await page.screenshot({ path: 'shot-title.png' });

  // Start the game
  await page.evaluate(() => window.__game.startGame());
  await sleep(1500);
  await page.screenshot({ path: 'shot-foyer.png' });

  // Walk forward (W) for a bit to test movement + collision
  await page.keyboard.down('KeyW');
  await sleep(1800);
  await page.keyboard.up('KeyW');
  const movedTo = await page.evaluate(() => {
    const p = window.__game.player.pos; return { x: +p.x.toFixed(2), y: +p.y.toFixed(2), z: +p.z.toFixed(2) };
  });
  console.log('AFTER WALK FWD:', JSON.stringify(movedTo));
  await page.screenshot({ path: 'shot-walk.png' });

  // Teleport to a few rooms and screenshot to check geometry/lighting
  const spots = [
    ['kitchen', 9.5, 9.5, 0], ['living', -9, 8, 0], ['upstairs-landing', 0, -4, 3.4],
    ['hallway', 0, -12, 3.4],
  ];
  for (const [name, x, z, y] of spots) {
    await page.evaluate(([x, z, y]) => window.__game.teleport(x, z, y), [x, z, y]);
    await sleep(500);
    await page.screenshot({ path: `shot-${name}.png` });
    const fl = await page.evaluate(() => window.__game.player.floor);
    console.log(`teleported ${name} -> floor ${fl}`);
  }

  // Trigger the ending: step just inside the goal room (good viewing distance)
  await page.evaluate(() => window.__game.teleport(0, -17.4, 3.4));
  await sleep(700);
  const endingStarted = await page.evaluate(() => window.__game.ending.active);
  console.log('ENDING STARTED:', endingStarted);
  // advance a couple phases for the lights-on reveal, then screenshot
  await page.evaluate(async () => { for (let i = 0; i < 60; i++) { window.__game.ending.update(0.05); await new Promise(r => setTimeout(r, 0)); } });
  await page.screenshot({ path: 'shot-reveal.png' });
  // advance to the forced turn + officer
  await page.evaluate(async () => { for (let i = 0; i < 120; i++) { window.__game.ending.update(0.05); await new Promise(r => setTimeout(r, 0)); } });
  await page.screenshot({ path: 'shot-officer.png' });
  // fast-forward to completion
  const endState = await page.evaluate(async () => {
    const g = window.__game;
    for (let i = 0; i < 400 && !g.ending.done; i++) { g.ending.update(0.05); await new Promise(r => setTimeout(r, 0)); }
    return { done: g.ending.done, copExists: !!g.ending.cop, endVisible: document.getElementById('endscreen').style.display,
             allLit: g.world.roomLights.every(l => l.intensity > 0), finalYaw: +g.player.yaw.toFixed(2) };
  });
  console.log('END STATE:', JSON.stringify(endState));
  await sleep(400);
  await page.screenshot({ path: 'shot-end.png' });

  console.log('\n=== CONSOLE LOGS (' + logs.length + ') ===');
  logs.slice(-15).forEach(l => console.log(l));
  console.log('\n=== ERRORS (' + errors.length + ') ===');
  errors.forEach(e => console.log(e));

  await browser.close();
  srv.kill();
  process.exit(errors.length ? 1 : 0);
})().catch(e => { console.error('HARNESS FAIL', e); process.exit(2); });
