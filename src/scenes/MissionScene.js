/* STAGE 3 - MISSION: balance supplies and power through five lunar days. */
(function () {
  const NS = (window.OUTPOST = window.OUTPOST || {});
  const DAYS = 5;
  const ACTIONS = [
    {
      id: 'grow',
      title: 'Grow food',
      detail: 'Spend 2 power · grow 3 food',
      note: 'The seed trays are ready. Fresh food helps the crew.',
      story: 'Grow lights glow! The crew has fresh food to look forward to.',
      color: NS.C.green,
    },
    {
      id: 'save',
      title: 'Save power',
      detail: 'Bank 2 power · use stored food',
      note: 'Pause the garden lab for a day. The crew still needs food.',
      story: 'Lab lights off. Moon Camp saves power, but uses food today.',
      color: NS.C.teal,
    },
    {
      id: 'shelter',
      title: 'Charge shelter',
      detail: 'Spend 2 power · add 2 shield',
      note: 'Charge the shelter before a solar storm. It can hold 3 shields.',
      story: 'The shelter is charged! The crew has a safer place to hide.',
      color: NS.C.orange,
    },
  ];

  class MissionScene extends Phaser.Scene {
    constructor() { super('Mission'); }

    create() {
      this.cameras.main.fadeIn(350);
      NS.put(this, 'bg.site', 0, 0).setDepth(-100);

      this.mission = {
        day: 1,
        air: 7,
        power: 5,
        food: 6,
        shield: 0,
        dose: 0,
        science: 0,
        stormDay: Phaser.Math.Between(2, 4),
        mode: 'playing',
      };
      NS.state.mission = this.mission;

      this.guide = NS.createGuide(this, 24, 24, 640);
      this.guide.say(NS.STORY.missionIntro);
      NS.text(this, 1252, 34, 'STAGE 3 · MOON CAMP', 20, NS.C.creamHex)
        .setOrigin(1, 0).setDepth(3001);

      this.resourceItems = [
        { key: 'air', label: 'AIR', color: NS.C.teal },
        { key: 'power', label: 'POWER', color: NS.C.yellow },
        { key: 'food', label: 'FOOD', color: NS.C.green },
        { key: 'shield', label: 'SHIELD', color: NS.C.orange },
      ];
      this.resourceUi = {};
      this.resourceItems.forEach((item, i) => {
        const x = 700 + i * 139;
        NS.panel(this, x, 98, 128, 88, { r: 16 }).setDepth(100);
        NS.text(this, x + 64, 110, item.label, 14, NS.C.slateHex)
          .setOrigin(0.5).setDepth(101);
        this.resourceUi[item.key] = {
          value: NS.text(this, x + 64, 135, '', 24).setOrigin(0.5).setDepth(101),
          bar: this.add.graphics().setDepth(101),
          x,
          color: item.color,
        };
      });

      NS.panel(this, 70, 220, 1140, 142, { r: 22 }).setDepth(100);
      this.dayTitle = NS.text(this, 100, 242, '', 26).setDepth(101);
      this.eventText = NS.text(this, 100, 282, '', 19, NS.C.slateHex, '700')
        .setWordWrapWidth(1040).setDepth(101);

      this.actionCards = ACTIONS.map((action, i) => this.makeActionCard(action, 70 + i * 395));
      this.footer = NS.text(this, NS.W / 2, 634, '', 14, NS.C.creamHex, '700')
        .setOrigin(0.5).setDepth(3001);
      NS.text(this, NS.W / 2, 674,
        'Practice solar alert, not a live forecast · NASA Space Weather Database (DONKI): kauai.ccmc.gsfc.nasa.gov/DONKI/',
        12, NS.C.creamHex, '700').setOrigin(0.5).setDepth(3001);

      this.refresh();
      window.__outpost = Object.assign(window.__outpost || {}, { mission: this });
    }

    makeActionCard(action, x) {
      const y = 420, w = 350, h = 190;
      const panel = NS.panel(this, x, y, w, h, { r: 20 }).setDepth(100);
      const title = NS.text(this, x + 24, y + 22, action.title, 24).setDepth(101);
      const cost = NS.text(this, x + 24, y + 62, action.detail, 16, NS.C.slateHex, '700').setDepth(101);
      const note = NS.text(this, x + 24, y + 96, action.note, 15, NS.C.navyHex, '700')
        .setWordWrapWidth(w - 48).setDepth(101);
      const g = this.add.graphics().setDepth(102);
      const label = NS.text(this, x + w / 2, y + h - 34, 'Choose this plan', 15, NS.C.navyHex, '800')
        .setOrigin(0.5).setDepth(104);
      const zone = this.add.zone(x + w / 2, y + h - 26, w - 24, 42)
        .setInteractive({ useHandCursor: true }).setDepth(103);
      zone.on('pointerover', () => this.drawActionButton(g, x, y, w, h, action, true));
      zone.on('pointerout', () => this.drawActionButton(g, x, y, w, h, action, false));
      zone.on('pointerdown', () => this.choose(action.id));
      this.drawActionButton(g, x, y, w, h, action, false);
      return { action, panel, title, cost, note, label, g, zone, x, y, w, h };
    }

    drawActionButton(g, x, y, w, h, action, hover) {
      g.clear();
      const enabled = this.canChoose(action.id);
      const color = enabled ? action.color : NS.C.gray;
      g.fillStyle(NS.C.navy, 1).fillRoundedRect(x + 14, y + h - 48, w - 28, 38, 18);
      g.fillStyle(color, 1).fillRoundedRect(x + 14, y + h - 53, w - 28, 38, 18);
      g.lineStyle(3, NS.C.navy, 1).strokeRoundedRect(x + 14, y + h - 53, w - 28, 38, 18);
      if (hover && enabled) g.fillStyle(0xffffff, 0.18).fillRoundedRect(x + 17, y + h - 50, w - 34, 30, 14);
      const card = this.actionCards && this.actionCards.find((c) => c.action.id === action.id);
      if (card) card.label.setText(enabled ? 'Choose this plan' : 'Not enough power').setAlpha(enabled ? 1 : 0.62);
    }

    canChoose(id) {
      if (!this.mission || this.mission.mode !== 'playing') return false;
      if ((id === 'grow' || id === 'shelter') && this.mission.power < 2) return false;
      if (id === 'shelter' && this.mission.shield >= 3) return false;
      return true;
    }

    refresh() {
      const m = this.mission;
      this.resourceItems.forEach((item) => {
        const ui = this.resourceUi[item.key];
        const value = m[item.key];
        ui.value.setText(String(value));
        ui.bar.clear();
        ui.bar.fillStyle(NS.C.gray, 1).fillRoundedRect(ui.x + 14, 167, 100, 8, 4);
        const max = item.key === 'shield' ? 3 : 8;
        ui.bar.fillStyle(ui.color, 1).fillRoundedRect(ui.x + 14, 167, Math.max(0, 100 * Math.min(value, max) / max), 8, 4);
      });

      this.dayTitle.setText('MISSION DAY ' + m.day + ' OF ' + DAYS);
      if (m.day === m.stormDay - 1) {
        this.eventText.setText('SOLAR WARNING! A practice storm may arrive tomorrow. Charge the shelter today if you can.');
        this.eventText.setColor('#b94e36');
      } else if (m.day === m.stormDay) {
        this.eventText.setText('SOLAR STORM! Tiny space particles called radiation are passing by. A charged shelter can help protect the crew.');
        this.eventText.setColor('#b94e36');
      } else {
        this.eventText.setText(NS.STORY.missionDays[m.day - 1]);
        this.eventText.setColor(NS.C.slateHex);
      }
      this.footer.setText('Moon radio takes about 1.3 seconds one-way. Mars can take minutes, so crews need plans they can use without waiting for Earth.');
      this.actionCards.forEach((card) => {
        const enabled = this.canChoose(card.action.id);
        card.panel.setAlpha(enabled ? 1 : 0.62);
        card.title.setAlpha(enabled ? 1 : 0.62);
        card.cost.setAlpha(enabled ? 1 : 0.62);
        card.note.setAlpha(enabled ? 1 : 0.62);
        card.label.setAlpha(enabled ? 1 : 0.62);
        card.zone.setVisible(true);
        this.drawActionButton(card.g, card.x, card.y, card.w, card.h, card.action, false);
      });
    }

    choose(id) {
      if (!this.canChoose(id)) return;
      const m = this.mission;
      const action = ACTIONS.find((a) => a.id === id);
      if (id === 'grow') {
        m.power -= 2;
        m.food += 3;
        m.science += 1;
      } else if (id === 'save') {
        m.power += 2;
      } else {
        m.power -= 2;
        m.shield = Math.min(3, m.shield + 2);
      }

      m.air -= 1;
      m.food -= 1;
      m.power += 1;
      let result = action.story;
      if (m.day === m.stormDay) {
        if (m.shield > 0) {
          m.shield -= 1;
          result += ' The shelter blocks the storm!';
        } else {
          m.dose += 2;
          result += ' The crew’s radiation meter ticks up.';
        }
      }
      this.guide.say(result);

      if (m.air <= 0 || m.food <= 0) {
        m.mode = 'failed';
        this.refresh();
        this.showEnding(false, m.air <= 0
          ? 'Moon Camp needs more air supplies. Your crew pauses the mission to restock.'
          : 'Moon Camp needs more food supplies. Your crew pauses the mission to restock.');
        return;
      }
      if (m.day === DAYS) {
        m.mode = 'complete';
        this.refresh();
        this.showEnding(true, 'The crew made it through all five Moon days! Your choices kept Moon Camp going.');
        return;
      }
      m.day += 1;
      this.refresh();
    }

    showEnding(success, summary) {
      const D = 6000, x = 240, y = 190, w = 800, h = 340;
      this.add.rectangle(0, 0, NS.W, NS.H, 0x141a3d, 0.66).setOrigin(0).setDepth(D).setInteractive();
      NS.panel(this, x, y, w, h, { r: 28 }).setDepth(D + 1);
      NS.text(this, NS.W / 2, y + 38, success ? 'MOON CAMP SUCCESS!' : 'MOON CAMP NEEDS A RESTOCK!', 38)
        .setOrigin(0.5).setDepth(D + 2);
      NS.text(this, NS.W / 2, y + 102, summary, 19, NS.C.slateHex, '700')
        .setOrigin(0.5).setWordWrapWidth(680).setDepth(D + 2);
      const dose = this.mission.dose === 0
        ? 'No extra practice dose from the solar alert.'
        : 'Practice radiation dose: ' + this.mission.dose + ' points. A shield can reduce exposure.';
      NS.text(this, NS.W / 2, y + 158, dose, 17, NS.C.navyHex, '700')
        .setOrigin(0.5).setDepth(D + 2);
      NS.text(this, NS.W / 2, y + 184, success
        ? 'The crew cheers for your plan! Garden research points: ' + this.mission.science + '.'
        : 'No worries! Try a new plan—every mission teaches us something.',
        16, NS.C.navyHex, '700').setOrigin(0.5).setDepth(D + 2);
      NS.text(this, NS.W / 2, y + 210,
        'Real solar activity is monitored by NASA/CCMC DONKI; this alert was randomly generated for practice.',
        12, NS.C.slateHex, '700').setOrigin(0.5).setDepth(D + 2);
      NS.text(this, NS.W / 2, y + 226, 'Moon radio: seconds · Mars radio: minutes', 14, NS.C.slateHex)
        .setOrigin(0.5).setDepth(D + 2);
      const playAgain = NS.textButton(this, NS.W / 2 - 150, y + 290, 240, 54, 'Try another mission', () => this.scene.restart());
      const explore = NS.textButton(this, NS.W / 2 + 150, y + 290, 240, 54, 'Explore again', () => this.scene.start('Explore'), NS.C.orange);
      playAgain.setDepth(D + 2);
      explore.setDepth(D + 2);
    }
  }
  NS.MissionScene = MissionScene;
})();
