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

    // User's Real Active HYROX Athletes & Doubles Pairs List (28 Teams)
    this.doublesAthletes = [
      { bib: '101', name: 'Daniel Seymour & Tanya Rajanish Nirmal', club: 'HYROX INDIA', nat: 'IND', pace: '3:30 /km', split: 'Sled Push 50m', baseOffset: 0 },
      { bib: '102', name: 'Manav Gidwani & Vishwaja Shinde', club: 'FITNESS FIRST', nat: 'IND', pace: '3:32 /km', split: 'SkiErg 1000m', baseOffset: 3.5 },
      { bib: '103', name: 'Ajinkya Shevate & Manali Shevate', club: 'CROSSFIT 9ONE', nat: 'IND', pace: '3:35 /km', split: 'Burpee Broad Jump', baseOffset: 7.2 },
      { bib: '104', name: 'Vijay Andrews & Prachi Shukla', club: 'HYFIT ACADEMY', nat: 'IND', pace: '3:38 /km', split: 'Rowing 1000m', baseOffset: 11.0 },
      { bib: '105', name: 'Chitwan Goel & Megha Kishore', club: 'VYOM YOGA STUDIO', nat: 'IND', pace: '3:42 /km', split: 'Farmers Carry', baseOffset: 15.1 },
      { bib: '106', name: 'Teddy Cardozo & Swezial Dsouza', club: 'LIFTR GYM', nat: 'IND', pace: '3:45 /km', split: 'Sled Pull 50m', baseOffset: 18.8 },
      { bib: '107', name: 'Brijesh Gajjar & Hetanshi Gajjar', club: 'FITFORMANCE', nat: 'IND', pace: '3:48 /km', split: 'Wall Balls 100', baseOffset: 22.4 },
      { bib: '108', name: 'Aanchal Singh & Harsh Kumar', club: '6262 FITNESS', nat: 'IND', pace: '3:52 /km', split: 'Sandbag Lunges 100m', baseOffset: 26.0 },
      { bib: '109', name: 'Zaid Hashmi & Pournima Pardeshi', club: 'FLEXFIT', nat: 'IND', pace: '3:55 /km', split: 'Roxzone Transition', baseOffset: 30.2 },
      { bib: '110', name: 'Sekhawat Monusingh & Susithra P M', club: 'HITENSITY', nat: 'IND', pace: '3:58 /km', split: 'Finish Line', baseOffset: 34.5 },
      { bib: '111', name: 'Purva Wahi & Maninder Singh', club: 'ARCH PHYSIO', nat: 'IND', pace: '4:02 /km', split: 'Run 1 1000m', baseOffset: 38.1 },
      { bib: '112', name: 'Satvik Krishna Gupta & Millie Saroha', club: 'LATERALUS', nat: 'IND', pace: '4:05 /km', split: 'Sled Push 50m', baseOffset: 42.0 },
      { bib: '113', name: 'Anand Bhagat & Zareen Siddique', club: 'THE FIT GROUND', nat: 'IND', pace: '4:08 /km', split: 'SkiErg 1000m', baseOffset: 46.2 },
      { bib: '114', name: 'Shatrugan Joukani & Apeksha Champaneri', club: 'TRF SPACE', nat: 'IND', pace: '4:12 /km', split: 'Burpee Broad Jump', baseOffset: 50.0 },
      { bib: '115', name: 'Priyanka Prasad & Nobel Dhingra', club: 'BLACK BX', nat: 'IND', pace: '4:15 /km', split: 'Rowing 1000m', baseOffset: 54.1 },
      { bib: '116', name: 'Sparsha S Vasisht & Surya S Vasisht', club: 'KONGFIT', nat: 'IND', pace: '4:18 /km', split: 'Farmers Carry', baseOffset: 58.5 },
      { bib: '117', name: 'Deepak Kumar & Renu Venugopal', club: 'CROSSFIT HUB', nat: 'IND', pace: '4:22 /km', split: 'Sled Pull 50m', baseOffset: 63.0 },
      { bib: '118', name: 'Megumi Saito & Anubhav Rai', club: 'HYROX TOKYO', nat: 'JPN', pace: '4:25 /km', split: 'Wall Balls 100', baseOffset: 67.2 },
      { bib: '119', name: 'Pravin Rao & Suditi Bhaduria', club: 'PEAK FITNESS', nat: 'IND', pace: '4:28 /km', split: 'Sandbag Lunges 100m', baseOffset: 71.0 },
      { bib: '120', name: 'Priyam Poddar & Meenal Jain', club: 'RED BULL GYM', nat: 'IND', pace: '4:32 /km', split: 'Roxzone Transition', baseOffset: 75.4 },
      { bib: '121', name: 'Parshant Sharma & Riya Kataria (Rekha)', club: 'FITZONE DELHI', nat: 'IND', pace: '4:35 /km', split: 'Finish Line', baseOffset: 80.1 },
      { bib: '122', name: 'Ridhisha Shetty & Ritvik Shetty', club: 'MUMBAI STRIDERS', nat: 'IND', pace: '4:38 /km', split: 'Run 1 1000m', baseOffset: 84.5 },
      { bib: '123', name: 'Devender Singh & Rachna Kalkal', club: 'DELHI STEEL', nat: 'IND', pace: '4:42 /km', split: 'Sled Push 50m', baseOffset: 89.0 },
      { bib: '124', name: 'Divtesh Singh Dhir & Palak Kaur', club: 'PUNJAB FITNESS', nat: 'IND', pace: '4:45 /km', split: 'SkiErg 1000m', baseOffset: 93.2 },
      { bib: '125', name: 'Akshay Sharma & Akriti', club: 'STEEL GYM', nat: 'IND', pace: '4:48 /km', split: 'Burpee Broad Jump', baseOffset: 97.5 },
      { bib: '126', name: 'Ishani Dave & Meet Pandya', club: 'GUJARAT HARRIERS', nat: 'IND', pace: '4:52 /km', split: 'Rowing 1000m', baseOffset: 102.0 },
      { bib: '127', name: 'Abhijeet Ghadge & Zahabiya Merchant', club: 'IRON GYM', nat: 'IND', pace: '4:55 /km', split: 'Farmers Carry', baseOffset: 106.4 },
      { bib: '128', name: 'Gunjan Mehta & Mansi Nautiyal', club: 'POWER FITNESS', nat: 'IND', pace: '4:58 /km', split: 'Finish Line', baseOffset: 111.0 }
    ];

    this.athletes = this.doublesAthletes;

    this.startTimeMs = Date.now() - (1245 * 1000);
    this.timerInterval = null;

    this.splitEventsList = [
      { bib: 'D-501', name: 'Rohan Sharma & Vikramaditya Singh', checkpoint: 'Sled Push (200m)', time: '04:12' },
      { bib: 'D-504', name: 'Marcus Vance & David Miller', checkpoint: 'Sled Push (200m)', time: '04:16' },
      { bib: 'D-512', name: 'Arjun Mehta & Siddharth Patel', checkpoint: 'SkiErg (400m)', time: '04:20' },
      { bib: 'D-520', name: 'Karan Malhotra & Priya Deshmukh', checkpoint: 'SkiErg (400m)', time: '04:25' }
    ];
  }

  setCategory(categoryName) {
    this.currentCategory = categoryName || '';
    const upper = this.currentCategory.toUpperCase();
    if (upper.includes('DOUBLES') || upper.includes('BATTLE') || upper.includes('GYM') || upper.includes('BOG')) {
      this.athletes = this.doublesAthletes;
      this.splitEventsList = [
        { bib: 'D-501', name: 'Rohan Sharma & Vikramaditya Singh', checkpoint: 'Battle of Gyms Heat 1', time: '04:12' },
        { bib: 'D-504', name: 'Marcus Vance & David Miller', checkpoint: 'Battle of Gyms Heat 1', time: '04:16' },
        { bib: 'D-512', name: 'Arjun Mehta & Siddharth Patel', checkpoint: 'Sled Push (200m)', time: '04:20' }
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
