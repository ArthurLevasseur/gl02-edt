let Hour = function (h, m) {
    h = parseInt(h);
    if (h >= 0 && h < 24)
        this.hours = h;
    else
        throw new Error("A valid hour must be a number between 0 and 23.")

    m = parseInt(m);
    if (m >= 0 && m < 60)
        this.minutes = m;
    else
        throw new Error("Valid minutes must be a number between 0 and 59.")
}

// Convert objet Hour to a float (example : 8:00 --> 8,00 / 15:30 --> 15,5 / 18:15 --> 18.25 / ...)
Hour.prototype.toFloat = function () {

    let minutesFloat;
    let hourAndMinutesFloat;

    // Convert minutes into float between 0 and 1 (ex: 0min = 0 / 30min = 0.5 / 60min = 1)
    minutesFloat = this.minutes / 60;

    // Computation of the total hour in float ()
    hourAndMinutesFloat = this.hours + minutesFloat;

    return hourAndMinutesFloat;
}

Hour.prototype.isLaterThan = function (firstHour) {
    return this.toFloat() >= firstHour.toFloat();
}

Hour.prototype.toIcalFormat = function () {
    // Format hours with always 2 digits
    let str = (this.hours >= 10) ? "" + this.hours : "0" + this.hours;

    // Format minutes with always 2 digits
    str += (this.minutes >= 10) ? "" + this.minutes : "0" + this.minutes;

    // add the seconds
    str += '00';

    return str;
}

Hour.prototype.toString = function () {
    let str = this.hours + ":";

    // Format minutes with always 2 digits
    str += (this.minutes >= 10) ? "" + this.minutes : "0" + this.minutes;

    return str;
}

Hour.stringToObject = function (hr) {

    hr = hr.split(':');

    hr[0] = parseInt(hr[0]);
    hr[1] = parseInt(hr[1]);

    if (hr[0] >= 0 && hr[0] < 24 && //valid hour
        hr[1] >= 0 && hr[1] < 60    //valid minutes
    ) {
        return new Hour(hr[0], hr[1]);
    }

    return null;

}

module.exports = Hour;
