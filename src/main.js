(function () {
  const NS = window.OUTPOST;
  // fonts must be ready before any Phaser text is drawn
  const fonts = document.fonts && document.fonts.load
    ? Promise.all([document.fonts.load('600 32px "Fredoka"'), document.fonts.load('800 20px "Nunito"'), document.fonts.load('700 20px "Nunito"')]).catch(() => null)
    : Promise.resolve();
  const timeout = new Promise((r) => setTimeout(r, 2500));
  Promise.race([fonts, timeout]).then(() => {
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: 'game',
      width: NS.W,
      height: NS.H,
      backgroundColor: '#140d3d',
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      render: { antialias: true, mipmapFilter: 'LINEAR_MIPMAP_LINEAR' },
      scene: [NS.BootScene, NS.TitleScene, NS.CampaignScene, NS.BriefingScene, NS.ExploreScene, NS.BuildScene,
        NS.MissionScene, NS.ResultsScene, NS.JournalScene],
    });
    window.__outpost = { game, NS };
  });
})();
