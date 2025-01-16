export function diffMinutes(dt2, dt1) {
    var diff = (dt2.getTime() - dt1.getTime()) / 1000;
    diff /= 60;
    return Math.abs(Math.round(diff));
}

export  function monthDiff(dt1, dt2) {
    var months;
    months = (dt2.getFullYear() - dt1.getFullYear()) * 12;
    months -= dt1.getMonth();
    months += dt2.getMonth();
    return months <= 0 ? 0 : months;
}

export function computeGreatestUnit(dt1, dt2) {
    var months =  monthDiff(dt1, dt2);
    var years = Math.abs(Math.round(months / 12));
    if (years > 1) return { val: years, unit: "years" };

    if (months > 1) return { val: months, unit: "months" };


    var diff = dt2.getTime() - dt1.getTime();
    if (diff < 1000) return { val: diff, unit: "millisecond" };
    var seconds = Math.abs(Math.round(diff / 1000));
    if (seconds < 2) return { val: 1, unit: "second" };
    if (seconds >= 2 && seconds < 60) return { val: seconds, unit: "seconds" };
    var minutes = Math.abs(Math.round(seconds / 60));
    if (minutes < 2) return { val: 1, unit: "minute" };
    if (minutes >= 2 && minutes < 60) return { val: minutes, unit: "minutes" };
    var hours = Math.abs(Math.round(minutes / 60));
    if (hours < 2) return { val: 1, unit: "hour" };
    if (hours >= 2 && hours < 24) return { val: hours, unit: "hours" };

    var days = Math.abs(Math.round(hours / 24));
    if (days < 2) return { val: 1, unit: "day" };
    if (days < 7) return { val: days, unit: "days" };

    var weeks = Math.abs(Math.round(days / 7));
    if (weeks < 2) return { val: 1, unit: "week" };
    else return { val: weeks, unit: "weeks" };

    return {};
}

