let Course = function (nm) {
    this.name = nm;
    this.timeSlots = [];
}

Course.prototype.addTimeSlot = function (timeSlot) {
    this.timeSlots.push(timeSlot);
}

module.exports = Course;