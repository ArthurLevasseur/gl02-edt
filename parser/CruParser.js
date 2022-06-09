const Path = require("path");
const FS = require("fs");
const Course = require('./Course.js');
const CourseTimeSlot = require('./CourseTimeSlot.js');
const Hour = require('./Hour.js');

let CruParser = function () {
    this.files = [];
    this.listCourses = [];
    this.listRooms = [];
    this.listTimeSlots = [];
    this.errorCount = 0;
    this.invalidFilesCount = 0;
    this.overlapsCount = 0;
}

//parse all .cru files in the directory
CruParser.prototype.parseAll = function (directory, showErrors) {
    //recursively search for all .cru files
    this.throughDirectory(directory, showErrors);

    //parse each files found
    this.files.forEach(file => {
        this.parse(FS.readFileSync(file, 'utf-8'), showErrors);
    });

    // We remove duplicates of the same rooms in the array of free rooms
    let tempArray = this.listRooms;
    this.listRooms = tempArray.filter(function (element, position) {
        return tempArray.indexOf(element) === position;

    });
}

CruParser.prototype.parse = function (data, showErrors) {
    let lines = data.split(/\r?\n/);
    let currentCourse = null;

    lines.forEach(line => {
        if (line.match(/^\+[A-Z0-9]+$/)) {//detect a new course
            //if previous course detected is empty
            if (currentCourse != null && currentCourse.timeSlots.length === 0) {
                //current course has no time slot it shouldn't had been read, remove it from the list
                let deletedCourse = this.listCourses.pop();
                if (showErrors) {
                    console.warn("Parsing error, " + deletedCourse.name + " was deleted. There was no time slots associated to it.");
                    this.errorCount++;
                }
            }

            let courseName = line.replace('+', '');
            currentCourse = new Course(courseName);
            this.listCourses.push(currentCourse);
        } else if (currentCourse != null) {
            //TODO modify parser to work with line like this
            // 1,D1,P=25,H=MA 13:00-14:00,F1,S=B210/L 16:00-18:00,F1,S=B210//
            if (line.match(/^1,[CDT][0-9]+,P=[0-9]+,H=(L|MA|ME|J|V|S|D)+ [0-9]{1,2}:[0-9]{2}-[0-9]{1,2}:[0-9]{2},F[0-9A-Z],S=[A-Z]+[0-9]*\/{2}$/)) {
                //a correctly formatted info line is detected

                //retrieve course type from the line
                let tp = line.match(/[CDT][0-9]+/)[0];

                //retrieve capacity
                let cp = line.match(/P=[0-9]+/)[0];
                cp = cp.replace('P=', '');
                cp = parseInt(cp, 10);

                //retrieve day of week
                let dy = line.match(/H=(L|MA|ME|J|V|S|D)/)[0];
                dy = dy.replace('H=', '');

                //retrieve course group
                let gp = line.match(/F[0-9A-Z]/)[0];

                //retrieve room
                let rm = line.match(/S=[A-Z]+[0-9]*/)[0];
                rm = rm.replace('S=', '');
                this.listRooms.push(rm);

                //retrieve hours
                let hours = line.match(/[0-9]{1,2}:[0-9]{2}-[0-9]{1,2}:[0-9]{2}/)[0];

                hours = hours.split('-');
                let hrS = Hour.stringToObject(hours[0]);
                let hrE = Hour.stringToObject(hours[1]);

                if (hrS === null || hrE === null) {
                    //invalid hours, don't create time slot
                    if (showErrors) {
                        console.warn("Parsing error, invalid hours: " + hours);
                        this.errorCount++;
                    }
                } else if (hrE.isLaterThan(hrS)) {
                    //valid hours, create time slot
                    let courseTimeSlot = new CourseTimeSlot(tp, cp, dy, hrS, hrE, gp, rm);

                    //verify that the time slot is not overlapping with an existing one
                    let overlapping = false;
                    let overlapWith;
                    this.listTimeSlots.forEach(tS => {
                        if (courseTimeSlot.isOverlappingWith(tS)) {
                            overlapping = true;
                            overlapWith = tS;
                        }
                    });

                    if (!overlapping) {
                        //add time slot to course and list
                        currentCourse.addTimeSlot(courseTimeSlot);
                        this.listTimeSlots.push(courseTimeSlot);
                    } else if (showErrors) {
                        console.warn("Overlap: " + courseTimeSlot + " can't be added because of " + overlapWith);
                        this.overlapsCount++;
                    }
                } else if (showErrors) {
                    console.warn("Parsing error, start hour is later than end hour: " + hours);
                    this.errorCount++;
                }
            } else {
                //the line doesn't contains valid data
                if (showErrors && line !== '') {
                    console.warn("Parsing error, can't read line: " + line);
                    this.errorCount++;
                }
            }
        }
    });

    //if last course detected is empty
    if (currentCourse != null && currentCourse.timeSlots.length === 0) {
        //current course has no time slot it shouldn't had been read, remove it from the list
        let deletedCourse = this.listCourses.pop();
        if (showErrors) {
            console.warn(deletedCourse + " was deleted. There was no time slots associated to it.")
        }
    }
}

//recursively search in a directory for .cru files
CruParser.prototype.throughDirectory = function (directory, showErrors) {
    FS.readdirSync(directory).forEach(file => {
        const absolute = Path.join(directory, file);

        if (FS.statSync(absolute).isDirectory()) {
            return this.throughDirectory(absolute);
        } else if (Path.extname(absolute) === '.cru') {
            //file has extension .cru, add it to the list
            return this.files.push(absolute);
        } else if (showErrors) {
            console.warn(absolute + " is not a valid file.");
            this.invalidFilesCount++;
        }
    });
}

module.exports = CruParser;
