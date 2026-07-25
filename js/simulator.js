/**
 * Dynamic Live Race Simulator for SportVot / Mika Timing GFX
 * Generates realistic live sports timing data when offline or in test mode.
 * Uses real wall-clock timestamps (Date.now()) so timers NEVER pause when switching tabs!
 */
class RaceSimulator {
  constructor() {
    this.active = false;
    this.meeting = {
      idMeeting: 'LR3MS4JI1710',
      titleText: 'Delhi Championship - Day 2 (Live Test)',
      location: 'JLN Stadium, Delhi',
      dateStart: new Date().toISOString().split('T')[0]
    };

    this.currentCategory = 'HYROX DOUBLES';

    // Standard Athletes (User's Real 28 Pairs)
    this.singlesAthletes = this.doublesAthletes;

    this.athletes = this.doublesAthletes;

    this.startTimeMs = Date.now() - (1245 * 1000);
    this.timerInterval = null;

    this.splitEventsList = [
      { bib: '101', name: 'Daniel Seymour & Tanya Rajanish Nirmal', checkpoint: 'Sled Push 50m', time: '04:12' },
      { bib: '102', name: 'Manav Gidwani & Vishwaja Shinde', checkpoint: 'SkiErg 1000m', time: '04:16' },
      { bib: '103', name: 'Ajinkya Shevate & Manali Shevate', checkpoint: 'Burpee Broad Jump', time: '04:20' },
      { bib: '104', name: 'Vijay Andrews & Prachi Shukla', checkpoint: 'Rowing 1000m', time: '04:25' }
    ];
  }

  setCategory(categoryName) {
    this.currentCategory = categoryName || '';
    this.athletes = this.doublesAthletes;
  }

  get elapsedSeconds() {
    if (!this.startTimeMs) {
      this.startTimeMs = Date.now() - (1245 * 1000);
    }
    return Math.floor((Date.now() - this.startTimeMs) / 1000);
  }

  set elapsedSeconds(sec) {
    this.startTimeMs = Date.now() - (sec * 1000);
  }

  start() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.active = true;
    this.timerInterval = setInterval(() => {
      if (Math.random() < 0.12) {
        this.simulateSplitCrossing();
      }
    }, 1000);
  }

  stop() {
    this.active = false;
    if (this.timerInterval) clearInterval(this.timerInterval);
  }

  formatTime(totalSec) {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = Math.floor(totalSec % 60);
    
    const pMins = String(mins).padStart(2, '0');
    const pSecs = String(secs).padStart(2, '0');
    
    if (hrs > 0) {
      return `${String(hrs).padStart(2, '0')}:${pMins}:${pSecs}`;
    }
    return `${pMins}:${pSecs}`;
  }

  getLeaderboardData() {
    const leaderTime = this.elapsedSeconds;
    
    return this.athletes.map((athlete, index) => {
      const athleteTimeSec = leaderTime + athlete.baseOffset;
      const formattedTime = this.formatTime(athleteTimeSec);
      const deltaSec = athlete.baseOffset;
      const deltaText = index === 0 ? '' : `+${deltaSec.toFixed(1)}s`;

      return {
        rank: index + 1,
        bib: athlete.bib,
        name: athlete.name,
        club: athlete.club,
        nat: athlete.nat,
        pace: athlete.pace,
        split: athlete.split,
        time: formattedTime,
        delta: deltaText
      };
    });
  }

  get splitEvents() {
    return this.splitEventsList;
  }

  simulateSplitCrossing() {
    const randomAthlete = this.athletes[Math.floor(Math.random() * this.athletes.length)];
    const splits = ['SkiErg 1000m', 'Sled Push 50m', 'Sled Pull 50m', 'Burpee Broad Jump', 'Rowing 1000m', 'Farmers Carry'];
    const randomSplit = splits[Math.floor(Math.random() * splits.length)];
    
    const newEvent = {
      bib: randomAthlete.bib,
      name: randomAthlete.name,
      checkpoint: randomSplit,
      time: this.formatTime(this.elapsedSeconds)
    };

    this.splitEventsList.unshift(newEvent);
    if (this.splitEventsList.length > 8) {
      this.splitEventsList.pop();
    }
  }
}

if (typeof window !== 'undefined') {
  window.RaceSimulator = RaceSimulator;
}
