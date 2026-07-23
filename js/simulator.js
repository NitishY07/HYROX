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

    // Standard Singles Athletes
    this.singlesAthletes = [
      { bib: '101', name: 'Rohan Sharma', club: 'Delhi Runners Club', nat: 'IND', pace: '3:45 /km', split: '5.2km', baseOffset: 0 },
      { bib: '108', name: 'Vikramaditya Singh', club: 'Peak Fitness Crew', nat: 'IND', pace: '3:48 /km', split: '5.2km', baseOffset: 4.2 },
      { bib: '142', name: 'Marcus Vance', club: 'Red Bull Athletics', nat: 'GBR', pace: '3:51 /km', split: '5.2km', baseOffset: 8.5 },
      { bib: '205', name: 'Arjun Mehta', club: 'HYROX India Team', nat: 'IND', pace: '3:55 /km', split: '5.2km', baseOffset: 12.1 },
      { bib: '119', name: 'David Miller', club: 'Berlin Speedsters', nat: 'GER', pace: '3:58 /km', split: '5.2km', baseOffset: 15.8 },
      { bib: '312', name: 'Priya Deshmukh', club: 'Mumbai Striders', nat: 'IND', pace: '4:02 /km', split: '5.2km', baseOffset: 22.0 },
      { bib: '188', name: 'Karan Malhotra', club: 'Delhi CrossFit Hub', nat: 'IND', pace: '4:05 /km', split: '5.2km', baseOffset: 28.4 },
      { bib: '240', name: 'Kenji Sato', club: 'Tokyo Endurance', nat: 'JPN', pace: '4:10 /km', split: '5.2km', baseOffset: 34.1 },
      { bib: '156', name: 'Siddharth Patel', club: 'Gujarat Harriers', nat: 'IND', pace: '4:12 /km', split: '5.2km', baseOffset: 39.5 },
      { bib: '299', name: 'Alexandre Dubois', club: 'Paris Athletics', nat: 'FRA', pace: '4:18 /km', split: '5.2km', baseOffset: 45.2 }
    ];

    // HYROX Doubles & Battle of Gyms Teams
    this.doublesAthletes = [
      { bib: 'D-501', name: 'R. Sharma & V. Singh', club: 'Delhi CrossFit Gym (BOG)', nat: 'IND', pace: '3:30 /km', split: '800m', baseOffset: 0 },
      { bib: 'D-504', name: 'M. Vance & D. Miller', club: 'Red Bull Performance Gym', nat: 'GBR', pace: '3:34 /km', split: '800m', baseOffset: 3.8 },
      { bib: 'D-512', name: 'A. Mehta & S. Patel', club: 'HYROX India HQ Gym', nat: 'IND', pace: '3:38 /km', split: '800m', baseOffset: 7.2 },
      { bib: 'D-520', name: 'K. Malhotra & P. Deshmukh', club: 'Mumbai Striders Gym', nat: 'IND', pace: '3:42 /km', split: '800m', baseOffset: 11.5 },
      { bib: 'D-533', name: 'K. Sato & A. Dubois', club: 'Tokyo Fitness Arena', nat: 'JPN', pace: '3:46 /km', split: '800m', baseOffset: 16.0 },
      { bib: 'D-540', name: 'A. Kumar & R. Verma', club: 'FitZone Delhi Gym', nat: 'IND', pace: '3:50 /km', split: '800m', baseOffset: 20.4 },
      { bib: 'D-555', name: 'J. Smith & L. Taylor', club: 'London Iron Gym', nat: 'GBR', pace: '3:55 /km', split: '800m', baseOffset: 25.1 }
    ];

    this.athletes = this.doublesAthletes;

    this.startTimeMs = Date.now() - (1245 * 1000);
    this.timerInterval = null;

    this.splitEventsList = [
      { bib: 'D-501', name: 'R. Sharma & V. Singh', checkpoint: 'Sled Push (200m)', time: '04:12' },
      { bib: 'D-504', name: 'M. Vance & D. Miller', checkpoint: 'Sled Push (200m)', time: '04:16' },
      { bib: 'D-512', name: 'A. Mehta & S. Patel', checkpoint: 'SkiErg (400m)', time: '04:20' },
      { bib: 'D-520', name: 'K. Malhotra & P. Deshmukh', checkpoint: 'SkiErg (400m)', time: '04:25' }
    ];
  }

  setCategory(categoryName) {
    this.currentCategory = categoryName || '';
    if (this.currentCategory.toUpperCase().includes('DOUBLES') || this.currentCategory.toUpperCase().includes('BATTLE') || this.currentCategory.toUpperCase().includes('GYMS')) {
      this.athletes = this.doublesAthletes;
      this.splitEventsList = [
        { bib: 'D-501', name: 'R. Sharma & V. Singh', checkpoint: 'Battle of Gyms Heat 1', time: '04:12' },
        { bib: 'D-504', name: 'M. Vance & D. Miller', checkpoint: 'Battle of Gyms Heat 1', time: '04:16' },
        { bib: 'D-512', name: 'A. Mehta & S. Patel', checkpoint: 'Sled Push (200m)', time: '04:20' }
      ];
    } else {
      this.athletes = this.singlesAthletes;
    }
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
      const deltaText = index === 0 ? 'LEADER' : `+${deltaSec.toFixed(1)}s`;

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
