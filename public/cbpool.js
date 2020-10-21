
// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
var firebaseConfig = {
    apiKey: "AIzaSyAees7KpfcCjq-3Q5eyLZvTrWF9xQHnSGc",
    authDomain: "quierochromebooks.firebaseapp.com",
    databaseURL: "https://quierochromebooks.firebaseio.com",
    projectId: "quierochromebooks",
    storageBucket: "quierochromebooks.appspot.com",
    messagingSenderId: "54381478085",
    appId: "1:54381478085:web:4e87e94683bdd79dee70ac",
    measurementId: "G-J93XLE0X0B"
};
// Initialize Firebase
firebase.initializeApp(firebaseConfig);
firebase.analytics();

const dbRef = firebase.database().ref();
var localDb = {};

var scaling = "fit"; // fit scales to fit the browser window while keeping the aspect ratio
var width = 1920; // can go higher...
var height = 1080;
var color = light; // ZIM colors now available globally
var outerColor = dark;

let weekDays = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
let weekDaysAbbr = ["D", "L", "M", "X", "J", "V", "S"];
let monthsAbbr = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

let startDay = getFirstDayOfCurrentWeek();
let currentDays = getDaysFrom(startDay, 5);

const maxPoolSize = 31;
const poolSizeColorScale = {
    0: dark,
    10: red,
    29: brown,
    other: green
};

let dayHours = ["8:30 - 9:30", "9:30 - 10:20", "10:20 - 11:30",
    "11:30 - 12:00", "12:00 - 13:00", "13:00 - 14:00", "14:00 - 15:00",
    "15:00 - 16:00", "16:00 - 17:00"];
let dayHourHeights = [90, 75, 105, 45, 90, 90, 90, 90, 90];

let names = ["MPP", "JSC", "MVR", "JRR", "JFA", "ASM", "RSG", "DGX", "PSB", "LMM"];

class PoolRule {
    constructor(obj) {
        this.from = (obj.from ?? null);
        this.to = (obj.to ?? null);
        this.hours = (obj.hours ?? []);
        this.number = (obj.number ?? null);
    }
    evalRule(day, hour) {
        let date = fromShortDateString(day);
        if ((!this.from || date.valueOf() >= this.from.valueOf())
            && (!this.to || date.valueOf() <= this.to.valueOf())
            && (!this.hours || this.hours.length === 0 || this.hours.includes(hour))) {
            return this.number;
        }
        else {
            return null;
        }
    }
}

let poolRules = [
    new PoolRule({ number: 31 }),
    new PoolRule({ from: new Date(2020, 9, 12), to: new Date(2020, 9, 12), number: 0 }),
    new PoolRule({ from: new Date(2020, 10, 2), to: new Date(2020, 10, 2), number: 0 })
];

function poolSize(rules, day, hour, maxPoolSize) {
    let size = maxPoolSize;
    for (let i = 0; i < rules.length; ++i) {
        size = rules[i].evalRule(day, hour) ?? size;
    }
    return size;
}

function monthNumberFromAbbreviation(monthStr) {
    let monthAbbrevs = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    return monthAbbrevs.indexOf(monthStr);
}

function fromShortDateString(shortDateString) {
    let nowDate = new Date(Date.now());
    let year = nowDate.getFullYear();
    let regex = /(\w)\s(\d*)-(\w\w\w)/;
    let match = shortDateString.match(regex);
    let weekDayStr = match[1];
    let monthDayStr = match[2];
    let monthAbbrevStr = match[3];
    return new Date(
        year,
        monthNumberFromAbbreviation(monthAbbrevStr),
        parseInt(monthDayStr)
    );
}

class Reserve {
    constructor(day, hour, name, number) {
        this.day = day;
        this.hour = hour;
        this.name = name;
        this.number = number;
    }
};

function toShortDateString(date) {
    return weekDaysAbbr[date.getDay()] + " " + date.getDate() + "-" + monthsAbbr[date.getMonth()];
}

function getDaysFrom(fromDate, num) {
    let days = [];
    for (let i = 0; i < num; ++i) {
        let day = new Date(fromDate.valueOf());
        day.setDate(day.getDate() + i);
        days.push(toShortDateString(day));
    }
    return days;
}

function getFirstDayOfWeekOf(date) {
    let today = date;
    let todaysWeekday = today.getDay();
    let daysBack = todaysWeekday;
    let firstDay = today;
    firstDay.setDate(firstDay.getDate() - daysBack + 1);
    return firstDay;
}

function getFirstDayOfCurrentWeek() {
    return getFirstDayOfWeekOf(new Date(Date.now()));
}

function poolSizeColor(poolSize, scale) {
    for (size in scale) {
        if (size !== "other" && poolSize <= parseInt(size)) {
            return scale[size];
        }
    }
    return scale.other;
}


function randomDay() {
    return currentDays[parseInt(Math.random() * currentDays.length)];
}

function randomHour() {
    return dayHours[parseInt(Math.random() * dayHours.length)];
}

function randomName() {
    return names[parseInt(Math.random() * names.length)];
}

function totalReserved(db, day, hour) {
    let total = 0;
    if (db && db[day] && db[day][hour]) {
        for (id in db[day][hour]) {
            total += db[day][hour][id].number;
        }
    }
    return total;
}

// function spare(db, day, hour) {
// return maxPoolSize - totalReserved(db, day, hour);
// }

function spare(db, day, hour) {
    return poolSize(poolRules, day, hour, maxPoolSize) - totalReserved(db, day, hour);
}

function reservedInSlot(slotSnapshot) {
    let total = 0;
    if (slotSnapshot) {
        for (let id in slotSnapshot) {
            total += slotSnapshot[id].number;
        }
    }
    return total;
}

// function spareInSlot(slotSnapshot) {
// return maxPoolSize - reservedInSlot(slotSnapshot);
// }

function spareInSlot(slotSnapshot, day, hour) {
    return poolSize(poolRules, day, hour, maxPoolSize) - reservedInSlot(slotSnapshot);
}

function reserve(db, day, hour, name, number) {
    if (!db[day]) {
        db[day] = {};
    }
    if (!db[day][hour]) {
        db[day][hour] = [];
    }
    let reserved = Math.min(number, spare(db, day, hour));
    db[day][hour].push(new Reserve(day, hour, name, reserved));
    return reserved;
}

function addReserve(db, reserve) {
    if (!db[reserve.day]) {
        db[reserve.day] = {};
    }
    if (!db[reserve.day][reserve.hour]) {
        db[reserve.day][reserve.hour] = [];
    }
    reserve.number = Math.min(reserve.number, spare(db, day, hour));
    // db[reserve.day][reserve.hour].push(reserve);
    return reserve.number;
}

function addReserveToSlot(slotSnapshot, id, reserve) {
    reserve.number = Math.min(reserve.number, spareInSlot(slotSnapshot, reserve.day, reserve.hour));
    dayHourSnapShot[id] = reserve;
    return slotSnapshot;
}

function disableReserveButton(button) {
    button.text = "No quedan Chromebook";
    button.backgroundColor = red;
    button.color = light;
    button.rollBackgroundColor = red;
}

function enableReserveButton(button) {
    button.text = "Añadir reserva";
    button.backgroundColor = green;
    button.color = dark;
    button.rollBackgroundColor = brown;
}

function createNameList(id, reserve, day, hour, entry) {
    let nameList = new List({
        list: names,
        width: 500,
        height: 500,
        viewNum: 5,
        currentSelected: true,
        selectedBackgroundColor: green,
        titleBar: new Label({ text: "Profesor", size: 30 }),
        titleBarBackgroundColor: light,
        titleBarHeight: 30,
        close: true,
        draggable: false
    });
    nameList.addTo(entry);
    nameList.loc(1030, -30);
    nameList.currentValue = reserve.name;
    nameList.change(() => {
        reserve.name = nameList.currentValue;
        entry.getChildAt(0).text = nameList.currentValue;
        nameList.dispose();
        nameList = null;
        let updates = {};
        updates[`/${day}/${hour}/${id}`] = reserve;
        firebase.database().ref().update(updates);
    });
}

function showReserveTip(target) {
    let addReserveTip = new Tip({
        text: "Selecciona tu nombre en la lista, y\nmodifica el número de Chromebook que quieres reservar.",
        outside: true,
        target: target,
        valign: "top",
        align: "right"
    });
    addReserveTip.show(0, 4);
}

function clickOnSlot(stage, slotSnapshot, day, hour) {
    let win = new Window({
        width: 1600,
        height: 800,
        interactive: true,
        titleBar: new Label({
            text: `Reservas para: ${day} ${hour}`,
            size: 50
        }),
        titleBarHeight: 60,
        titleBarColor: dark,
        titleBarBackgroundColor: silver,
        close: true
    });

    let reserveButton = new Button({
        label: new Label({ text: `Añadir reserva`, color: dark }),
        width: 400,
        height: 100,
        backgroundColor: green,
        rollBackgroundColor: brown,
    });
    reserveButton.on("click", () => {
        if (spareInSlot(slotSnapshot, day, hour) > 0) {
            let newReserve = new Reserve(day, hour, "", spareInSlot(slotSnapshot, day, hour));
            let id = firebase.database().ref(`/${day}/${hour}`).push(newReserve);
            slotSnapshot[id] = newReserve;
            showReserveTip(reserveButton);
        }
    });
    reserveButton.addTo(win).loc(50, 600);

    let table = new Tile({
        obj: [],
        unique: true,
        width: 1600,
        cols: 1,
        rows: 0,
        spacingV: 20
    });
    table.loc(50, 50);
    win.add(table);

    win.center();
    win.on("close", () => {
        firebase.database().ref(`/${day}/${hour}`).off();
    });
    stage.update();

    firebase.database().ref(`/${day}/${hour}`).on("value", (snapshot) => {
        slotSnapshot = snapshot.val();
        remakeReserveTable(win, table, slotSnapshot, day, hour);
        updateReserveButton(reserveButton, slotSnapshot, day, hour);
        stage.update();
    });
}

function updateReserveButton(button, slotSnapshot, day, hour) {
    if (spareInSlot(slotSnapshot, day, hour) > 0) {
        enableReserveButton(button);
    }
    else {
        disableReserveButton(button);
    }
}

function remakeReserveTable(win, table, slotSnapshot, day, hour) {
    let entries = [];
    if (slotSnapshot) {
        for (let id in slotSnapshot) {
            let entry = createReserveRow(id, slotSnapshot, day, hour);
            win.add(entry);
            entries.push(entry);
            if (slotSnapshot[id].name === "") {
                createNameList(id, slotSnapshot[id], day, hour, entry);
            }
        }
    }
    table.remake(entries);
    return table;
}

function createReserveRow(id, slotSnapshot, day, hour) {
    let reserve = slotSnapshot[id];
    let container = new Container();
    let nameBox = new Button({
        label: new Label({ text: reserve.name, size: 50 }),
        width: 500,
        height: 100,
        color: dark,
        backgroundColor: light,
        rollBackgroundColor: brown,
        corner: 0
    }).centerReg();
    nameBox.on("click", () => {
        createNameList(id, reserve, day, hour, container);
    });
    let deleteButton = new Button({
        icon: pizzazz.makeIcon("close", red),
        width: 100,
        height: 100,
        color: red,
        backgroundColor: brown,
        rollBackgroundColor: red,
        rollIcon: pizzazz.makeIcon("close", light)
    }).centerReg();
    deleteButton.on("click", () => {
        firebase.database().ref(`/${day}/${hour}/${id}`).remove();
    })
    let stepper = new Stepper({
        min: 0,
        max: reserve.number + spareInSlot(slotSnapshot, day, hour)
    }).centerReg();
    let tile = new Tile({
        obj: [deleteButton, nameBox, stepper],
        spacingH: 10,
        width: 1000,
        rows: 1,
        cols: 3,
        unique: true
    }).addTo(container);
    stepper.currentValue = reserve.number;
    stepper.on("change", () => {
        reserve.number = stepper.currentValue;
        let updates = {};
        updates[`/${day}/${hour}/${id}`] = reserve;
        firebase.database().ref().update(updates);
    });
    return container;
}

function makeDayHourLabels(rowHeights, hours) {
    let dayHourLabels = new Array();

    for (let i = 0; i < hours.length; ++i) {
        let dayHourLabel = new Label({
            text: hours[i],
            color: light,
            backing: new Rectangle({
                width: 230,
                height: rowHeights[i],
                color: dark,
                corner: 5
            }).centerReg(),
            align: "center",
            valign: "middle"
        });
        dayHourLabels[i] = dayHourLabel;
    }
    return dayHourLabels;
}

function makeHeaderRow(days) {
    let headerRow = new Array();
    headerRow[0] = new Rectangle(230, 90, light).centerReg();
    for (let i = 0; i < days.length; ++i) {
        let weekDayLabel = new Label({
            text: days[i],
            color: light,
            backing: new Rectangle({
                width: 200,
                height: 90,
                color: dark,
                corner: 5
            }).centerReg(),
            align: "center",
            valign: "middle"
        });
        headerRow[i + 1] = weekDayLabel;
    }
    return headerRow;
}

function makeSlotElements(hours, hourLabels, rowHeights, days, poolSizeColorScale, stage, db) {
    let slotElements = new Array();
    for (let i = 0; i < hours.length; ++i) {
        slotElements[i * (days.length + 1)] = hourLabels[i];
        for (let j = 0; j < days.length; ++j) {
            let slotButton = new Button({
                label: new Label({ text: spare(db, days[j], hours[i]) }),
                width: 200,
                height: rowHeights[i],
                corner: 5,
                backgroundColor: poolSizeColor(spare(db, days[j], hours[i]), poolSizeColorScale),
                rollBackgroundColor: orange
            });
            if (!db[days[j]]) {
                db[days[j]] = {};
            }
            if (!db[days[j]][hours[i]]) {
                db[days[j]][hours[i]] = {};
            }
            slotButton.on("click", () => clickOnSlot(stage, db[days[j]][hours[i]], days[j], hours[i]));
            slotElements[i * (days.length + 1) + j + 1] = slotButton;
        }
    }
    return slotElements;
}

function remakeWeekCalendar(hours, days, rowHeights, hourLabels, poolSizeColorScale, stage, db, weekCalendar) {
    let header = makeHeaderRow(days);
    let slots = makeSlotElements(hours, hourLabels, rowHeights, days, poolSizeColorScale, stage, db);
    let elements = header.concat(slots);
    weekCalendar.remake(elements);
    stage.update();
}

var frame = new Frame(scaling, width, height, color, outerColor); // see docs for more options and info
frame.on("ready", function () {
    zog("ready from ZIM Frame");

    var stage = frame.stage;
    var stageW = frame.width;
    var stageH = frame.height;


    let dayHourLabels = makeDayHourLabels(dayHourHeights, dayHours);
    let headerRow = makeHeaderRow(currentDays);
    let slotElements = makeSlotElements(dayHours, dayHourLabels, dayHourHeights, currentDays, poolSizeColorScale, stage, localDb);
    let weekCalendarElements = headerRow.concat(slotElements);

    let weekCalendar = new Tile({
        obj: weekCalendarElements,
        unique: true,
        width: 1300,
        height: 900,
        cols: 6,
        rows: 10,
        spacingH: 30,
        spacingV: 5,
        squeezeH: true,
        valign: "center"
    });

    weekCalendar.center();

    let calendar = new Container();
    weekCalendar.addTo(calendar);
    calendar.center().mov(0, 20);

    let previousWeekButton = new Button({
        width: 110,
        height: 80,
        backgroundColor: dark,
        rollBackgroundColor: orange,
        corner: 0,
        label: "",
        icon: pizzazz.makeIcon("play", light)
    });
    previousWeekButton.icon.rotation = 180;
    previousWeekButton.on("click", () => {
        startDay.setDate(startDay.getDate() - 7);
        currentDays = getDaysFrom(startDay, 5);
        remakeWeekCalendar(dayHours, currentDays, dayHourHeights, dayHourLabels, poolSizeColorScale, stage, localDb, weekCalendar);
    });

    let nextWeekButton = new Button({
        width: 110,
        height: 80,
        backgroundColor: dark,
        rollBackgroundColor: orange,
        corner: 0,
        label: "",
        icon: pizzazz.makeIcon("play", light)
    });
    nextWeekButton.on("click", () => {
        startDay.setDate(startDay.getDate() + 7);
        currentDays = getDaysFrom(startDay, 5);
        remakeWeekCalendar(dayHours, currentDays, dayHourHeights, dayHourLabels, poolSizeColorScale, stage, localDb, weekCalendar);
    });

    let todayButton = new Button({
        width: 150,
        height: 80,
        backgroundColor: dark,
        rollBackgroundColor: orange,
        corner: 0,
        label: "",
        icon: pizzazz.makeIcon("home", light)
    });
    todayButton.on("click", () => {
        startDay = getFirstDayOfCurrentWeek();
        currentDays = getDaysFrom(startDay, 5);
        remakeWeekCalendar(dayHours, currentDays, dayHourHeights, dayHourLabels, poolSizeColorScale, stage, localDb, weekCalendar);
    });

    let weekButtons = new Tile({
        obj: [previousWeekButton, todayButton, nextWeekButton],
        unique: true,
        width: 430,
        height: 80,
        rows: 1,
        cols: 3,
        spacingH: 10,
        squeezeH: false
    });
    weekButtons.addTo().center().mov(0, -stageH / 2 + 50);

    dbRef.on("value", (snapshot) => {
        console.log("updating local db...");
        localDb = snapshot.val();
        console.log(localDb);
        remakeWeekCalendar(dayHours, currentDays, dayHourHeights, dayHourLabels, poolSizeColorScale, stage, localDb, weekCalendar);
    });

    stage.update(); // update the stage to see any changes

}); // end of ready
