(function () {
  const NS = window.OUTPOST;
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: NS.W,
    height: NS.H,
    backgroundColor: '#141a3d',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    render: { antialias: true, mipmapFilter: 'LINEAR_MIPMAP_LINEAR' },
    scene: [NS.BootScene, NS.ExploreScene, NS.BuildScene, NS.MissionScene],
  });
  window.__outpost = { game, NS };
})();
