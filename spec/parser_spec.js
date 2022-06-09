describe("Program testing of CruParser", function () {

    beforeAll(function () {
        const Course = require('../parser/Course.js');
        const CourseTimeSlot = require('../parser/CourseTimeSlot.js');
        const Hour = require('../parser/Hour.js');

        this.ap03 = new Course("AP03");
        this.ap03.timeSlots.push(new CourseTimeSlot("D1", 25, "V", new Hour(9, 0), new Hour(12, 0), "F1", "B103"));
    });

    it("can read a course from a simulated input", function () {
        let input = "+AP03\r\n1,D1,P=25,H=V 9:00-12:00,F1,S=B103//";

        const CruParser = require('../parser/CruParser.js');
        let analyser = new CruParser();

        analyser.parse(input, false);

        expect(analyser.listCourses[0]).toEqual(this.ap03);
    });

    it("doesn't read empty course from a simulated input", function () {
        let input = "+AP03\r\n \r\n";

        const CruParser = require('../parser/CruParser.js');
        let analyser = new CruParser();

        analyser.parse(input, false);

        expect(analyser.listCourses[0]).toBeUndefined();
    });

    it("doesn't read erupted data from a simulated input", function () {
        let input = "+LO02\r\n" +
            "1,C1,P=200,H=V 8:00-10:00,F1,S=N101//\r\n" +
            "?? 1,D3,P=24,H=L 8:00-10:00,F1,S=P203//\r\n" +
            "** 1,D1,P=24,H=V 10:00-12:00,F1,S=B204//\r\n" +
            "\r\n" + "Page g�n�r�e en : 1.1899800300598 sec";

        const CruParser = require('../parser/CruParser.js');
        let analyser = new CruParser();

        analyser.parse(input, false);

        expect(analyser.listCourses[0].timeSlots.length).toBe(1);
    });

    it("can find and parse all .cru files in a sample directory", function () {
        const CruParser = require('../parser/CruParser.js');

        let analyser = new CruParser();
        analyser.parseAll(__dirname + '/samples/valid_directory/');


        expect(analyser.listCourses.length).toBe(3);
    });

    it("doesn't parse non .cru files in a sample directory", function () {
        const CruParser = require('../parser/CruParser.js');

        let analyser = new CruParser();
        analyser.parseAll(__dirname + '/samples/invalid_directory/');


        expect(analyser.listCourses.length).toBe(0);
    });
});