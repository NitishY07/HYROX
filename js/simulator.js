/**
 * Dynamic Live Race Simulator for SportVot / Mika Timing GFX
 * Generates realistic live sports timing data when offline or in test mode.
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

    this.races = [
      { idRace: 'RACE-01', descriptionText: 'HYROX Men Open', distanceText: '8km' },
      { idRace: 'RACE-02', descriptionText: 'HYROX Doubles Pro', distanceText: '1km' },
      { idRace: 'RACE-03', descriptionText: '10K Elite Sprint', distanceText: '10km' },
      { idRace: 'RACE-04', descriptionText: 'Half Marathon Championship', distanceText: '21.1km' }
    ];

    this.selectedRaceId = 'RACE-01';
    this.elapsedSeconds = 1245; // Start around 20m 45s
    this.timerInterval = null;

    this.athletes = [
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

    this.splitEventsRaw = [
      { bib: '101', name: 'Rohan Sharma', checkpoint: 'Split 3 (5.2km)', offsetSec: 75 },
      { bib: '108', name: 'Vikramaditya Singh', checkpoint: 'Split 3 (5.2km)', offsetSec: 71 },
      { bib: '142', name: 'Marcus Vance', checkpoint: 'Split 3 (5.2km)', offsetSec: 67 },
      { bib: '205', name: 'Arjun Mehta', checkpoint: 'Split 3 (5.2km)', offsetSec: 63 },
      { bib: '119', name: 'David Miller', checkpoint: 'Split 3 (5.2km)', offsetSec: 59 }
    ];
  }

  start() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.active = true;
    this.timerInterval = setInterval(() => {
      this.elapsedSeconds += 1;
      
      if (Math.random() < 0.15) {
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
    return this.splitEventsRaw.map(event => ({
      bib: event.bib,
      name: event.name,
      checkpoint: event.checkpoint,
      time: this.formatTime(Math.max(0, this.elapsedSeconds - event.offsetSec))
    }));
  }

  simulateSplitCrossing() {
    const randomAthlete = this.athletes[Math.floor(Math.random() * this.athletes.length)];
    const splits = ['CheckPoint 1 (2km)', 'CheckPoint 2 (4km)', 'CheckPoint 3 (6km)', 'Final Stretch (7.5km)'];
    const randomSplit = splits[Math.floor(Math.random() * splits.length)];
    
    const newEvent = {
      bib: randomAthlete.bib,
      name: randomAthlete.name,
      checkpoint: randomSplit,
      offsetSec: 0
    };

    this.splitEventsRaw.unshift(newEvent);
    if (this.splitEventsRaw.length > 10) {
      this.splitEventsRaw.pop();
    }
  }
}

if (typeof window !== 'undefined') {
  window.RaceSimulator = RaceSimulator;
}
