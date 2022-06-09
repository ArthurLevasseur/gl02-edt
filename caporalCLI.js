const {program} = require("@caporal/core");
const CruParser = require("./parser/CruParser.js")
const Hour = require("./parser/Hour.js")
const CourseTimeSlot = require("./parser/CourseTimeSlot.js")
const VegaChart = require("./VegaChart");
const vc = new VegaChart();
const fs = require('fs');
const nodemailer = require("nodemailer");

let validators = {
    NAME: function (value) {
        if (value == null)
            return null;

        if (!value.match(/[A-Z0-9]+/)) {
            throw new Error("Entry given for name isn't valid.")
        }

        return value;
    },
    TYPE: function (value) {
        if (value == null)
            return null;

        if (!value.match(/[CDT][0-9]+/))
            throw new Error("Entry given for type isn't valid.");

        return value;
    },
    CAPACITY: function (value) {
        if (value == null)
            return null;

        if (!value.match(/[0-9]+/))
            throw new Error("Entry given for capacity isn't an integer.");

        return +value;
    },
    DAY: ['L', 'MA', 'ME', 'J', 'V', 'S', 'D'],
    HOUR: function (value) {
        if (value == null)
            return null;

        if (!value.match(/[0-9]{1,2}:[0-9]{2}/)) {
            throw new Error("Entry given for hour isn't valid.");
        } else {
            let time = value.split(':');

            time[0] = parseInt(time[0]);
            if (time[0] < 0 || time[0] > 23)
                throw new Error("A valid hour should be between 0 and 23.");

            time[1] = parseInt(time[1]);
            if (time[1] < 0 || time[1] > 59)
                throw new Error("Valid minutes should be between 0 and 59.");
        }

        return value;
    },
    GROUP: ['F1', 'F2', 'FA', 'FB'],
    ROOM: function (value) {
        if (value == null)
            return null;

        if (!value.match(/[A-Z]+[0-9]*/)) {
            throw new Error("Entry given for room isn't valid.")
        }

        return value;
    },
    EMAIL: function (value) {
        if (value == null)
            return null;
        if (!value.match(/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/))
            throw new Error("Entry given for email address isn't valid.");

        return value;
    }
}

program
    //read
    .command('read', 'Read all .cru file in <directory>')
    .argument('<directory>', 'Directory to read from.')
    .option('-e, --showErrors', 'log parsing errors', {validator: program.BOOLEAN, default: false})
    .action(({args, options, logger}) => {
        let analyser = new CruParser();
        analyser.parseAll(args.directory, options.showErrors);

        let infos = "Liste des cours et de leurs infos :\n";
        analyser.listCourses.forEach(course => {
            infos += "\n" + course.name + "\n";
            course.timeSlots.forEach(timeSlot => infos += timeSlot + "\n");
        })

        logger.info(infos);
    })

    //verify data
    .command('verifyData', 'Verify if a <directory> is a valid CRU database')
    .argument('<directory>', 'Directory to verify.')
    .action(({args, logger}) => {
        let analyser = new CruParser();
        analyser.parseAll(args.directory, true);

        if (analyser.files.length > 0) {
            logger.info(analyser.files.length + " files successfully parsed. " + analyser.invalidFilesCount + " invalid files found.");
            logger.info(analyser.errorCount + " parsing errors occurred. See above.");
            logger.info(analyser.overlapsCount + " time slots could not be added because of overlapping. See above.");
            logger.info(analyser.listCourses.length + " courses found with " + analyser.listTimeSlots.length + " time slots.");
        } else if (analyser.invalidFilesCount > 0) {
            logger.info(analyser.invalidFilesCount + " invalid files have been found. But none valid.");
        } else {
            logger.info("Zero file have been found.");
        }
    })

    //search
    .command('search', 'Search information about a <course> in a cru database read from a <directory>')
    .argument('<directory>', 'The directory to read from')
    .argument('<course>', 'The name of the course to search for', {validator: validators.NAME})
    .option('-t, --type [type]', 'specific type to search for', {validator: validators.TYPE | null, default: null})
    .option('-c, --capacity [capacity]', 'specific capacity to search for', {
        validator: validators.CAPACITY | null,
        default: null
    })
    .option('-d, --day [day]', 'specific day to search for', {validator: validators.DAY | null, default: null})
    .option('-s, --startTime [start]', 'specific time to search for time slots that starts past it', {
        validator: validators.HOUR,
        default: null
    })
    .option('-e, --endTime [end]', 'specific time to search for time slots that ends before it', {
        validator: validators.HOUR,
        default: null
    })
    .option('-g, --group [group]', 'specific group to search for', {validator: validators.GROUP | null, default: null})
    .option('-r, --room [room]', 'specific room to search for', {validator: validators.ROOM, default: null})
    .action(({args, options, logger}) => {
        //Extract data from directory
        let analyser = new CruParser();
        analyser.parseAll(args.directory, false);

        let foundCourse = analyser.listCourses.find(course => course.name === args.course);
        if (foundCourse === undefined) {
            logger.info("Course not found.")
        } else {
            let courseTimeSlots = foundCourse.timeSlots;

            //filter by type
            if (options.type != null)
                courseTimeSlots = courseTimeSlots.filter(timeSlot => timeSlot.type === options.type);

            //filter by capacity
            if (options.capacity != null)
                courseTimeSlots = courseTimeSlots.filter(timeSlot => timeSlot.capacity === options.capacity);

            //filter by day
            if (options.day != null)
                courseTimeSlots = courseTimeSlots.filter(timeSlot => timeSlot.day === options.day);

            //filter slots before start time
            let startTime = null;
            if (options.startTime != null) {
                startTime = Hour.stringToObject(options.startTime);
                courseTimeSlots = courseTimeSlots.filter(timeSlot => timeSlot.hourStart.toFloat() >= startTime.toFloat());
            }

            //filter slots past end time
            let endTime = null;
            if (options.endTime != null) {
                endTime = Hour.stringToObject(options.endTime);
                courseTimeSlots = courseTimeSlots.filter(timeSlot => timeSlot.hourEnd.toFloat() <= endTime.toFloat());
            }

            //if both start time and end time is used, verify that end time is lather than start time
            if (startTime != null && endTime != null) {
                if (!endTime.isLaterThan(startTime))
                    throw new Error("End time must be later thant start time.")
            }

            //filter by group
            if (options.group != null)
                courseTimeSlots = courseTimeSlots.filter(timeSlot => timeSlot.group === options.group);

            //filter by room
            if (options.room != null)
                courseTimeSlots = courseTimeSlots.filter(timeSlot => timeSlot.room === options.room);

            //display infos
            let infos = "Créneau trouvés pour l'UE " + args.course + ":\n";
            courseTimeSlots.forEach(timeSlot => infos += timeSlot + "\n");
            logger.info(infos);
        }
    })

    .command('roomChart', 'Generates a chart with the occupation of the chosen <room> every day of the week. ' +
        'From the data contained in a cru database read from the <directory>')
    .argument('<directory>', 'The directory to read with the parser')
    .argument('<room>', 'The room from which you want to get the occupation', {validator: validators.ROOM})
    .action(({args, logger}) => {
        let analyser = new CruParser();
        analyser.parseAll(args.directory, false);

        if (analyser.listRooms.filter(room => room === args.room).length === 0) {
            return logger.info("Room not found.");
        }

        vc.createRoomChart(analyser, args.room);
        logger.info("Chart generated.\nIt can be found in the /charts directory")
    })

    //Occupation of rooms in hours
    .command('occupation', 'Generates a chart of the occupation in hours of each room.' +
        'From the data contained in a cru database read from the <directory>')
    .argument('<directory>', 'Directory to read from.')
    .action(({args, logger}) => {
        let analyzer = new CruParser();
        analyzer.parseAll(args.directory);

        vc.createOccupationChart(analyzer);
        logger.info("Chart generated.\nIt can be found in the /charts directory");
    })

    //add to a cru file
    .command('addToCal', 'Chose a course to be added to the iCalendar')
    .argument('<directory>', 'The directory to read with the parser')
    .argument('<class>', 'The name of the class you want to add', {validator: validators.NAME})
    .argument('<type>', 'The type of the class you want to add', {validator: validators.TYPE})
    .argument('<day>', 'A day when this class is held', {validator: validators.DAY})
    .argument('<hour>', 'A moment of the chosen day when this class is held', {validator: validators.HOUR})
    .action(({args, logger}) => {
        let analyzer = new CruParser();
        analyzer.parseAll(args.directory);

        let courseFound = false;

        analyzer.listCourses.forEach(course => {
            if (course.name === args.class) {
                course.timeSlots.forEach(slot => {
                    if (slot.type === args.type && slot.day === args.day) {
                        let requestedStartHour = Hour.stringToObject(args.hour);
                        if (slot.hourStart.toFloat() === requestedStartHour.toFloat()) {
                            courseFound = true;
                            logger.info("Le cours a été trouvé !");
                            logger.info("Cours: " + course.name + ", " + slot);

                            //create folder out if it doesn't exists
                            if (!fs.existsSync('./out')) {
                                fs.mkdirSync('./out');
                            }

                            fs.appendFile('./out/temp_ical.cru', '+' + course.name + '\n1,' + slot.type + ',P=' +
                                slot.capacity + ',H=' + slot.day + ' ' + slot.hourStart + '-' + slot.hourEnd +
                                ',F1,S=' + slot.room + '//\n', function (err) {
                                if (err) logger.warn(err);
                                logger.info('Le cours a bien été sauvegardé.');
                            });
                        }
                    }
                });
            }
        });

        if (courseFound === false) {
            logger.warn("Le cours n'a pas été trouvé.");
        }
    })


    // generate iCalendar from previously added course into a temp file
    .command('generateCal', 'Generates an iCalendar file from previously chosen (with command addToCal) courses.')
    .option('-m, --mail [mail]', 'User email adress', {validator: validators.EMAIL | null, default: null})
    .action(({options, logger}) => {
        let analyzer = new CruParser();

        fs.readFile('./out/temp_ical.cru', 'utf-8', function (err, data) {
            if (err) {
                logger.warn('No selected course found. Before this command you must use addToCal.');
                return;
            }

            analyzer = new CruParser();
            analyzer.parse(data);

            // Generate ics file name
            let icsFileName = 'icalendar-' + Date.now() + '.ics';

            let iCalContent = [];

            iCalContent.push('BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//SRYEM//Schedule//EN\r\n');

            analyzer.listCourses.forEach(course => {
                course.timeSlots.forEach(slot => {

                    let dateToday = new Date();
                    let currentYear = dateToday.getFullYear();

                    iCalContent.push('BEGIN:VEVENT\r\nDTSTART:' + currentYear + '0901T' + slot.hourStart.toIcalFormat() + '\r\n');
                    iCalContent.push('DTEND:' + currentYear + '0901T' + slot.hourEnd.toIcalFormat() + '\r\n');
                    iCalContent.push('RRULE:FREQ=WEEKLY;BYDAY=');

                    switch (slot.day) {
                        case 'L':
                            iCalContent.push('MO');
                            break;
                        case 'MA':
                            iCalContent.push('TU');
                            break;
                        case 'ME':
                            iCalContent.push('WE');
                            break;
                        case 'J':
                            iCalContent.push('TH');
                            break;
                        case 'V':
                            iCalContent.push('FR');
                            break;
                        case 'S':
                            iCalContent.push('SA');
                            break;
                        case 'D':
                            iCalContent.push('SU');
                            break;
                        default:
                            return logger.warn("Invalid day format in the given file");
                    }

                    iCalContent.push('\r\nSUMMARY:');

                    switch (slot.type[0]) {
                        case 'C':
                            iCalContent.push('Cours de ' + course.name + ' en salle ' + slot.room);
                            break;
                        case 'D':
                            iCalContent.push('TD de ' + course.name + ' en salle ' + slot.room);
                            break;
                        case 'T':
                            iCalContent.push('TP de ' + course.name + ' en salle ' + slot.room);
                            break;
                        default :
                            return logger.warn("Invalid type format in the given file");
                    }

                    iCalContent.push('\r\nEND:VEVENT\r\n');
                });
            });

            iCalContent.push('END:VCALENDAR\r\n');

            fs.writeFileSync('./out/' + icsFileName, iCalContent.join(""), function (err) {
                if (err) {
                    return logger.warn(err);
                }
            });

            logger.info("Fichier iCalendar créé à l'emplacement" + __dirname + "/out/" + icsFileName);

            if (options.mail != null) {
                let destEmail = options.mail; // Email recipient

                // Create transporter object using the gmail SMTP transport
                let transporter = nodemailer.createTransport({
                    host: "smtp.gmail.com",
                    port: 465,
                    secure: true,
                    auth: {
                        user: 'republicsealand@gmail.com',
                        pass: 'sealandRep10?',
                    },
                    tls: {
                        rejectUnauthorized: false
                    }
                });

                // Email content and options
                let mailOptions = {
                    from: '"Sealand Republic" <republicsealand@gmail.com>',
                    to: destEmail,
                    subject: "[SRU] Student timetable",
                    html: "<p>The Sealand Republic Central University (SRU) is pleased to inform you that you " +
                        "personal timetable has been generated.</p><p>In the attachment of this email, you will find " +
                        "a timetable file that you can add to your calendar. Depending on the Email client you are " +
                        "using, you can directly add the file to your calendar, or you will have to download the " +
                        ".ics file and to open it with an appropriate calendar application.</p><p>We wish you a " +
                        "joyful and successful school year.</p><p>Yours sincerely.</p><p>The SRU</p>",
                    icalEvent: {
                        filename: 'timetable.ics',
                        method: 'publish',
                        path: './out/' + icsFileName
                    }
                };

                // Send the email
                transporter.sendMail(mailOptions, function (error) {
                    if (error)
                        return logger.warn(error);
                    logger.info('Le fichier iCalendar a bien été envoyé par mail à ' + options.mail);
                });
            }

            //remove temp file
            fs.unlink('./out/temp_ical.cru', err => {
                if (err) logger.warn(err);
            });
        });
    })


    //Sort the rooms by capacity
    .command('sortRooms', 'Sort the rooms by capacity from the data contained in a cru database read from a <directory>')
    .argument('<directory>', 'Directory to read from.')
    .action(({args, logger}) => {
        let analyzer = new CruParser();
        analyzer.parseAll(args.directory);

        //Get a map of each rooms with their maximum capacity
        const rooms = new Map();
        analyzer.listTimeSlots.forEach(tS => {
            if (!rooms.has(tS.room) || tS.capacity > rooms.get(tS.room))
                rooms.set(tS.room, tS.capacity);
        });

        //Associate rooms by capacity
        const capacities = new Map();
        rooms.forEach((capacity, room) => {
            if (!capacities.has(capacity))
                capacities.set(capacity, []);

            capacities.get(capacity).push(room);
        });

        //convert the map to an array of objects and sort by capacity
        let array = Array.from(capacities).map(([k, v]) => {
            return {[k]: v}
        }).sort((a, b) => {
            return Object.keys(a)[0] - Object.keys(b)[0];
        });

        //output to .json file
        let json = JSON.stringify(array, null, 4)

        //create folder out if it doesn't exists
        if (!fs.existsSync('./out')) {
            fs.mkdirSync('./out');
        }

        fs.writeFile('./out/rooms_by_capacities.json', json, err => {
            if (err) {
                logger.warn(err)
                return
            }
            logger.info("Output to ./out/rooms_by_capacities.json");
        });
    })

    // Search for empty rooms
    .command('availableRooms', 'Search for empty rooms at the specified <day>, <startTime> and <endTime>.' +
        'From the data contained in a cru database read from the <directory>')
    .argument('<directory>', 'Directory to read from.')
    .argument('<day>', 'Day when to search for empty rooms', {validator: validators.DAY})
    .argument('<startTime>', 'Beginning of the time slot to use to search for empty rooms. Example of format : 8:00', {validator: validators.HOUR})
    .argument('<endTime>', 'End of the time slot to use to search for empty rooms. Example of format : 10:00', {validator: validators.HOUR})
    .option('-e, --showErrors', 'log parsing errors', {validator: program.BOOLEAN, default: false})
    .action(({args, options, logger}) => {
        let analyzer = new CruParser();
        analyzer.parseAll(args.directory, options.showErrors);

        let unavailableRoomsCount = 0;

        // We convert the hours of the time slot given to float
        let hrS = Hour.stringToObject(args.startTime);
        let hrE = Hour.stringToObject(args.endTime);

        // Check if the End hour is later than the start hour
        if (!hrE.isLaterThan(hrS))
            return logger.warn("Invalid input, given endTime(" + args.endTime + ") is before the given startTime(" + args.startTime + ").");

        let givenTimeSlot = new CourseTimeSlot(null, null, args.day, hrS, hrE, null, null);

        //get the list of available rooms for the given time slot
        let availableRooms = analyzer.listRooms.filter(room => {
            let available = true;
            givenTimeSlot.room = room;

            //search for overlapping time slots
            analyzer.listTimeSlots.forEach(tS => {
                if (tS.isOverlappingWith(givenTimeSlot))
                    available = false;
            });

            if (!available) unavailableRoomsCount++;

            return available;
        });

        // Display the answer
        logger.info(availableRooms.length + " salles disponibles le " + givenTimeSlot.dayToString() + " de " +
            args.startTime + " à " + args.endTime + " :\n" + availableRooms + "\nSur un total de " +
            analyzer.listRooms.length + " salles trouvées (" + unavailableRoomsCount + " non disponibles).");
    });

program.run();
