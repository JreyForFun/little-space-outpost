/* UI-side game data: screen size, build-pad positions, shared run state.
 * Game RULES live in src/sim/content.js; story lines in src/data/story.js; art paths in src/assets.js. */
(function () {
  const NS = (window.OUTPOST = window.OUTPOST || {});
  const CONTENT = window.OUTPOST_CONTENT;

  NS.W = 1280;
  NS.H = 720;
  NS.CREW = CONTENT.CREW.map((c) => c.id); // sprite colours of the three crew members

  NS.STAGES = ['Explore', 'Build', 'Mission'];
  NS.stageLabel = (name) => 'Stage ' + (NS.STAGES.indexOf(name) + 1) + ' of ' + NS.STAGES.length + ' · ' + name;

  // Build pads: same positions on every site backdrop (traits come from the site, see content.PAD_SETS)
  NS.PADS = [
    { x: 380, y: 410 }, { x: 610, y: 410 }, { x: 840, y: 410 }, { x: 1070, y: 410 },
    { x: 270, y: 540 }, { x: 495, y: 540 }, { x: 720, y: 540 }, { x: 945, y: 540 }, { x: 1160, y: 540 },
  ];
  NS.PAD_RX = 84;
  NS.PAD_RY = 27;

  const params = new URLSearchParams(location.search);
  NS.FAST = params.has('fast'); // ?fast shortens animations (testing)
  NS.SEED = params.has('seed') ? parseInt(params.get('seed'), 10) : null; // ?seed=N fixes the mission seed (testing)

  // The current run, shared between Briefing -> Explore -> Build -> Mission -> Results
  NS.freshRun = (missionIndex) => ({
    missionIndex, siteId: null, layout: [], history: [],
    seed: NS.SEED != null ? NS.SEED : Math.floor(Math.random() * 1e9),
  });
  NS.run = NS.freshRun(0);
  NS.mission = () => CONTENT.MISSIONS[NS.run.missionIndex];

  // scene change with a fade (and a whoosh)
  NS.go = function (scene, key, data) {
    if (scene._leaving) return;
    scene._leaving = true;
    if (NS.voice) NS.voice.stop();
    scene.cameras.main.fadeOut(NS.FAST ? 80 : 320, 20, 13, 61);
    scene.cameras.main.once('camerafadeoutcomplete', () => scene.scene.start(key, data));
  };
})();
