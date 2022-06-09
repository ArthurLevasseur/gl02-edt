const VL = require("vega-lite");
const Vega = require("vega");
const FS = require("fs");

let VegaChart = function () {
};

VegaChart.prototype.createRoomChart = function (analyzer, room) {
    let values = [];
    analyzer.listCourses.forEach(course => {
        course.timeSlots.forEach(timeSlot => {
            if (timeSlot.room === room)
                values.push({
                    "course": course.name,
                    "day": timeSlot.dayToString(),
                    "bin_start": timeSlot.hourStart.toFloat(),
                    "bin_end": timeSlot.hourEnd.toFloat(),
                    "students": timeSlot.capacity
                });
        });
    });

    values = JSON.stringify(values);

    let
        chartJSON = {
            "data": {
                "values": values
            },
            "title": "Occupation de la " + room,
            "facet": {"column": {"field": "day", "type": "nominal", "title": "Jour"}},
            "spec": {
                "encoding": {
                    "y": {"field": "students", "type": "quantitative", "title": "Nombre d'étudiants"},
                    "x": {
                        "field": "bin_start",
                        "bin": {"binned": true, "step": 1},
                        "title": "Heures"
                    },
                    "x2": {
                        "field": "bin_end"
                    }
                },
                "layer": [{
                    "mark": "bar"
                }, {
                    "mark": {
                        "type": "text",
                        "align": "left",
                        "baseline": "middle",
                        "dy": -5
                    },
                    "encoding": {
                        "text": {"field": "course", "type": "nominal"}
                    }
                }]
            }
        };

    this.generateChart(chartJSON, room + "_weekly_occupation");
}

VegaChart.prototype.createOccupationChart = function (analyzer) {
    //Objet with 2 properties: 1.name of the room 2.total occupied hours
    let roomInfo = function (room, occupiedHours) {
        this.room = room
        this.occupiedHours = occupiedHours
    }
    let roomList = []
    //Initialize
    analyzer.listRooms.forEach(room => {
        roomList.push(new roomInfo(room, 0))
    })
    //Calculate the occupied hours of each room
    analyzer.listTimeSlots.forEach(i => {
        let timeSlot = i
        let start = parseInt(timeSlot.hourStart.hours) + parseInt(timeSlot.hourStart.minutes) / 60
        let end = parseInt(timeSlot.hourEnd.hours) + parseInt(timeSlot.hourEnd.minutes) / 60
        roomList.forEach(j => {
            if (j.room === timeSlot.room) {
                j.occupiedHours += end - start
            }
        })
    });

    //Plotting bar graphs
    let chartJSON = {
        "width": 200,
        "height": 1000,
        "data": {"values": roomList},
        "mark": "bar",
        "encoding": {
            "x": {
                "field": "occupiedHours", "type": "quantitative",
                "axis": {"title": "Occupied hours in a week"}
            },
            "y": {
                "field": "room", "type": "nominal",
                "axis": {"title": "Room"},
                "sort": "-x"
            }
        }
    }

    this.generateChart(chartJSON, "rooms_occupation_in_hours");
}

VegaChart.prototype.generateChart = function (chartJSON, chartName) {
    if (!FS.existsSync('./charts')) {
        FS.mkdirSync('./charts');
    }

    const vegaSpec = VL.compile(chartJSON).spec;// convert Vega-Lite to Vega
    let runtime = Vega.parse(vegaSpec);

    /* SVG version */
    let view = new Vega.View(runtime).renderer('svg').run();
    const mySvg = view.toSVG();
    mySvg.then(function (res) {
        FS.writeFileSync("./charts/" + chartName + ".svg", res)
        view.finalize();
    });

    /* Canvas version */
    view = new Vega.View(runtime).renderer('canvas').background("#FFF").run();
    const myCanvas = view.toCanvas();
    myCanvas.then(function (res) {
        FS.writeFileSync("./charts/" + chartName + ".png", res.toBuffer());
        view.finalize();
    });
}

module.exports = VegaChart;
