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

    // User's Real Active 28 Athlete Pairs
    this.athletes = [
      { bib: '101', name: 'Daniel Seymour & Tanya Rajanish Nirmal', club: 'HYROX INDIA', nat: 'IND', pace: '3:30 /km', baseOffset: 0 },
      { bib: '102', name: 'Manav Gidwani & Vishwaja Shinde', club: 'FITNESS FIRST', nat: 'IND', pace: '3:32 /km', baseOffset: 3.5 },
      { bib: '103', name: 'Ajinkya Shevate & Manali Shevate', club: 'CROSSFIT 9ONE', nat: 'IND', pace: '3:35 /km', baseOffset: 7.2 },
      { bib: '104', name: 'Vijay Andrews & Prachi Shukla', club: 'HYFIT ACADEMY', nat: 'IND', pace: '3:38 /km', baseOffset: 11.0 },
      { bib: '105', name: 'Chitwan Goel & Megha Kishore', club: 'VYOM YOGA STUDIO', nat: 'IND', pace: '3:42 /km', baseOffset: 15.1 },
      { bib: '106', name: 'Teddy Cardozo & Swezial Dsouza', club: 'LIFTR GYM', nat: 'IND', pace: '3:45 /km', baseOffset: 18.8 },
      { bib: '107', name: 'Brijesh Gajjar & Hetanshi Gajjar', club: 'FITFORMANCE', nat: 'IND', pace: '3:48 /km', baseOffset: 22.4 },
      { bib: '108', name: 'Aanchal Singh & Harsh Kumar', club: '6262 FITNESS', nat: 'IND', pace: '3:52 /km', baseOffset: 26.0 },
      { bib: '109', name: 'Zaid Hashmi & Pournima Pardeshi', club: 'FLEXFIT', nat: 'IND', pace: '3:55 /km', baseOffset: 30.2 },
      { bib: '110', name: 'Sekhawat Monusingh & Susithra P M', club: 'HITENSITY', nat: 'IND', pace: '3:58 /km', baseOffset: 34.5 },
      { bib: '111', name: 'Purva Wahi & Maninder Singh', club: 'ARCH PHYSIO', nat: 'IND', pace: '4:02 /km', baseOffset: 38.1 },
      { bib: '112', name: 'Satvik Krishna Gupta & Millie Saroha', club: 'LATERALUS', nat: 'IND', pace: '4:05 /km', baseOffset: 42.0 },
      { bib: '113', name: 'Anand Bhagat & Zareen Siddique', club: 'THE FIT GROUND', nat: 'IND', pace: '4:08 /km', baseOffset: 46.2 },
      { bib: '114', name: 'Shatrugan Joukani & Apeksha Champaneri', club: 'TRF SPACE', nat: 'IND', pace: '4:12 /km', baseOffset: 50.0 },
      { bib: '115', name: 'Priyanka Prasad & Nobel Dhingra', club: 'BLACK BX', nat: 'IND', pace: '4:15 /km', baseOffset: 54.1 },
      { bib: '116', name: 'Sparsha S Vasisht & Surya S Vasisht', club: 'KONGFIT', nat: 'IND', pace: '4:18 /km', baseOffset: 58.5 },
      { bib: '117', name: 'Deepak Kumar & Renu Venugopal', club: 'CROSSFIT HUB', nat: 'IND', pace: '4:22 /km', baseOffset: 63.0 },
      { bib: '118', name: 'Megumi Saito & Anubhav Rai', club: 'HYROX TOKYO', nat: 'JPN', pace: '4:25 /km', baseOffset: 67.2 },
      { bib: '119', name: 'Pravin Rao & Suditi Bhaduria', club: 'PEAK FITNESS', nat: 'IND', pace: '4:28 /km', baseOffset: 71.0 },
      { bib: '120', name: 'Priyam Poddar & Meenal Jain', club: 'RED BULL GYM', nat: 'IND', pace: '4:32 /km', baseOffset: 75.4 },
      { bib: '121', name: 'Parshant Sharma & Riya Kataria (Rekha)', club: 'FITZONE DELHI', nat: 'IND', pace: '4:35 /km', baseOffset: 80.1 },
      { bib: '122', name: 'Ridhisha Shetty & Ritvik Shetty', club: 'MUMBAI STRIDERS', nat: 'IND', pace: '4:38 /km', baseOffset: 84.5 },
      { bib: '123', name: 'Devender Singh & Rachna Kalkal', club: 'DELHI STEEL', nat: 'IND', pace: '4:42 /km', baseOffset: 89.0 },
      { bib: '124', name: 'Divtesh Singh Dhir & Palak Kaur', club: 'PUNJAB FITNESS', nat: 'IND', pace: '4:45 /km', baseOffset: 93.2 },
      { bib: '125', name: 'Akshay Sharma & Akriti', club: 'STEEL GYM', nat: 'IND', pace: '4:48 /km', baseOffset: 97.5 },
      { bib: '126', name: 'Ishani Dave & Meet Pandya', club: 'GUJARAT HARRIERS', nat: 'IND', pace: '4:52 /km', baseOffset: 102.0 },
      { bib: '127', name: 'Abhijeet Ghadge & Zahabiya Merchant', club: 'IRON GYM', nat: 'IND', pace: '4:55 /km', baseOffset: 106.4 },
      { bib: '128', name: 'Gunjan Mehta & Mansi Nautiyal', club: 'POWER FITNESS', nat: 'IND', pace: '4:58 /km', baseOffset: 111.0 }
    ];

    this.doublesAthletes = this.athletes;
    this.singlesAthletes = this.athletes;

    this.startTimeMs = Date.now() - (1245 * 1000);
    this.timerInterval = null;
    this.overtakeInterval = null;

    this.splitEventsList = [
      { bib: '101', name: 'Daniel Seymour & Tanya Rajanish Nirmal', checkpoint: 'Sled Push 50m', time: '04:12' },
      { bib: '102', name: 'Manav Gidwani & Vishwaja Shinde', checkpoint: 'SkiErg 1000m', time: '04:16' },
      { bib: '103', name: 'Ajinkya Shevate & Manali Shevate', checkpoint: 'Burpee Broad Jump', time: '04:20' }
    ];
  }

  setCategory(categoryName) {
    this.currentCategory = categoryName || '';
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
    if (this.overtakeInterval) clearInterval(this.overtakeInterval);

    this.active = true;
    
    // Simulate rank position overtakes every 4 seconds
    this.overtakeInterval = setInterval(() => {
      this.simulateOvertake();
    }, 4000);

    this.timerInterval = setInterval(() => {
      if (Math.random() < 0.2) {
        this.simulateSplitCrossing();
      }
    }, 1000);
  }

  stop() {
    this.active = false;
    if (this.timerInterval) clearInterval(this.timerInterval);
    if (this.overtakeInterval) clearInterval(this.overtakeInterval);
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

  simulateOvertake() {
    if (!this.athletes || this.athletes.length < 2) return;
    // Swap random adjacent pair between rank 1 and 11
    const idx = Math.floor(Math.random() * 10);
    const temp = this.athletes[idx];
    this.athletes[idx] = this.athletes[idx + 1];
    this.athletes[idx + 1] = temp;

    // Recalculate offsets
    this.athletes.forEach((athlete, i) => {
      athlete.baseOffset = i === 0 ? 0 : (i * 3.5);
    });
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
        split: '',
        time: formattedTime,
        delta: deltaText
      };
    });
  }

  get splitEvents() {
    return this.splitEventsList;
  }

  simulateSplitCrossing() {
    const randomAthlete = this.athletes[Math.floor(Math.random() * 12)];
    const newEvent = {
      bib: randomAthlete.bib,
      name: randomAthlete.name,
      checkpoint: 'Station Checkpoint',
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
