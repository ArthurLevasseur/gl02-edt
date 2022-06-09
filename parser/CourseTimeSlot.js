let CourseTimeSlot = function (ty, cp, dy, hrS, hrE, gp, rm) {
    this.type = ty;
    this.capacity = cp;
    this.day = dy;
    this.hourStart = hrS;
    this.hourEnd = hrE;
    this.group = gp;
    this.room = rm;
}

CourseTimeSlot.prototype.isOverlappingWith = function (otherTS) {
    if (this.room === "EXT1")//ignore overlapping for online course
        return false;

    if (this.room === otherTS.room && this.day === otherTS.day) {
        let thisS = this.hourStart.toFloat();
        let thisE = this.hourEnd.toFloat();
        let otherS = otherTS.hourStart.toFloat();
        let otherE = otherTS.hourEnd.toFloat();
        //this end or start is during the other time slot and they are in the same room
        return (thisE > otherS && thisE <= otherE) || (thisS >= otherS && thisS < otherE);
    }

    return false;
}

// Replace the initials of days by the real days (mostly used for the display)
CourseTimeSlot.dayToString = function (day) {
    switch (day) {
        case 'L' :
            day = 'lundi';
            break;
        case 'MA' :
            day = 'mardi';
            break;
        case 'ME' :
            day = 'mercredi';
            break;
        case 'J' :
            day = 'jeudi';
            break;
        case 'V' :
            day = 'vendredi';
            break;
        case 'S' :
            day = 'samedi';
            break;
        case 'D' :
            day = 'dimanche';
            break;
        default :
            throw new Error("The day format in not valid");
    }

    return day;
}

// Replace the initials of days by the real days (mostly used for the display)
// Same function as above but in a non-static way
CourseTimeSlot.prototype.dayToString = function () {
    return CourseTimeSlot.dayToString(this.day);
}

CourseTimeSlot.prototype.toString = function () {
    return "Créneau: type=" + this.type + ", nombre d'inscrits=" + this.capacity + ", groupe=" + this.group + " le " + this.dayToString(this.day) + " de " + this.hourStart + " à " + this.hourEnd + " en " + this.room;
}

module.exports = CourseTimeSlot;
